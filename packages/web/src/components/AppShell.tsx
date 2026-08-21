import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAtom } from "@effect/atom-react";
import type { Restaurant, Staff } from "@sit-happens/shared";
import { useState } from "react";
import { selectedDateAtom, selectedTableIdAtom, viewAtom } from "../atoms";
import { authRepo } from "../data/authRepo";
import { AgendaList } from "./AgendaList";
import { FloorPlan } from "./FloorPlan";
import { LayoutEditor } from "./LayoutEditor";
import { ReservationForm } from "./ReservationForm";
import { StaffTab } from "./StaffTab";
import { TableDetailPanel } from "./TableDetailPanel";

export interface ReservationDraft {
  id?: number;
  tableIds: number[];
}

export function AppShell({ staff, restaurant }: { staff: Staff; restaurant: Restaurant }) {
  const [selectedDate, setSelectedDate] = useAtom(selectedDateAtom);
  const [selectedTableId, setSelectedTableId] = useAtom(selectedTableIdAtom);
  const [view, setView] = useAtom(viewAtom);
  const [reservationDraft, setReservationDraft] = useState<ReservationDraft | null>(null);
  const canWrite = staff.role !== "viewer";
  const isOwner = staff.role === "owner";

  async function signOut() {
    await authRepo.signOut();
    setSelectedTableId(null);
    setView("floor");
  }

  return (
    <div className="flex h-full flex-col">
      <header className="flex items-center gap-4 border-b bg-card px-5 py-3">
        <h1 className="whitespace-nowrap text-lg font-semibold">{restaurant.name}</h1>
        <Input
          type="date"
          className="w-auto"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
        />
        <Tabs value={view} onValueChange={(v) => setView(v as "floor" | "agenda" | "layout" | "staff")}>
          <TabsList>
            <TabsTrigger value="floor">Floor Plan</TabsTrigger>
            <TabsTrigger value="agenda">Agenda</TabsTrigger>
            {canWrite && <TabsTrigger value="layout">Layout</TabsTrigger>}
            {isOwner && <TabsTrigger value="staff">Staff</TabsTrigger>}
          </TabsList>
        </Tabs>
        <div className="flex-1" />
        <span className="text-sm text-muted-foreground">{staff.email}</span>
        <Button variant="ghost" onClick={signOut}>
          Sign out
        </Button>
      </header>

      <main className="flex-1 overflow-auto p-5">
        {view === "floor" && <FloorPlan restaurantId={restaurant.id} />}
        {view === "agenda" && (
          <AgendaList restaurantId={restaurant.id} canWrite={canWrite} onOpenReservation={setReservationDraft} />
        )}
        {view === "layout" && canWrite && <LayoutEditor restaurantId={restaurant.id} />}
        {view === "staff" && isOwner && <StaffTab restaurantId={restaurant.id} />}
      </main>

      {selectedTableId !== null && (
        <TableDetailPanel
          restaurantId={restaurant.id}
          tableId={selectedTableId}
          canWrite={canWrite}
          onClose={() => setSelectedTableId(null)}
          onOpenReservation={setReservationDraft}
        />
      )}

      {reservationDraft && (
        <ReservationForm restaurantId={restaurant.id} draft={reservationDraft} onClose={() => setReservationDraft(null)} />
      )}
    </div>
  );
}
