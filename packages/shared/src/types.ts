export type StaffRole = "owner" | "staff" | "viewer";

export interface Restaurant {
  id: number;
  slug: string;
  name: string;
  openTime: string; // 'HH:MM:SS'
  closeTime: string; // 'HH:MM:SS'
}

export interface Staff {
  id: number;
  restaurantId: number;
  email: string;
  role: StaffRole;
  active: boolean;
}

export interface StaffInvite {
  id: number;
  restaurantId: number;
  email: string;
  role: StaffRole;
}

export interface Table {
  id: number;
  name: string;
  seats: number;
  x: number;
  y: number;
  width: number;
  height: number;
}

export type ReservationStatus = "booked" | "seated" | "completed" | "no_show" | "cancelled";

export interface Reservation {
  id: number;
  tableIds: number[];
  guestName: string;
  phone: string | null;
  partySize: number;
  date: string; // 'YYYY-MM-DD'
  startTime: string; // 'HH:MM'
  durationMin: number;
  notes: string | null;
  status: ReservationStatus;
}

export interface Obstacle {
  id: number;
  label: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface FloorPlanSize {
  width: number;
  height: number;
}

export type NewTable = Omit<Table, "id">;
export type NewReservation = Omit<Reservation, "id">;
export type NewObstacle = Omit<Obstacle, "id">;
export type NewRestaurant = Omit<Restaurant, "id">;
