"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

type ShellState = {
  /** Escritorio: menú reducido a iconos. */
  collapsed: boolean;
  /** Móvil / tablet: menú como panel superpuesto. */
  mobileOpen: boolean;
  toggleSidebar: () => void;
  closeMobile: () => void;
};

const ShellContext = createContext<ShellState | null>(null);

/** Coincide con el breakpoint `lg` de Tailwind (64rem). */
const DESKTOP_QUERY = "(min-width: 64rem)";
const SIDEBAR_STORAGE_KEY = "biored-sidebar-collapsed";

export function ShellProvider({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [sidebarPreferenceLoaded, setSidebarPreferenceLoaded] = useState(false);

  useEffect(() => {
    setCollapsed(localStorage.getItem(SIDEBAR_STORAGE_KEY) === "true");
    setSidebarPreferenceLoaded(true);
  }, []);

  useEffect(() => {
    if (sidebarPreferenceLoaded) {
      localStorage.setItem(SIDEBAR_STORAGE_KEY, String(collapsed));
    }
  }, [collapsed, sidebarPreferenceLoaded]);

  const toggleSidebar = useCallback(() => {
    if (window.matchMedia(DESKTOP_QUERY).matches) {
      setCollapsed((v) => !v);
    } else {
      setMobileOpen((v) => !v);
    }
  }, []);

  const closeMobile = useCallback(() => setMobileOpen(false), []);

  const value = useMemo(
    () => ({ collapsed, mobileOpen, toggleSidebar, closeMobile }),
    [collapsed, mobileOpen, toggleSidebar, closeMobile],
  );

  return <ShellContext.Provider value={value}>{children}</ShellContext.Provider>;
}

export function useShell() {
  const ctx = useContext(ShellContext);
  if (!ctx) throw new Error("useShell debe usarse dentro de <ShellProvider>");
  return ctx;
}
