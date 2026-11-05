"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Fragment, useEffect } from "react";
import { cn } from "@/lib/cn";
import { ROLES, type NavLink, type NavSection, type Role } from "@/lib/navigation";
import { useShell } from "./ShellProvider";
import { ThemeSwitcher } from "./ThemeSwitcher";
import { HeaderClock } from "./HeaderClock";

type SidebarProps = {
  /** Se pasa el rol (serializable) y no la config: esta trae componentes de icono. */
  role: Role;
};

/** "/" y las raíces de cada rol solo coinciden exactas; el resto por prefijo. */
function isActive(pathname: string, href: string, roots: string[]) {
  if (roots.includes(href)) return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function Sidebar({ role }: SidebarProps) {
  const { scope, sections } = ROLES[role];
  const pathname = usePathname();
  const { collapsed, mobileOpen, closeMobile } = useShell();

  // Cierra el panel móvil al navegar.
  useEffect(() => {
    closeMobile();
  }, [pathname, closeMobile]);

  const roots = sections.flatMap((s) =>
    s.kind === "links" && !s.title ? s.items.map((i) => i.href) : [],
  );

  return (
    <>
      {/* Fondo del panel móvil */}
      <div
        aria-hidden
        onClick={closeMobile}
        className={cn(
          "fixed inset-0 top-(--header-height) z-30 bg-text/30 transition-opacity lg:hidden",
          mobileOpen ? "opacity-100" : "pointer-events-none opacity-0",
        )}
      />

      <aside
        id="menu-lateral"
        aria-label="Menú lateral"
        className={cn(
          "z-40 shrink-0 border-r border-border bg-surface",
          // Móvil: panel superpuesto
          "fixed top-(--header-height) bottom-0 left-0 flex w-57.5 flex-col transition-[top,bottom,transform] duration-200",
          mobileOpen ? "translate-x-0" : "-translate-x-full",
          // Escritorio: columna fija a la izquierda
          "lg:static lg:top-auto lg:bottom-auto lg:translate-x-0 lg:self-stretch",
          collapsed ? "lg:w-18" : "lg:w-57.5",
        )}
      >
        <div
          className={cn(
            "flex h-full min-h-0 flex-col items-start gap-5.75 overflow-y-auto overscroll-contain px-4.5 pt-6.5 pb-10 text-left leading-[1.45]",
            "lg:sticky lg:top-(--header-height) lg:h-[calc(100dvh-var(--header-height)-var(--footer-height))] lg:transition-[top,height] lg:duration-200",
            collapsed
              ? "lg:items-stretch lg:gap-4 lg:px-3 lg:pt-6"
              : "lg:items-start lg:gap-5.75 lg:px-4.5 lg:pt-6.5",
          )}
        >
          {/* Tarjeta de alcance de la sesión */}
          <div
            className={cn(
              "flex shrink-0 flex-col gap-1.75 self-stretch rounded-md bg-surface-subtle p-3",
              collapsed && "lg:hidden",
            )}
          >
            <p className="text-label font-semibold text-text">{scope.title}</p>
            <div className="flex flex-col gap-2.75 font-normal">
              <p className="text-caption text-text-muted">{scope.description}</p>
              {scope.accountHref && (
                <Link href={scope.accountHref} className="text-xs text-primary">
                  Mi cuenta →
                </Link>
              )}
            </div>
          </div>

          {/* Secciones de navegación */}
          <nav aria-label="Principal" className="flex w-full shrink-0 flex-col gap-2.5">
            {sections.map((section, i) => (
              <SectionBlock
                key={i}
                section={section}
                first={i === 0}
                collapsed={collapsed}
                pathname={pathname}
                roots={roots}
              />
            ))}
          </nav>

          {/* Preferencias del navbar en pantallas pequeñas. */}
          <div className="mt-2.25 flex w-full shrink-0 flex-col gap-3 border-t border-border pt-3 lg:hidden">
            <div className="flex flex-col gap-2 text-caption text-text-muted">
              <span className="text-micro font-semibold">HORA Y FECHA</span>
              <HeaderClock />
              <span className="text-micro font-semibold">IDIOMA</span>
              <button
                type="button"
                className="inline-flex w-fit items-center gap-1 whitespace-nowrap text-left"
                aria-label="Idioma: español"
              >
                <span aria-hidden="true">🌐</span>
                <span>ESP</span>
              </button>
            </div>
            <ThemeSwitcher />
          </div>
        </div>
      </aside>
    </>
  );
}

/* ------------------------------------------------------------------ */

type SectionBlockProps = {
  section: NavSection;
  first: boolean;
  collapsed: boolean;
  pathname: string;
  roots: string[];
};

function SectionBlock({ section, first, collapsed, pathname, roots }: SectionBlockProps) {
  const titled = !first && section.title;

  // Un bloque sin ningún elemento con icono no se muestra en el menú reducido.
  const hasIcons =
    section.kind === "readings" || section.items.some((item) => item.icon);

  return (
    <div
      className={cn(
        "flex flex-col gap-3",
        titled && "mt-2.5 border-t border-border pt-4.25",
        titled && collapsed && "lg:mt-1 lg:pt-2.25",
        collapsed && !hasIcons && "lg:hidden",
      )}
    >
      {section.title && (
        <p
          className={cn(
            "text-micro font-semibold text-text-muted",
            collapsed && "lg:sr-only",
          )}
        >
          {section.title}
        </p>
      )}

      {section.kind === "readings" ? (
        <div className="flex flex-col gap-3">
          <NavRow
            item={section.item}
            active={isActive(pathname, section.item.href, roots)}
            collapsed={collapsed}
            flush
          />
          <div
            className={cn(
              "flex flex-col gap-2 pl-6.25 text-caption text-text-muted",
              collapsed && "lg:hidden",
            )}
          >
            {section.types.map((typeGroup) => {
              const modulePath =
                section.item.href === "/lecturas"
                  ? "/modulos"
                  : section.item.href.replace(/\/lecturas$/, "/explorar-modulos");

              return (
                <p key={typeGroup} className="flex flex-wrap gap-x-1">
                  {typeGroup.split(" · ").map((type, index) => (
                    <Fragment key={type}>
                      {index > 0 && <span aria-hidden="true">·</span>}
                      <Link
                        href={`${modulePath}?sensor=${encodeURIComponent(type.toLowerCase())}`}
                        className="hover:text-primary hover:underline"
                      >
                        {type}
                      </Link>
                    </Fragment>
                  ))}
                </p>
              );
            })}
          </div>
        </div>
      ) : (
        <ul className="flex flex-col gap-1">
          {section.items.map((item) => (
            <li key={item.href} className={cn(collapsed && !item.icon && "lg:hidden")}>
              <NavRow
                item={item}
                active={isActive(pathname, item.href, roots)}
                collapsed={collapsed}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

type NavRowProps = {
  item: NavLink;
  active: boolean;
  collapsed: boolean;
  /** "Lecturas": alineada al borde izquierdo, sin relleno lateral. */
  flush?: boolean;
};

function NavRow({ item, active, collapsed, flush }: NavRowProps) {
  const Icon = item.icon;

  return (
    <Link
      href={item.href}
      title={collapsed ? item.label : undefined}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex h-9.5 items-center gap-2.5 rounded-md text-xs transition-colors",
        flush ? "gap-2.25 px-0" : "px-2.5",
        active
          ? "bg-primary-soft font-semibold text-primary"
          : "text-text hover:bg-surface-subtle",
        collapsed && "lg:justify-center lg:px-0",
      )}
    >
      {Icon && (
        <Icon
          className={cn("shrink-0", flush ? "size-4" : "size-4.5")}
          strokeWidth={1.6}
          aria-hidden
        />
      )}
      <span className={cn(collapsed && "lg:sr-only")}>{item.label}</span>
    </Link>
  );
}
