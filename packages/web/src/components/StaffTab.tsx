import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAtomRefresh } from "@effect/atom-react";
import type { StaffRole } from "@sit-happens/shared";
import { useState, type FormEvent } from "react";
import { staffInvitesAtom, staffListAtom } from "../atoms";
import { useAsyncValue } from "../atoms/collection";
import { staffRepo } from "../data/staffRepo";

export function StaffTab({ restaurantId }: { restaurantId: number }) {
  const staff = useAsyncValue(staffListAtom(restaurantId), []);
  const invites = useAsyncValue(staffInvitesAtom(restaurantId), []);
  const refreshStaff = useAtomRefresh(staffListAtom(restaurantId));
  const refreshInvites = useAtomRefresh(staffInvitesAtom(restaurantId));
  const [inviting, setInviting] = useState(false);

  async function removeStaff(id: number, email: string) {
    if (!confirm(`Remove ${email}'s access?`)) return;
    await staffRepo.remove(id);
    refreshStaff();
  }

  async function revokeInvite(id: number) {
    await staffRepo.removeInvite(id);
    refreshInvites();
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Staff</h2>
        <Button onClick={() => setInviting(true)}>+ Invite</Button>
      </div>

      <div className="space-y-2">
        {staff.map((s) => (
          <div key={s.id} className="flex items-center justify-between rounded-lg border-2 p-3">
            <div>
              <p className="font-medium">{s.email}</p>
              <p className="text-sm text-muted-foreground capitalize">{s.role}</p>
            </div>
            {s.role !== "owner" && (
              <Button variant="ghost" size="sm" onClick={() => removeStaff(s.id, s.email)}>
                Remove
              </Button>
            )}
          </div>
        ))}
      </div>

      {invites.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-muted-foreground">Pending invites</h3>
          {invites.map((i) => (
            <div key={i.id} className="flex items-center justify-between rounded-lg border-2 border-dashed p-3">
              <div>
                <p className="font-medium">{i.email}</p>
                <p className="text-sm text-muted-foreground capitalize">{i.role} · waiting for first sign-in</p>
              </div>
              <Button variant="ghost" size="sm" onClick={() => revokeInvite(i.id)}>
                Revoke
              </Button>
            </div>
          ))}
        </div>
      )}

      {inviting && (
        <InviteStaffModal
          restaurantId={restaurantId}
          onClose={() => {
            setInviting(false);
            refreshInvites();
          }}
        />
      )}
    </div>
  );
}

function InviteStaffModal({ restaurantId, onClose }: { restaurantId: number; onClose: () => void }) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<StaffRole>("viewer");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function save(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await staffRepo.invite(restaurantId, email, role);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not invite.");
      setBusy(false);
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <form onSubmit={save} className="space-y-4">
          <DialogHeader>
            <DialogTitle>Invite staff</DialogTitle>
          </DialogHeader>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>

          <div className="space-y-2">
            <Label htmlFor="role">Role</Label>
            <Select value={role} onValueChange={(v) => setRole(v as StaffRole)}>
              <SelectTrigger id="role" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="viewer">Viewer — read-only</SelectItem>
                <SelectItem value="owner">Owner — full access, can manage staff</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-sm text-muted-foreground">
              They'll get access the next time they sign in with this email.
            </p>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <DialogFooter>
            <Button type="submit" size="lg" disabled={busy}>
              {busy ? "Inviting…" : "Invite"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
