import type {
  FloorPlanSize,
  NewObstacle,
  NewReservation,
  NewTable,
  Obstacle,
  Reservation,
  Staff,
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
  getStaff(): Promise<Staff | null>;
}

export interface TablesRepo {
  list(): Promise<Table[]>;
  create(table: NewTable): Promise<Table>;
  update(id: number, patch: Partial<NewTable>): Promise<Table>;
  remove(id: number): Promise<void>;
  subscribe(cb: (tables: Table[]) => void): () => void;
}

export interface ObstaclesRepo {
  list(): Promise<Obstacle[]>;
  create(obstacle: NewObstacle): Promise<Obstacle>;
  update(id: number, patch: Partial<NewObstacle>): Promise<Obstacle>;
  remove(id: number): Promise<void>;
  subscribe(cb: (obstacles: Obstacle[]) => void): () => void;
}

export interface FloorPlanRepo {
  get(): Promise<FloorPlanSize>;
  update(patch: Partial<FloorPlanSize>): Promise<FloorPlanSize>;
  subscribe(cb: (size: FloorPlanSize) => void): () => void;
}

export interface ReservationsRepo {
  listByDate(date: string): Promise<Reservation[]>;
  create(reservation: NewReservation): Promise<Reservation>;
  update(id: number, patch: Partial<NewReservation>): Promise<Reservation>;
  remove(id: number): Promise<void>;
  subscribeByDate(date: string, cb: (reservations: Reservation[]) => void): () => void;
}
