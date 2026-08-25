import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Restaurant } from "@seat-happens/shared";
import { useRestaurantSettingsForm } from "../hooks/useRestaurantSettingsForm";

export function RestaurantSettingsPage({ restaurant }: { restaurant: Restaurant }) {
  const {
    name,
    setName,
    openTime,
    setOpenTime,
    closeTime,
    setCloseTime,
    error,
    busy,
    saved,
    save,
  } = useRestaurantSettingsForm(restaurant);

  return (
    <div className="mx-auto max-w-md">
      <h2 className="mb-4 text-lg font-semibold">Restaurant settings</h2>
      <form onSubmit={save} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="settingsName">Name</Label>
          <Input
            id="settingsName"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label htmlFor="openTime">Opens</Label>
            <Input
              id="openTime"
              type="time"
              value={openTime}
              onChange={(e) => setOpenTime(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="closeTime">Closes</Label>
            <Input
              id="closeTime"
              type="time"
              value={closeTime}
              onChange={(e) => setCloseTime(e.target.value)}
              required
            />
          </div>
        </div>
        <p className="text-sm text-muted-foreground">Used for the Timeline tab's hour range.</p>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <div className="flex items-center gap-3">
          <Button type="submit" size="lg" disabled={busy}>
            {busy ? "Saving…" : "Save"}
          </Button>
          {saved && <span className="text-sm text-muted-foreground">Saved</span>}
        </div>
      </form>
    </div>
  );
}
