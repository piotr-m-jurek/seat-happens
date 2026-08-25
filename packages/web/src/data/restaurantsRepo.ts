import type { NewRestaurant, Restaurant, RestaurantsRepo } from "@seat-happens/shared";
import { supabase } from "../lib/supabaseClient";

function toRestaurant(row: any): Restaurant {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    openTime: row.open_time,
    closeTime: row.close_time,
  };
}

function toRow(restaurant: Partial<NewRestaurant>) {
  const row: Record<string, unknown> = {};
  if (restaurant.slug !== undefined) row.slug = restaurant.slug;
  if (restaurant.name !== undefined) row.name = restaurant.name;
  if (restaurant.openTime !== undefined) row.open_time = restaurant.openTime;
  if (restaurant.closeTime !== undefined) row.close_time = restaurant.closeTime;
  return row;
}

export const restaurantsRepo: RestaurantsRepo = {
  async getBySlug(slug) {
    const { data, error } = await supabase
      .from("restaurants")
      .select("*")
      .eq("slug", slug)
      .maybeSingle();
    if (error) throw error;
    return data ? toRestaurant(data) : null;
  },

  async getById(id) {
    const { data, error } = await supabase
      .from("restaurants")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (error) throw error;
    return data ? toRestaurant(data) : null;
  },

  async list() {
    const { data, error } = await supabase.from("restaurants").select("*").order("name");
    if (error) throw error;
    return data.map(toRestaurant);
  },

  async create(restaurant: NewRestaurant) {
    const { data, error } = await supabase
      .from("restaurants")
      .insert({ slug: restaurant.slug, name: restaurant.name })
      .select()
      .single();
    if (error) throw error;
    return toRestaurant(data);
  },

  async update(id, patch) {
    const { data, error } = await supabase
      .from("restaurants")
      .update(toRow(patch))
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    return toRestaurant(data);
  },

  async remove(id) {
    const { error } = await supabase.from("restaurants").delete().eq("id", id);
    if (error) throw error;
  },
};
