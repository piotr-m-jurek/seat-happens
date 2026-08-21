import type { Table } from "../types";

// "T1" -> "T1 copy" -> "T1 copy 2" -> "T1 copy 3" ..., counting existing
// copies (of either the original or another copy) to pick the next number.
export function nextDuplicateName(existingNames: string[], sourceName: string): string {
  const base = sourceName.replace(/ copy(?: \d+)?$/, "");
  const escaped = base.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const copyPattern = new RegExp(`^${escaped} copy(?: \\d+)?$`);
  const count = existingNames.filter((n) => copyPattern.test(n)).length;
  return count === 0 ? `${base} copy` : `${base} copy ${count + 1}`;
}

export function totalSeats(tables: Table[]): number {
  return tables.reduce((sum, t) => sum + t.seats, 0);
}
