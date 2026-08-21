import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useEffect, useState } from "react";
import { AppShell } from "./components/AppShell";
import { LandingPage } from "./components/LandingPage";
import { LoginForm } from "./components/LoginForm";
import { initAuth, useStore } from "./store";

export default function App() {
  useEffect(() => {
    initAuth();
  }, []);

  const authReady = useStore((s) => s.authReady);
  const session = useStore((s) => s.session);
  const staff = useStore((s) => s.staff);
  const [showLogin, setShowLogin] = useState(false);

  if (!authReady) {
    return <div className="flex h-full items-center justify-center text-muted-foreground">Loading…</div>;
  }

  if (!session) {
    return showLogin ? (
      <LoginForm onCancel={() => setShowLogin(false)} />
    ) : (
      <LandingPage onSignIn={() => setShowLogin(true)} />
    );
  }

  if (!staff) {
    return (
      <div className="flex h-full items-center justify-center p-6">
        <Card className="w-full max-w-sm text-center">
          <CardHeader>
            <CardTitle>Not set up yet</CardTitle>
            <CardDescription>
              Your account isn't linked to this restaurant yet. Ask the owner to add your email address.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return <AppShell staff={staff} />;
}
