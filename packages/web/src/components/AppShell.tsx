import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAtom } from "@effect/atom-react";
import { canWrite as canWriteRole, isOwner as isOwnerRole } from "@seat-happens/shared";
import type { Restaurant, Staff } from "@seat-happens/shared";
import { SettingsIcon } from "lucide-react";
import { useEffect, useState } from "react";
import {
  restaurantByIdAtom,
  selectedDateAtom,
  selectedTableIdAtom,
  viewAtom,
  type View,
} from "../atoms";
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
import { TimelinePage } from "./TimelinePage";

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

// Owner-only, and deliberately not part of the main Tabs group — Layout
// and Staff are restaurant administration, not day-to-day views the way
// Floor Plan/Agenda/Timeline are.
function AdminMenu({ view, onSelect }: { view: View; onSelect: (view: View) => void }) {
  const isActive = view === "layout" || view === "staff";
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant={isActive ? "secondary" : "outline"} size="sm">
          <SettingsIcon className="size-4" />
          Admin
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onSelect={() => onSelect("layout")}>Layout</DropdownMenuItem>
        <DropdownMenuItem onSelect={() => onSelect("staff")}>Staff</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
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
  const canWrite = canWriteRole(staff.role);
  const isOwner = isOwnerRole(staff.role);

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
        <Tabs value={view} onValueChange={(v) => setView(v as View)}>
          <TabsList>
            <TabsTrigger value="floor">Floor Plan</TabsTrigger>
            <TabsTrigger value="agenda">Agenda</TabsTrigger>
            <TabsTrigger value="timeline">Timeline</TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="flex-1" />
        {isOwner && <AdminMenu view={view} onSelect={setView} />}
        <div className="h-6 w-px bg-border" />
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
        {view === "timeline" && <TimelinePage restaurantId={restaurant.id} />}
        {view === "layout" && isOwner && <LayoutEditor restaurantId={restaurant.id} />}
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
