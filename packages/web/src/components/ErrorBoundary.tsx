import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Component, type ReactNode } from "react";

// React error boundaries have no hook equivalent — must be a class
// component. A full reload rather than clearing the boundary's state and
// re-rendering in place, since a render crash usually means something
// upstream is in a bad state that a fresh mount is the more reliable fix
// for. No error-tracking service exists in this app to report to, so this
// just logs — matches the .catch(console.error) pattern already used
// throughout the repos.
export class ErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean }> {
  override state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  override componentDidCatch(error: unknown, info: unknown) {
    console.error(error, info);
  }

  override render() {
    if (!this.state.hasError) return this.props.children;
    return (
      <div className="flex h-full items-center justify-center p-6">
        <Card className="w-full max-w-sm text-center">
          <CardHeader>
            <CardTitle>Something went wrong</CardTitle>
            <CardDescription>
              The app hit an unexpected error. Reloading usually fixes it.
            </CardDescription>
          </CardHeader>
          <div className="px-6 pb-6">
            <Button className="w-full" onClick={() => window.location.reload()}>
              Reload page
            </Button>
          </div>
        </Card>
      </div>
    );
  }
}
