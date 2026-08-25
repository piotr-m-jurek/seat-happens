import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAtomValue } from "@effect/atom-react";
import type { Staff } from "@seat-happens/shared";
import * as AsyncResult from "effect/unstable/reactivity/AsyncResult";
import { useEffect, useState } from "react";
import { restaurantAtom, restaurantByIdAtom, sessionAtom, staffMembershipsAtom } from "./atoms";
import { useAsyncValue } from "./atoms/collection";
import { AppShell } from "./components/AppShell";
import { LandingPage } from "./components/LandingPage";
import { LoginForm } from "./components/LoginForm";
import { OfflineBanner } from "./components/OfflineBanner";
import { navigate, useRoute } from "./lib/router";
import { AdminPage } from "./pages/AdminPage";

function Loading() {
  return (
    <div className="flex h-full items-center justify-center text-muted-foreground">Loading…</div>
  );
}

function InfoCard({ title, description }: { title: string; description: string }) {
  return (
    <div className="flex h-full items-center justify-center p-6">
      <Card className="w-full max-w-sm text-center">
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
      </Card>
    </div>
  );
}

function RestaurantPickerRow({ membership }: { membership: Staff }) {
  const restaurant = useAsyncValue(restaurantByIdAtom(membership.restaurantId), null);
  if (!restaurant) return null;
  return (
    <button
      type="button"
      onClick={() => navigate(`/r/${restaurant.slug}`)}
      className="flex w-full items-center justify-between rounded-lg border-2 p-3 text-left hover:bg-accent"
    >
      <span className="font-medium">{restaurant.name}</span>
      <span className="text-sm capitalize text-muted-foreground">{membership.role}</span>
    </button>
  );
}

function RestaurantPicker({ memberships }: { memberships: Staff[] }) {
  return (
    <div className="flex h-full items-center justify-center p-6">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Choose a restaurant</CardTitle>
          <CardDescription>Your account has access to more than one.</CardDescription>
        </CardHeader>
        <div className="space-y-2 px-6 pb-6">
          {memberships.map((m) => (
            <RestaurantPickerRow key={m.restaurantId} membership={m} />
          ))}
        </div>
      </Card>
    </div>
  );
}

function HomeRoute({ memberships }: { memberships: Staff[] }) {
  const restaurant = useAsyncValue(restaurantByIdAtom(memberships[0]?.restaurantId ?? -1), null);
  const singleMembership = memberships.length === 1;

  useEffect(() => {
    if (singleMembership && restaurant) navigate(`/r/${restaurant.slug}`);
  }, [singleMembership, restaurant]);

  if (memberships.length === 0) {
    return (
      <InfoCard
        title="Not set up yet"
        description="Your account isn't linked to a restaurant yet. Ask an owner to add your email address."
      />
    );
  }
  if (memberships.length > 1) {
    return <RestaurantPicker memberships={memberships} />;
  }
  return <Loading />;
}

function RestaurantRoute({ slug, memberships }: { slug: string; memberships: Staff[] }) {
  const result = useAtomValue(restaurantAtom(slug));

  if (AsyncResult.isInitial(result)) {
    return <Loading />;
  }

  const restaurant = AsyncResult.getOrElse(result, () => null);
  if (!restaurant) {
    return <InfoCard title="Not found" description="No restaurant at this address." />;
  }
  const staff = memberships.find((m) => m.restaurantId === restaurant.id);
  if (!staff) {
    return (
      <InfoCard
        title="Not set up yet"
        description="Your account isn't linked to this restaurant yet. Ask the owner to add your email address."
      />
    );
  }
  return <AppShell staff={staff} restaurant={restaurant} memberships={memberships} />;
}

function AppContent() {
  const route = useRoute();
  const sessionResult = useAtomValue(sessionAtom);
  const membershipsResult = useAtomValue(staffMembershipsAtom);
  const authReady =
    !AsyncResult.isInitial(sessionResult) && !AsyncResult.isInitial(membershipsResult);
  const session = AsyncResult.getOrElse(sessionResult, () => null);
  const memberships = AsyncResult.getOrElse(membershipsResult, () => []);
  const [showLogin, setShowLogin] = useState(false);

  if (!authReady) {
    return <Loading />;
  }

  if (!session) {
    return showLogin ? (
      <LoginForm onCancel={() => setShowLogin(false)} />
    ) : (
      <LandingPage onSignIn={() => setShowLogin(true)} />
    );
  }

  if (route.kind === "admin") {
    return <AdminPage />;
  }

  if (route.kind === "restaurant") {
    return <RestaurantRoute slug={route.slug} memberships={memberships} />;
  }

  return <HomeRoute memberships={memberships} />;
}

// OfflineBanner lives here, above all routing, so it's visible regardless
// of auth state or which route is active.
export default function App() {
  return (
    <div className="flex h-full flex-col">
      <OfflineBanner />
      <div className="min-h-0 flex-1">
        <AppContent />
      </div>
    </div>
  );
}
