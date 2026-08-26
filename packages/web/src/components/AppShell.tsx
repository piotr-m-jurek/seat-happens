import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
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
import { cn } from "@/lib/utils";
import { useAtom } from "@effect/atom-react";
import { canWrite as canWriteRole, isOwner as isOwnerRole } from "@seat-happens/shared";
import type { Restaurant, Staff } from "@seat-happens/shared";
import { Monitor, Moon, SearchIcon, SettingsIcon, Sun, UserIcon } from "lucide-react";
import { useEffect, useState } from "react";
import {
  restaurantByIdAtom,
  selectedDateAtom,
  selectedTableIdAtom,
  themeAtom,
  viewAtom,
  type View,
} from "../atoms";
import { useAsyncValue } from "../atoms/collection";
import { authRepo } from "../data/authRepo";
import { useMediaQuery } from "../hooks/useMediaQuery";
import { todayISO } from "../lib/reservations";
import { navigate, setSearchParam } from "../lib/router";
import { applyTheme, type Theme } from "../lib/theme";
import { RestaurantSettingsPage } from "../pages/RestaurantSettingsPage";
import { AgendaList } from "./AgendaList";
import { DatePicker } from "./DatePicker";
import { FloorPlan } from "./FloorPlan";
import { LayoutEditor } from "./LayoutEditor";
import { ReservationForm } from "./ReservationForm";
import { ReservationSearch } from "./ReservationSearch";
import { StaffTab } from "./StaffTab";
import { TableDetailPanel } from "./TableDetailPanel";
import { TimelinePage } from "./TimelinePage";

export interface ReservationDraft {
  id?: number;
  tableIds: number[];
}

// 1024px is the classic iPad's landscape width — older, smaller iPads (and
// anything narrower, including that same iPad in portrait) don't have room
// for a separate Admin entry alongside Floor Plan/Agenda/Timeline, so Admin
// folds into the account menu below this width instead.
const ADMIN_MENU_QUERY = "(min-width: 1024px)";

// Owner-only, rendered as a direct child of the same TabsList as Floor
// Plan/Agenda/Timeline (styled to match a TabsTrigger) so it reads as the
// next tab in that row, opening a dropdown instead of switching views
// directly since it covers three destinations. Below ADMIN_MENU_QUERY this
// hides in favor of the same destinations inside AccountMenu.
function AdminMenu({ view, onSelect }: { view: View; onSelect: (view: View) => void }) {
  const isActive = view === "layout" || view === "staff" || view === "settings";
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className={cn(
            "relative inline-flex h-[calc(100%-1px)] items-center justify-center gap-1.5 rounded-md border border-transparent px-2 py-1 text-sm font-medium whitespace-nowrap text-foreground/60 transition-all hover:text-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-1 focus-visible:outline-ring",
            isActive &&
              "bg-background text-foreground shadow-sm dark:border-input dark:bg-input/30 dark:text-foreground",
          )}
        >
          <SettingsIcon className="size-4" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        <DropdownMenuItem onSelect={() => onSelect("layout")}>Layout</DropdownMenuItem>
        <DropdownMenuItem onSelect={() => onSelect("staff")}>Staff</DropdownMenuItem>
        <DropdownMenuItem onSelect={() => onSelect("settings")}>Settings</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
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

// One menu on the right for everything that isn't a day-to-day view:
// owner-only admin destinations (Layout/Staff/Settings — deliberately not
// part of the main Tabs group, since those are restaurant administration,
// not views like Floor Plan/Agenda/Timeline), theme, and sign out.
function AccountMenu({
  staff,
  showAdmin,
  view,
  onSelectView,
  onSignOut,
}: {
  staff: Staff;
  showAdmin: boolean;
  view: View;
  onSelectView: (view: View) => void;
  onSignOut: () => void;
}) {
  const [theme, setTheme] = useAtom(themeAtom);

  // Only reactive concerns live here — the FOUC-preventing initial apply
  // already happened synchronously in index.html before React mounted.
  useEffect(() => applyTheme(theme), [theme]);

  const isAdminViewActive = view === "layout" || view === "staff" || view === "settings";
  const ThemeIcon = theme === "light" ? Sun : theme === "dark" ? Moon : Monitor;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant={isAdminViewActive ? "secondary" : "outline"} size="icon">
          <UserIcon className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="truncate font-normal text-muted-foreground">
          {staff.email}
        </DropdownMenuLabel>
        {showAdmin && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuLabel>Admin</DropdownMenuLabel>
            <DropdownMenuItem onSelect={() => onSelectView("layout")}>Layout</DropdownMenuItem>
            <DropdownMenuItem onSelect={() => onSelectView("staff")}>Staff</DropdownMenuItem>
            <DropdownMenuItem onSelect={() => onSelectView("settings")}>Settings</DropdownMenuItem>
          </>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuSub>
          <DropdownMenuSubTrigger>
            <ThemeIcon className="size-4" />
            Theme
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent>
            <DropdownMenuRadioGroup value={theme} onValueChange={(v) => setTheme(v as Theme)}>
              <DropdownMenuRadioItem value="light">Light</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="dark">Dark</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="system">System</DropdownMenuRadioItem>
            </DropdownMenuRadioGroup>
          </DropdownMenuSubContent>
        </DropdownMenuSub>
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" onSelect={onSignOut}>
          Sign out
        </DropdownMenuItem>
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
  const [searching, setSearching] = useState(false);
  const canWrite = canWriteRole(staff.role);
  const isOwner = isOwnerRole(staff.role);
  const wideEnoughForAdminMenu = useMediaQuery(ADMIN_MENU_QUERY);
  const showAdminMenu = isOwner && wideEnoughForAdminMenu;

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
        {canWrite && (
          <Button variant="outline" size="icon" onClick={() => setSearching(true)}>
            <SearchIcon className="size-4" />
          </Button>
        )}
        <Tabs value={view} onValueChange={(v) => setView(v as View)}>
          <TabsList>
            <TabsTrigger value="floor">Floor Plan</TabsTrigger>
            <TabsTrigger value="agenda">Agenda</TabsTrigger>
            <TabsTrigger value="timeline">Timeline</TabsTrigger>
            {showAdminMenu && <AdminMenu view={view} onSelect={setView} />}
          </TabsList>
        </Tabs>
        <div className="flex-1" />
        <AccountMenu
          staff={staff}
          showAdmin={isOwner && !showAdminMenu}
          view={view}
          onSelectView={setView}
          onSignOut={signOut}
        />
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
        {view === "timeline" && <TimelinePage restaurant={restaurant} />}
        {view === "layout" && isOwner && <LayoutEditor restaurantId={restaurant.id} />}
        {view === "staff" && isOwner && <StaffTab restaurantId={restaurant.id} />}
        {view === "settings" && isOwner && <RestaurantSettingsPage restaurant={restaurant} />}
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

      {searching && (
        <ReservationSearch
          restaurantId={restaurant.id}
          onOpenReservation={setReservationDraft}
          onClose={() => setSearching(false)}
        />
      )}
    </div>
  );
}
