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
    // shouldCreateUser: false means only pre-approved accounts (created via
    // the Supabase dashboard, see README) can ever request a code — random
    // emails get a clear error instead of silently creating an account and
    // triggering the "confirm signup" email flow.
    const { error } = await supabase.auth.signInWithOtp({ email, options: { shouldCreateUser: false } });
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

  async getStaff() {
    const { data: sessionData } = await supabase.auth.getSession();
    const userId = sessionData.session?.user.id;
    if (!userId) return null;

    const { data, error } = await supabase
      .from("staff")
      .select("id, email, role, active")
      .eq("id", userId)
      .maybeSingle();
    if (error) throw error;
    if (!data) return null;

    const staff: Staff = {
      id: data.id,
      email: data.email,
      role: data.role as StaffRole,
      active: data.active,
    };
    return staff;
  },
};
