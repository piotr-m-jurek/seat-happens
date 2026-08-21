import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAtomValue } from "@effect/atom-react";
import * as AsyncResult from "effect/unstable/reactivity/AsyncResult";
import { useState } from "react";
import { sessionAtom, staffAtom } from "./atoms";
import { AppShell } from "./components/AppShell";
import { LandingPage } from "./components/LandingPage";
import { LoginForm } from "./components/LoginForm";

export default function App() {
  const sessionResult = useAtomValue(sessionAtom);
  const staffResult = useAtomValue(staffAtom);
  const authReady = !AsyncResult.isInitial(sessionResult);
  const session = AsyncResult.getOrElse(sessionResult, () => null);
  const staff = AsyncResult.getOrElse(staffResult, () => null);
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
