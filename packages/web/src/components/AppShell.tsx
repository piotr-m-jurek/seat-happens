import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { Staff } from "@sit-happens/shared";
import { useState } from "react";
import { setSelectedDate, setSelectedTableId, setView, signOut, useStore } from "../store";
import { AgendaList } from "./AgendaList";
import { FloorPlan } from "./FloorPlan";
import { LayoutEditor } from "./LayoutEditor";
import { ReservationForm } from "./ReservationForm";
import { TableDetailPanel } from "./TableDetailPanel";

export interface ReservationDraft {
  id?: number;
  tableId: number;
}

export function AppShell({ staff }: { staff: Staff }) {
  const selectedDate = useStore((s) => s.selectedDate);
  const selectedTableId = useStore((s) => s.selectedTableId);
  const view = useStore((s) => s.view);
  const [reservationDraft, setReservationDraft] = useState<ReservationDraft | null>(null);

  return (
    <div className="flex h-full flex-col">
      <header className="flex items-center gap-4 border-b bg-card px-5 py-3">
        <h1 className="whitespace-nowrap text-lg font-semibold">Sit Happens</h1>
        <Input
          type="date"
          className="w-auto"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
        />
        <Tabs value={view} onValueChange={(v) => setView(v as "floor" | "agenda" | "layout")}>
          <TabsList>
            <TabsTrigger value="floor">Floor Plan</TabsTrigger>
            <TabsTrigger value="agenda">Agenda</TabsTrigger>
            <TabsTrigger value="layout">Layout</TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="flex-1" />
        <span className="text-sm text-muted-foreground">{staff.email}</span>
        <Button variant="ghost" onClick={signOut}>
          Sign out
        </Button>
      </header>

      <main className="flex-1 overflow-auto p-5">
        {view === "floor" && <FloorPlan />}
        {view === "agenda" && <AgendaList onOpenReservation={setReservationDraft} />}
        {view === "layout" && <LayoutEditor />}
      </main>

      {selectedTableId !== null && (
        <TableDetailPanel
          tableId={selectedTableId}
          onClose={() => setSelectedTableId(null)}
          onOpenReservation={setReservationDraft}
        />
      )}

      {reservationDraft && <ReservationForm draft={reservationDraft} onClose={() => setReservationDraft(null)} />}
    </div>
  );
}
