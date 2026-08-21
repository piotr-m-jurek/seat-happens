import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState, type FormEvent } from "react";
import { authRepo } from "../data/authRepo";

export function LoginForm({ onCancel }: { onCancel: () => void }) {
  const [step, setStep] = useState<"email" | "code">("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function sendCode(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await authRepo.requestOtp(email);
      setStep("code");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send code.");
    } finally {
      setBusy(false);
    }
  }

  async function verify(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await authRepo.verifyOtp(email, code);
      // store's onSessionChange listener picks this up automatically
    } catch (err) {
      setError(err instanceof Error ? err.message : "Invalid code.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex h-full items-center justify-center p-6">
      <Card className="w-full max-w-sm">
        {step === "email" ? (
          <form onSubmit={sendCode}>
            <CardHeader>
              <CardTitle className="text-2xl">Sign in</CardTitle>
              <CardDescription>Enter your email to get a login code.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
              <Button type="submit" size="lg" className="w-full" disabled={busy}>
                {busy ? "Sending…" : "Send code"}
              </Button>
              <Button type="button" variant="link" className="w-full" onClick={onCancel}>
                Back
              </Button>
            </CardContent>
          </form>
        ) : (
          <form onSubmit={verify}>
            <CardHeader>
              <CardTitle className="text-2xl">Enter code</CardTitle>
              <CardDescription>We sent a code to {email}.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="code">Code</Label>
                <Input
                  id="code"
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  placeholder="123456"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  required
                />
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
              <Button type="submit" size="lg" className="w-full" disabled={busy}>
                {busy ? "Verifying…" : "Verify"}
              </Button>
              <Button type="button" variant="link" className="w-full" onClick={() => setStep("email")}>
                Use a different email
              </Button>
            </CardContent>
          </form>
        )}
      </Card>
    </div>
  );
}
