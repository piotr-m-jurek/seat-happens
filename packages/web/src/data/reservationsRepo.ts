import type { NewReservation, Reservation, ReservationsRepo } from "@sit-happens/shared";
import { supabase } from "../lib/supabaseClient";

function toReservation(row: any): Reservation {
  return {
    id: row.id,
    tableIds: row.table_ids,
    guestName: row.guest_name,
    partySize: row.party_size,
    date: row.date,
    startTime: row.start_time,
    durationMin: row.duration_min,
    notes: row.notes,
  };
}

function toRow(reservation: Partial<NewReservation>) {
  const row: Record<string, unknown> = {};
  if (reservation.tableIds !== undefined) row.table_ids = reservation.tableIds;
  if (reservation.guestName !== undefined) row.guest_name = reservation.guestName;
  if (reservation.partySize !== undefined) row.party_size = reservation.partySize;
  if (reservation.date !== undefined) row.date = reservation.date;
  if (reservation.startTime !== undefined) row.start_time = reservation.startTime;
  if (reservation.durationMin !== undefined) row.duration_min = reservation.durationMin;
  if (reservation.notes !== undefined) row.notes = reservation.notes;
  return row;
}

export const reservationsRepo: ReservationsRepo = {
  async listByDate(date) {
    const { data, error } = await supabase
      .from("reservations")
      .select("*")
      .eq("date", date)
      .order("start_time");
    if (error) throw error;
    return data.map(toReservation);
  },

  async create(reservation) {
    const { data, error } = await supabase
      .from("reservations")
      .insert(toRow(reservation))
      .select()
      .single();
    if (error) throw error;
    return toReservation(data);
  },

  async update(id, patch) {
    const { data, error } = await supabase
      .from("reservations")
      .update(toRow(patch))
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    return toReservation(data);
  },

  async remove(id) {
    const { error } = await supabase.from("reservations").delete().eq("id", id);
    if (error) throw error;
  },

  subscribeByDate(date, cb) {
    const refresh = () => this.listByDate(date).then(cb).catch(console.error);
    const channel = supabase
      .channel(`reservations-changes-${date}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "reservations", filter: `date=eq.${date}` },
        refresh
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  },
};
