import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function LandingPage({ onSignIn }: { onSignIn: () => void }) {
  return (
    <div className="flex h-full items-center justify-center p-6">
      <Card className="w-full max-w-sm text-center">
        <CardHeader>
          <CardTitle className="text-2xl">Seat Happens</CardTitle>
          <CardDescription>Table reservations for the front desk.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button size="lg" className="w-full" onClick={onSignIn}>
            Sign in
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
