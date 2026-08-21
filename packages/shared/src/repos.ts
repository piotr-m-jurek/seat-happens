import type {
  FloorPlanSize,
  NewObstacle,
  NewReservation,
  NewRestaurant,
  NewTable,
  Obstacle,
  Reservation,
  Restaurant,
  Staff,
  StaffInvite,
  StaffRole,
  Table,
} from "./types";

export interface Session {
  userId: string;
  email: string;
}

export interface AuthRepo {
  getSession(): Promise<Session | null>;
  onSessionChange(cb: (session: Session | null) => void): () => void;
  requestOtp(email: string): Promise<void>;
  verifyOtp(email: string, code: string): Promise<Session>;
  signOut(): Promise<void>;
  // One person can be staff at multiple restaurants — every active
  // membership for the signed-in user.
  getStaffMemberships(): Promise<Staff[]>;
  isSuperAdmin(): Promise<boolean>;
}

export interface RestaurantsRepo {
  getBySlug(slug: string): Promise<Restaurant | null>;
  getById(id: number): Promise<Restaurant | null>;
  list(): Promise<Restaurant[]>;
  create(restaurant: NewRestaurant): Promise<Restaurant>;
}

export interface StaffRepo {
  listForRestaurant(restaurantId: number): Promise<Staff[]>;
  listInvitesForRestaurant(restaurantId: number): Promise<StaffInvite[]>;
  invite(restaurantId: number, email: string, role: StaffRole): Promise<StaffInvite>;
  removeInvite(id: number): Promise<void>;
  updateRole(id: number, role: StaffRole): Promise<Staff>;
  remove(id: number): Promise<void>;
}

export interface TablesRepo {
  list(restaurantId: number): Promise<Table[]>;
  create(restaurantId: number, table: NewTable): Promise<Table>;
  update(id: number, patch: Partial<NewTable>): Promise<Table>;
  remove(id: number): Promise<void>;
  subscribe(restaurantId: number, cb: (tables: Table[]) => void): () => void;
}

export interface ObstaclesRepo {
  list(restaurantId: number): Promise<Obstacle[]>;
  create(restaurantId: number, obstacle: NewObstacle): Promise<Obstacle>;
  update(id: number, patch: Partial<NewObstacle>): Promise<Obstacle>;
  remove(id: number): Promise<void>;
  subscribe(restaurantId: number, cb: (obstacles: Obstacle[]) => void): () => void;
}

export interface FloorPlanRepo {
  get(restaurantId: number): Promise<FloorPlanSize>;
  update(restaurantId: number, patch: Partial<FloorPlanSize>): Promise<FloorPlanSize>;
  subscribe(restaurantId: number, cb: (size: FloorPlanSize) => void): () => void;
}

export interface ReservationsRepo {
  listByDate(restaurantId: number, date: string): Promise<Reservation[]>;
  create(restaurantId: number, reservation: NewReservation): Promise<Reservation>;
  update(id: number, patch: Partial<NewReservation>): Promise<Reservation>;
  remove(id: number): Promise<void>;
  subscribeByDate(restaurantId: number, date: string, cb: (reservations: Reservation[]) => void): () => void;
}
