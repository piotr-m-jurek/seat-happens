import type { NewObstacle, Obstacle, ObstaclesRepo } from "@seat-happens/shared";
import { supabase } from "../lib/supabaseClient";

function toObstacle(row: any): Obstacle {
  return { id: row.id, label: row.label, x: row.x, y: row.y, width: row.width, height: row.height };
}

export const obstaclesRepo: ObstaclesRepo = {
  async list(restaurantId) {
    const { data, error } = await supabase
      .from("obstacles")
      .select("*")
      .eq("restaurant_id", restaurantId)
      .order("id");
    if (error) throw error;
    return data.map(toObstacle);
  },

  async create(restaurantId, obstacle: NewObstacle) {
    const { data, error } = await supabase
      .from("obstacles")
      .insert({ ...obstacle, restaurant_id: restaurantId })
      .select()
      .single();
    if (error) throw error;
    return toObstacle(data);
  },

  async update(id, patch) {
    const { data, error } = await supabase
      .from("obstacles")
      .update(patch)
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    return toObstacle(data);
  },

  async remove(id) {
    const { error } = await supabase.from("obstacles").delete().eq("id", id);
    if (error) throw error;
  },

  subscribe(restaurantId, cb) {
    const channel = supabase
      .channel(`obstacles-changes-${restaurantId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "obstacles",
          filter: `restaurant_id=eq.${restaurantId}`,
        },
        () => {
          this.list(restaurantId).then(cb).catch(console.error);
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  },
};
