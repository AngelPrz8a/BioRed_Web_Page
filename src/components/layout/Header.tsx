"use client";

import { Bell, ChevronLeft, LogOut, Sprout } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/cn";
import type { SessionUser } from "@/lib/navigation";
import { HeaderClock } from "./HeaderClock";
import { ThemeSwitcher } from "./ThemeSwitcher";
import { useEffect, useState } from "react";
import { useShell } from "./ShellProvider";

type HeaderProps = {
  /** Sin usuario = visitante (Ingresar / Registrarse). */
  user?: SessionUser;
  homeHref?: string;
};

export function Header({ user, homeHref = "/" }: HeaderProps) {
  const { collapsed, mobileOpen, toggleSidebar } = useShell();
  const [compact, setCompact] = useState(false);

  useEffect(() => {
    const updateHeaderSize = () => {
      const isCompact = window.scrollY > 24;
      setCompact(isCompact);
      document.documentElement.style.setProperty(
        "--header-height",
        isCompact ? "4rem" : "5.0625rem",
      );
    };

    updateHeaderSize();
    window.addEventListener("scroll", updateHeaderSize, { passive: true });

    return () => {
      window.removeEventListener("scroll", updateHeaderSize);
      document.documentElement.style.removeProperty("--header-height");
    };
  }, []);

  return (
    <header
      className={cn(
        "sticky top-0 z-50 flex w-full shrink-0 items-center justify-between gap-4 border-b border-border bg-surface leading-normal transition-[height] duration-200",
        compact ? "h-16 px-4 sm:px-8" : "h-(--header-height) px-4 sm:px-8",
      )}
    >
      {/* Marca + control del menú */}
      <div
        className={cn(
          "flex items-center font-bold tracking-[-0.0625rem] text-text transition-[gap,font-size] duration-200",
          compact ? "gap-2.5 text-xl" : "gap-3.5 text-brand",
        )}
      >
        <Link
          href={homeHref}
          className={cn(
            "flex items-center transition-[gap] duration-200",
            compact ? "gap-2.5" : "gap-3.5",
          )}
          aria-label="BioRed, ir al inicio"
        >
          <span
            className={cn(
              "flex shrink-0 items-center justify-center rounded-brand bg-primary transition-[size] duration-200",
              compact ? "size-8.5" : "size-10.25",
            )}
          >
            <Sprout
              className={cn("text-white", compact ? "size-5" : "size-5.75")}
              strokeWidth={1.6}
              aria-hidden
            />
          </span>
          <span>BioRed</span>
        </Link>

        <button
          type="button"
          onClick={toggleSidebar}
          aria-label={collapsed ? "Expandir menú" : "Contraer menú"}
          aria-expanded={mobileOpen || !collapsed}
          aria-controls="menu-lateral"
          className={cn(
            "flex shrink-0 items-center justify-center rounded-brand border border-border bg-surface-subtle transition-[size] duration-200",
            compact ? "size-8" : "size-9",
          )}
        >
          <ChevronLeft
            className={cn(
              "size-4.5 text-text-muted transition-transform",
              collapsed && "lg:rotate-180",
            )}
            strokeWidth={2}
            aria-hidden
          />
        </button>
      </div>

      {/* Sesión */}
      <div className="flex shrink-0 items-center gap-2.5 text-xs font-semibold sm:gap-5.5">
        <div className="hidden items-center gap-3 font-normal leading-[1.45] text-text-muted lg:flex">
          <HeaderClock />
          <ThemeSwitcher compact />
          <button
            type="button"
            className="inline-flex items-center gap-1 whitespace-nowrap text-left"
            aria-label="Idioma: español"
          >
            <span aria-hidden="true">🌐</span>
            <span>ESP</span>
          </button>
        </div>

        {user ? (
          <>
            <button type="button" aria-label="Notificaciones" className="shrink-0">
              <Bell className="size-4.5 text-text-muted" strokeWidth={1.6} aria-hidden />
            </button>

            <div className="hidden flex-col items-start gap-0.5 text-left md:flex">
              <p className="text-xs font-semibold text-text">{user.name}</p>
              <div className="flex items-center gap-1 text-micro font-normal text-text-muted">
                <span>{user.roleLabel} ·</span>
                <form action="/api/auth/logout" method="post">
                  <button type="submit" className="hover:underline">
                    Cerrar sesión
                  </button>
                </form>
              </div>
            </div>

            <form action="/api/auth/logout" method="post" className="md:hidden">
              <button
                type="submit"
                aria-label={`Cerrar sesión de ${user.name}`}
                className="hover-bright flex size-9.25 items-center justify-center rounded-full bg-primary-soft text-caption font-semibold text-primary"
              >
                <LogOut className="size-4" aria-hidden />
              </button>
            </form>
            <span className="hidden size-9.25 items-center justify-center rounded-full bg-primary-soft text-caption font-semibold text-primary md:flex">
              {user.initials}
            </span>
          </>
        ) : (
          <>
            <Link
              href="/ingresar"
              className="hover-bright hidden rounded-md bg-surface px-3.5 py-2.5 text-primary sm:inline-flex"
            >
              Ingresar
            </Link>
            <Link
              href="/registro"
              className="hover-bright rounded-md bg-primary px-2.5 py-2.5 text-surface sm:px-3.5"
            >
              Registrarse
            </Link>
          </>
        )}
      </div>
    </header>
  );
}
