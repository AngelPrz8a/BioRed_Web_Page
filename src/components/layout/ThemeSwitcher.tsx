"use client";

import { Moon, Sun, SunMoon } from "lucide-react";
import { useSyncExternalStore } from "react";
import { cn } from "@/lib/cn";

type Theme = "auto" | "light" | "dark";

const OPTIONS: Array<{ value: Theme; label: string; icon: typeof Sun }> = [
  { value: "auto", label: "Automático", icon: SunMoon },
  { value: "light", label: "Día", icon: Sun },
  { value: "dark", label: "Noche", icon: Moon },
];

const STORAGE_KEY = "biored-theme";
const THEME_EVENT = "biored-theme-change";

function getTheme(): Theme {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (OPTIONS.some((option) => option.value === saved)) return saved as Theme;
  } catch {
    return "light";
  }
  return "light";
}

function subscribeToTheme(callback: () => void) {
  window.addEventListener(THEME_EVENT, callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener(THEME_EVENT, callback);
    window.removeEventListener("storage", callback);
  };
}

function getServerTheme(): Theme {
  return "light";
}

function saveTheme(theme: Theme) {
  try {
    localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    // Theme changes still apply for the current page if storage is unavailable.
  }
  document.documentElement.dataset.theme = theme;
  window.dispatchEvent(new Event(THEME_EVENT));
}

/**
 * Selector de apariencia. Guarda la preferencia y la expone en
 * <html data-theme="...">.
 */
export function ThemeSwitcher({
  compact = false,
}: {
  compact?: boolean;
}) {
  const theme = useSyncExternalStore(subscribeToTheme, getTheme, getServerTheme);

  const currentIndex = OPTIONS.findIndex((option) => option.value === theme);
  const currentOption = OPTIONS[currentIndex] ?? OPTIONS[0];
  const CompactIcon = currentOption.icon;

  return (
    <div
      className={cn(
        "flex w-full flex-col items-start gap-2.5",
        compact && "lg:items-center",
      )}
    >
      <div
        className={cn(
          "flex items-start gap-2.25 text-micro font-semibold text-text-muted",
          compact && "lg:w-full lg:justify-center",
        )}
      >
        <p className={cn("mt-px", compact && "lg:sr-only")}>APARIENCIA</p>
      </div>

      <div
        role="radiogroup"
        aria-label="Apariencia"
        className={cn(
          "flex items-start gap-2.5 text-caption leading-normal",
          compact && "lg:hidden",
        )}
      >
        {OPTIONS.map(({ value, label }) => {
          const selected = theme === value;
          return (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => saveTheme(value)}
              className={cn(
                "flex min-h-5.25 rounded-full px-2.5 py-1 text-left",
                selected
                  ? "bg-primary-soft font-semibold text-primary hover-dark"
                  : "bg-surface text-text-muted hover-dark",
              )}
            >
              {label}
            </button>
          );
        })}
      </div>

      {compact && (
        <button
          type="button"
          aria-label={`Apariencia: ${currentOption.label}. Cambiar apariencia`}
          title={`Apariencia: ${currentOption.label}`}
          onClick={() => saveTheme(OPTIONS[(currentIndex + 1) % OPTIONS.length].value)}
          className="hidden size-9 items-center justify-center rounded-md text-primary transition-colors hover:bg-surface-subtle lg:flex"
        >
          <CompactIcon className="size-4" strokeWidth={1.6} aria-hidden />
        </button>
      )}
    </div>
  );
}
