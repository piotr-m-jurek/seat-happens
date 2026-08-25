import type { Staff, StaffInvite, StaffRepo, StaffRole } from "@seat-happens/shared";
import { supabase } from "../lib/supabaseClient";

function toStaff(row: any): Staff {
  return {
    id: row.id,
    restaurantId: row.restaurant_id,
    email: row.email,
    role: row.role as StaffRole,
    active: row.active,
  };
}

function toInvite(row: any): StaffInvite {
  return {
    id: row.id,
    restaurantId: row.restaurant_id,
    email: row.email,
    role: row.role as StaffRole,
  };
}

export const staffRepo: StaffRepo = {
  async listForRestaurant(restaurantId) {
    const { data, error } = await supabase
      .from("staff")
      .select("*")
      .eq("restaurant_id", restaurantId)
      .order("email");
    if (error) throw error;
    return data.map(toStaff);
  },

  async listInvitesForRestaurant(restaurantId) {
    const { data, error } = await supabase
      .from("staff_invites")
      .select("*")
      .eq("restaurant_id", restaurantId)
      .order("email");
    if (error) throw error;
    return data.map(toInvite);
  },

  async invite(restaurantId, email, role) {
    const { data, error } = await supabase
      .from("staff_invites")
      .insert({ restaurant_id: restaurantId, email, role })
      .select()
      .single();
    if (error) throw error;
    return toInvite(data);
  },

  async removeInvite(id) {
    const { error } = await supabase.from("staff_invites").delete().eq("id", id);
    if (error) throw error;
  },

  async updateRole(id, role) {
    const { data, error } = await supabase
      .from("staff")
      .update({ role })
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    return toStaff(data);
  },

  async remove(id) {
    const { error } = await supabase.from("staff").delete().eq("id", id);
    if (error) throw error;
  },
};
