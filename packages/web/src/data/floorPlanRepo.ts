import type { FloorPlanRepo, FloorPlanSize } from "@sit-happens/shared";
import { supabase } from "../lib/supabaseClient";

const DEFAULT_SIZE: FloorPlanSize = { width: 4, height: 3 };

function toSize(row: any): FloorPlanSize {
  return { width: row.width, height: row.height };
}

export const floorPlanRepo: FloorPlanRepo = {
  async get() {
    const { data, error } = await supabase.from("floor_plan").select("*").eq("id", 1).maybeSingle();
    if (error) throw error;
    return data ? toSize(data) : DEFAULT_SIZE;
  },

  async update(patch) {
    const { data, error } = await supabase
      .from("floor_plan")
      .update(patch)
      .eq("id", 1)
      .select()
      .single();
    if (error) throw error;
    return toSize(data);
  },

  subscribe(cb) {
    const channel = supabase
      .channel("floor-plan-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "floor_plan" }, () => {
        this.get().then(cb).catch(console.error);
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  },
};
