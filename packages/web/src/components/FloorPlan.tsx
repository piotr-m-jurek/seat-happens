import { useAtom } from "@effect/atom-react";
import { floorPlanAtom, obstaclesAtom, selectedTableIdAtom, tablesAtom } from "../atoms";
import { useAsyncValue, useCollection } from "../atoms/collection";
import { floorPlanCanvasStyle } from "../lib/reservations";
import { TableNode } from "./TableNode";

export function FloorPlan({ restaurantId }: { restaurantId: number }) {
  const tables = useCollection(tablesAtom(restaurantId));
  const obstacles = useCollection(obstaclesAtom(restaurantId));
  const floorPlan = useAsyncValue(floorPlanAtom(restaurantId), { width: 4, height: 3 });
  const [, setSelectedTableId] = useAtom(selectedTableIdAtom);

  if (tables.length === 0) {
    return (
      <div className="flex h-full items-center justify-center text-muted-foreground">
        No tables yet. Go to the Layout tab to add some.
      </div>
    );
  }

  return (
    <div
      className="relative mx-auto rounded-xl border bg-card"
      style={floorPlanCanvasStyle(floorPlan)}
    >
      {obstacles.map((obstacle) => (
        <div
          key={obstacle.id}
          className="pointer-events-none absolute flex -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-md border-2 border-dashed border-muted-foreground/40 bg-muted/60 text-sm text-muted-foreground"
          style={{
            left: `${obstacle.x * 100}%`,
            top: `${obstacle.y * 100}%`,
            width: `${obstacle.width * 100}%`,
            height: `${obstacle.height * 100}%`,
          }}
        >
          {obstacle.label}
        </div>
      ))}
      {tables.map((table) => (
        <TableNode
          key={table.id}
          restaurantId={restaurantId}
          table={table}
          onClick={() => setSelectedTableId(table.id)}
        />
      ))}
    </div>
  );
}
