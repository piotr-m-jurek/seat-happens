import { Button } from "@/components/ui/button";
import { useAtom } from "@effect/atom-react";
import { Monitor, Moon, Sun } from "lucide-react";
import { useEffect } from "react";
import { themeAtom } from "../atoms";
import { applyTheme, type Theme } from "../lib/theme";

const NEXT: Record<Theme, Theme> = { light: "dark", dark: "system", system: "light" };
const ICON = { light: Sun, dark: Moon, system: Monitor } as const;
const LABEL: Record<Theme, string> = { light: "Light", dark: "Dark", system: "System" };

export function ThemeToggle() {
  const [theme, setTheme] = useAtom(themeAtom);

  // Only reactive concerns live here — the FOUC-preventing initial apply
  // already happened synchronously in index.html before React mounted.
  useEffect(() => applyTheme(theme), [theme]);

  const Icon = ICON[theme];
  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => setTheme(NEXT[theme])}
      title={`Theme: ${LABEL[theme]} (click to change)`}
      aria-label={`Theme: ${LABEL[theme]}. Click to switch.`}
    >
      <Icon className="size-4" />
    </Button>
  );
}
