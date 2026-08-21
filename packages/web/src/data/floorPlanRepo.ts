import type { FloorPlanRepo, FloorPlanSize } from "@sit-happens/shared";
import { supabase } from "../lib/supabaseClient";

const DEFAULT_SIZE: FloorPlanSize = { width: 4, height: 3 };

function toSize(row: any): FloorPlanSize {
  return { width: row.width, height: row.height };
}

export const floorPlanRepo: FloorPlanRepo = {
  async get(restaurantId) {
    const { data, error } = await supabase
      .from("floor_plan")
      .select("*")
      .eq("restaurant_id", restaurantId)
      .maybeSingle();
    if (error) throw error;
    return data ? toSize(data) : DEFAULT_SIZE;
  },

  async update(restaurantId, patch) {
    const { data, error } = await supabase
      .from("floor_plan")
      .upsert(
        { restaurant_id: restaurantId, ...DEFAULT_SIZE, ...patch },
        { onConflict: "restaurant_id" },
      )
      .select()
      .single();
    if (error) throw error;
    return toSize(data);
  },

  subscribe(restaurantId, cb) {
    const channel = supabase
      .channel(`floor-plan-changes-${restaurantId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "floor_plan",
          filter: `restaurant_id=eq.${restaurantId}`,
        },
        () => {
          this.get(restaurantId).then(cb).catch(console.error);
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  },
};
