import type { NewTable, Table, TablesRepo } from "@seat-happens/shared";
import { supabase } from "../lib/supabaseClient";

function toTable(row: any): Table {
  return {
    id: row.id,
    name: row.name,
    seats: row.seats,
    x: row.x,
    y: row.y,
    width: row.width,
    height: row.height,
  };
}

export const tablesRepo: TablesRepo = {
  async list(restaurantId) {
    const { data, error } = await supabase
      .from("tables")
      .select("*")
      .eq("restaurant_id", restaurantId)
      .order("id");
    if (error) throw error;
    return data.map(toTable);
  },

  async create(restaurantId, table: NewTable) {
    const { data, error } = await supabase
      .from("tables")
      .insert({ ...table, restaurant_id: restaurantId })
      .select()
      .single();
    if (error) throw error;
    return toTable(data);
  },

  async update(id, patch) {
    const { data, error } = await supabase
      .from("tables")
      .update(patch)
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    return toTable(data);
  },

  async remove(id) {
    const { error } = await supabase.from("tables").delete().eq("id", id);
    if (error) throw error;
  },

  subscribe(restaurantId, cb) {
    const channel = supabase
      .channel(`tables-changes-${restaurantId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "tables",
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
