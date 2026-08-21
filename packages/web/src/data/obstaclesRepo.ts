import type { NewObstacle, Obstacle, ObstaclesRepo } from "@sit-happens/shared";
import { supabase } from "../lib/supabaseClient";

function toObstacle(row: any): Obstacle {
  return { id: row.id, label: row.label, x: row.x, y: row.y, width: row.width, height: row.height };
}

export const obstaclesRepo: ObstaclesRepo = {
  async list() {
    const { data, error } = await supabase.from("obstacles").select("*").order("id");
    if (error) throw error;
    return data.map(toObstacle);
  },

  async create(obstacle: NewObstacle) {
    const { data, error } = await supabase.from("obstacles").insert(obstacle).select().single();
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

  subscribe(cb) {
    const channel = supabase
      .channel("obstacles-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "obstacles" }, () => {
        this.list().then(cb).catch(console.error);
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  },
};
