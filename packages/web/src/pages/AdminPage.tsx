import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAtomRefresh } from "@effect/atom-react";
import type { Restaurant } from "@sit-happens/shared";
import { useState, type FormEvent } from "react";
import { isSuperAdminAtom, restaurantsListAtom } from "../atoms";
import { useAsyncValue } from "../atoms/collection";
import { restaurantsRepo } from "../data/restaurantsRepo";
import { staffRepo } from "../data/staffRepo";
import { navigate } from "../lib/router";

export function AdminPage() {
  const isSuperAdmin = useAsyncValue(isSuperAdminAtom, false);
  const restaurants = useCollectionRestaurants();
  const refresh = useAtomRefresh(restaurantsListAtom);
  const [creating, setCreating] = useState(false);

  if (!isSuperAdmin) {
    return <div className="flex h-full items-center justify-center text-muted-foreground">Not authorized.</div>;
  }

  return (
    <div className="mx-auto max-w-2xl space-y-4 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">Restaurants</h1>
        <Button onClick={() => setCreating(true)}>+ New restaurant</Button>
      </div>

      {restaurants.length > 0 ? (
        <ul className="space-y-2">
          {restaurants.map((r) => (
            <li key={r.id} className="flex items-center justify-between rounded-lg border-2 p-3">
              <div>
                <p className="font-medium">{r.name}</p>
                <p className="text-sm text-muted-foreground">/r/{r.slug}</p>
              </div>
              <Button variant="outline" onClick={() => navigate(`/r/${r.slug}`)}>
                Open
              </Button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted-foreground">No restaurants yet.</p>
      )}

      {creating && (
        <NewRestaurantModal
          onClose={() => {
            setCreating(false);
            refresh();
          }}
        />
      )}
    </div>
  );
}

// Small wrapper so AdminPage stays readable — restaurantsListAtom is a
// one-shot lookup (see atoms/index.ts), not a live collection.
function useCollectionRestaurants(): Restaurant[] {
  return useAsyncValue(restaurantsListAtom, []);
}

function NewRestaurantModal({ onClose }: { onClose: () => void }) {
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [ownerEmail, setOwnerEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function save(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const restaurant = await restaurantsRepo.create({ name, slug });
      await staffRepo.invite(restaurant.id, ownerEmail, "owner");
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create restaurant.");
      setBusy(false);
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <form onSubmit={save} className="space-y-4">
          <DialogHeader>
            <DialogTitle>New restaurant</DialogTitle>
          </DialogHeader>

          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>

          <div className="space-y-2">
            <Label htmlFor="slug">URL slug</Label>
            <Input
              id="slug"
              placeholder="pizza-place"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="ownerEmail">Owner's email</Label>
            <Input
              id="ownerEmail"
              type="email"
              value={ownerEmail}
              onChange={(e) => setOwnerEmail(e.target.value)}
              required
            />
            <p className="text-sm text-muted-foreground">
              They'll get access the next time they sign in with this email.
            </p>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <DialogFooter>
            <Button type="submit" size="lg" disabled={busy}>
              {busy ? "Creating…" : "Create"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
