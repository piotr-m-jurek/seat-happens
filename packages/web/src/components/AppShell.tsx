import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAtom } from "@effect/atom-react";
import type { Restaurant, Staff } from "@sit-happens/shared";
import { useEffect, useState } from "react";
import { restaurantByIdAtom, selectedDateAtom, selectedTableIdAtom, viewAtom } from "../atoms";
import { useAsyncValue } from "../atoms/collection";
import { authRepo } from "../data/authRepo";
import { todayISO } from "../lib/reservations";
import { navigate, setSearchParam } from "../lib/router";
import { AgendaList } from "./AgendaList";
import { DatePicker } from "./DatePicker";
import { FloorPlan } from "./FloorPlan";
import { LayoutEditor } from "./LayoutEditor";
import { ReservationForm } from "./ReservationForm";
import { StaffTab } from "./StaffTab";
import { TableDetailPanel } from "./TableDetailPanel";
import { ThemeToggle } from "./ThemeToggle";

export interface ReservationDraft {
  id?: number;
  tableIds: number[];
}

function RestaurantSwitcherItem({ restaurantId }: { restaurantId: number }) {
  const restaurant = useAsyncValue(restaurantByIdAtom(restaurantId), null);
  if (!restaurant) return null;
  return <SelectItem value={restaurant.slug}>{restaurant.name}</SelectItem>;
}

// Only rendered when the account has more than one membership — the common
// single-restaurant case keeps the plain heading, no async lookup needed.
function RestaurantSwitcher({
  memberships,
  restaurant,
}: {
  memberships: Staff[];
  restaurant: Restaurant;
}) {
  return (
    <Select value={restaurant.slug} onValueChange={(slug) => navigate(`/r/${slug}`)}>
      <SelectTrigger className="w-auto whitespace-nowrap text-lg font-semibold">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {memberships.map((m) => (
          <RestaurantSwitcherItem key={m.restaurantId} restaurantId={m.restaurantId} />
        ))}
      </SelectContent>
    </Select>
  );
}

export function AppShell({
  staff,
  restaurant,
  memberships,
}: {
  staff: Staff;
  restaurant: Restaurant;
  memberships: Staff[];
}) {
  const [selectedDate, setSelectedDate] = useAtom(selectedDateAtom);
  const [selectedTableId, setSelectedTableId] = useAtom(selectedTableIdAtom);
  const [view, setView] = useAtom(viewAtom);
  const [reservationDraft, setReservationDraft] = useState<ReservationDraft | null>(null);
  const canWrite = staff.role !== "viewer";
  const isOwner = staff.role === "owner";

  // Keeps the URL in sync with the selected date — present as ?date=
  // when it's not today, absent (and normalized away) when it is. The
  // atom's initial value is seeded from this same param at module init
  // (see atoms/index.ts), so this only ever needs to go one direction.
  useEffect(() => {
    setSearchParam("date", selectedDate === todayISO() ? null : selectedDate);
  }, [selectedDate]);

  async function signOut() {
    await authRepo.signOut();
    setSelectedTableId(null);
    setView("floor");
  }

  return (
    <div className="flex h-full flex-col">
      <header className="flex items-center gap-4 border-b bg-card px-5 py-3">
        {memberships.length > 1 ? (
          <RestaurantSwitcher memberships={memberships} restaurant={restaurant} />
        ) : (
          <h1 className="whitespace-nowrap text-lg font-semibold">{restaurant.name}</h1>
        )}
        <DatePicker value={selectedDate} onChange={setSelectedDate} />
        <Tabs
          value={view}
          onValueChange={(v) => setView(v as "floor" | "agenda" | "layout" | "staff")}
        >
          <TabsList>
            <TabsTrigger value="floor">Floor Plan</TabsTrigger>
            <TabsTrigger value="agenda">Agenda</TabsTrigger>
            {canWrite && <TabsTrigger value="layout">Layout</TabsTrigger>}
            {isOwner && <TabsTrigger value="staff">Staff</TabsTrigger>}
          </TabsList>
        </Tabs>
        <div className="flex-1" />
        <ThemeToggle />
        <span className="text-sm text-muted-foreground">{staff.email}</span>
        <Button variant="ghost" onClick={signOut}>
          Sign out
        </Button>
      </header>

      <main className="flex-1 overflow-auto p-5">
        {view === "floor" && <FloorPlan restaurantId={restaurant.id} />}
        {view === "agenda" && (
          <AgendaList
            restaurantId={restaurant.id}
            canWrite={canWrite}
            onOpenReservation={setReservationDraft}
          />
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
        <ReservationForm
          restaurantId={restaurant.id}
          draft={reservationDraft}
          onClose={() => setReservationDraft(null)}
        />
      )}
    </div>
  );
}
