import type { AuthRepo, Session, Staff, StaffRole } from "@sit-happens/shared";
import { supabase } from "../lib/supabaseClient";

function toSession(user: { id: string; email?: string | null } | null | undefined): Session | null {
  if (!user) return null;
  return { userId: user.id, email: user.email ?? "" };
}

export const authRepo: AuthRepo = {
  async getSession() {
    const { data } = await supabase.auth.getSession();
    return toSession(data.session?.user);
  },

  onSessionChange(cb) {
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      cb(toSession(session?.user));
    });
    return () => data.subscription.unsubscribe();
  },

  async requestOtp(email) {
    // Anyone can request a code and get an auth.users row now — real access
    // is gated by whether a `staff` row exists for them (see getStaff),
    // which only a restaurant owner can create (directly, or by inviting
    // an email that redeems automatically on next login).
    const { error } = await supabase.auth.signInWithOtp({ email });
    if (error) throw error;
  },

  async verifyOtp(email, code) {
    const { data, error } = await supabase.auth.verifyOtp({
      email,
      token: code,
      type: "email",
    });
    if (error) throw error;
    const session = toSession(data.user);
    if (!session) throw new Error("OTP verified but no session was returned.");
    return session;
  },

  async signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  },

  async getStaffMemberships() {
    const { data: sessionData } = await supabase.auth.getSession();
    const userId = sessionData.session?.user.id;
    if (!userId) return [];

    // Redeem any pending invite for this email before checking staff —
    // no-ops if none exists. See supabase/migrations/0009_multi_tenant.sql.
    await supabase.rpc("redeem_staff_invite");

    // One person can have a staff row per restaurant now (0012), so this
    // is every membership, not a single row.
    const { data, error } = await supabase
      .from("staff")
      .select("id, restaurant_id, email, role, active")
      .eq("user_id", userId);
    if (error) throw error;

    return data.map(
      (row): Staff => ({
        id: row.id,
        restaurantId: row.restaurant_id,
        email: row.email,
        role: row.role as StaffRole,
        active: row.active,
      })
    );
  },

  async isSuperAdmin() {
    const { data: sessionData } = await supabase.auth.getSession();
    const userId = sessionData.session?.user.id;
    if (!userId) return false;

    const { data, error } = await supabase.from("super_admins").select("id").eq("id", userId).maybeSingle();
    if (error) throw error;
    return data !== null;
  },
};
