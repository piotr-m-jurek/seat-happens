import type { Staff, StaffRole } from "../types";

export function canWrite(role: StaffRole): boolean {
  return role !== "viewer";
}

export function isOwner(role: StaffRole): boolean {
  return role === "owner";
}

// Only checks the target's own role today (an owner can't be removed by
// anyone) — the natural place to grow this if a rule about the *acting*
// user's role is ever needed too.
export function canRemoveStaffMember(target: Staff): boolean {
  return target.role !== "owner";
}
