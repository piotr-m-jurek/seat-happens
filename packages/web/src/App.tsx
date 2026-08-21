import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAtomValue } from "@effect/atom-react";
import type { Staff } from "@sit-happens/shared";
import * as AsyncResult from "effect/unstable/reactivity/AsyncResult";
import { useEffect, useState } from "react";
import { restaurantAtom, restaurantByIdAtom, sessionAtom, staffAtom } from "./atoms";
import { useAsyncValue } from "./atoms/collection";
import { AppShell } from "./components/AppShell";
import { LandingPage } from "./components/LandingPage";
import { LoginForm } from "./components/LoginForm";
import { navigate, useRoute } from "./lib/router";
import { AdminPage } from "./pages/AdminPage";

function Loading() {
  return <div className="flex h-full items-center justify-center text-muted-foreground">Loading…</div>;
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

function HomeRoute({ staff }: { staff: Staff }) {
  const restaurant = useAsyncValue(restaurantByIdAtom(staff.restaurantId), null);
  useEffect(() => {
    if (restaurant) navigate(`/r/${restaurant.slug}`);
  }, [restaurant]);
  return <Loading />;
}

function RestaurantRoute({ slug, staff }: { slug: string; staff: Staff | null }) {
  const result = useAtomValue(restaurantAtom(slug));

  if (AsyncResult.isInitial(result)) {
    return <Loading />;
  }

  const restaurant = AsyncResult.getOrElse(result, () => null);
  if (!restaurant) {
    return <InfoCard title="Not found" description="No restaurant at this address." />;
  }
  if (!staff) {
    return (
      <InfoCard
        title="Not set up yet"
        description="Your account isn't linked to this restaurant yet. Ask the owner to add your email address."
      />
    );
  }
  if (staff.restaurantId !== restaurant.id) {
    return <InfoCard title="Not your restaurant" description="Your account belongs to a different restaurant." />;
  }
  return <AppShell staff={staff} restaurant={restaurant} />;
}

export default function App() {
  const route = useRoute();
  const sessionResult = useAtomValue(sessionAtom);
  const staffResult = useAtomValue(staffAtom);
  const authReady = !AsyncResult.isInitial(sessionResult) && !AsyncResult.isInitial(staffResult);
  const session = AsyncResult.getOrElse(sessionResult, () => null);
  const staff = AsyncResult.getOrElse(staffResult, () => null);
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
    return <RestaurantRoute slug={route.slug} staff={staff} />;
  }

  if (!staff) {
    return (
      <InfoCard
        title="Not set up yet"
        description="Your account isn't linked to a restaurant yet. Ask an owner to add your email address."
      />
    );
  }
  return <HomeRoute staff={staff} />;
}
