import type { LucideIcon } from "lucide-react";
import {
  Activity,
  ChartNoAxesColumn,
  Compass,
  Cpu,
  Inbox,
  LayoutDashboard,
  Users,
} from "lucide-react";

export type Role = "particular" | "identificado" | "coordinador" | "administrador";

export type NavLink = {
  label: string;
  href: string;
  /** Sin icono = solo aparece en el menú expandido. */
  icon?: LucideIcon;
};

export type NavSection =
  | { kind: "links"; title?: string; items: NavLink[] }
  | { kind: "readings"; title: string; item: NavLink; types: string[] };

export type SessionUser = {
  name: string;
  /** Texto bajo el nombre, antes de "Cerrar sesión". */
  roleLabel: string;
  initials: string;
};

export type ScopeCard = {
  title: string;
  description: string;
  /** Si existe, muestra el enlace "Mi cuenta →". */
  accountHref?: string;
};

export type RoleConfig = {
  basePath: string;
  scope: ScopeCard;
  sections: NavSection[];
};

const lecturas = (href: string): NavLink => ({ label: "Lecturas", href, icon: Activity });

const miEspacio = (base: string): NavSection => ({
  kind: "links",
  title: "MI ESPACIO",
  items: [
    { label: "Mi resumen", href: `${base}/resumen`, icon: LayoutDashboard },
    { label: "Mis módulos", href: `${base}/modulos`, icon: Cpu },
    { label: "Mis visualizaciones", href: `${base}/visualizaciones`, icon: ChartNoAxesColumn },
    { label: "Mis grupos", href: `${base}/grupos`, icon: Users },
    { label: "Mis solicitudes", href: `${base}/solicitudes`, icon: Inbox },
  ],
});

export const ROLES: Record<Role, RoleConfig> = {
  /* 01 · Usuario particular (sin sesión) */
  particular: {
    basePath: "",
    scope: {
      title: "Consulta pública",
      description: "Solo ves contenido de acceso público.",
    },
    sections: [
      {
        kind: "links",
        items: [
          { label: "Explorar", href: "/", icon: Compass },
          { label: "Grupos públicos", href: "/grupos", icon: Users },
          { label: "Módulos públicos", href: "/modulos", icon: Cpu },
        ],
      },
      {
        kind: "readings",
        title: "DATOS ACCESIBLES",
        item: lecturas("/lecturas"),
        types: ["Temperatura · Humedad", "Luz · Gas"],
      },
    ],
  },

  /* 02 · Usuario identificado */
  identificado: {
    basePath: "/espacio",
    scope: {
      title: "Mi espacio personal",
      description: "Gestionas tus módulos y puedes vincularte a un grupo.",
      accountHref: "/espacio/cuenta",
    },
    sections: [
      {
        kind: "links",
        items: [
          { label: "Explorar", href: "/espacio", icon: Compass },
          { label: "Grupos", href: "/espacio/explorar-grupos", icon: Users },
          { label: "Módulos", href: "/espacio/explorar-modulos", icon: Cpu },
        ],
      },
      {
        kind: "readings",
        title: "DATOS ACCESIBLES",
        item: lecturas("/espacio/lecturas"),
        types: ["Temperatura · Humedad", "Luz · Gas · Audio · Cámara"],
      },
      miEspacio("/espacio"),
    ],
  },

  /* 03 · Coordinador */
  coordinador: {
    basePath: "/coordinador",
    scope: {
      title: "Semillero aliado",
      description: "Tu gestión se limita a los grupos que coordinas.",
      accountHref: "/coordinador/cuenta",
    },
    sections: [
      {
        kind: "links",
        items: [
          { label: "Explorar", href: "/coordinador", icon: Compass },
          { label: "Grupos", href: "/coordinador/explorar-grupos", icon: Users },
          { label: "Módulos", href: "/coordinador/explorar-modulos", icon: Cpu },
        ],
      },
      miEspacio("/coordinador"),
      {
        kind: "links",
        title: "GESTIÓN DE MI GRUPO",
        items: [
          { label: "Resumen del grupo", href: "/coordinador/grupo/resumen" },
          { label: "Módulos del grupo", href: "/coordinador/grupo/modulos" },
          { label: "Miembros", href: "/coordinador/grupo/miembros" },
          { label: "Solicitudes del grupo", href: "/coordinador/grupo/solicitudes" },
          { label: "Configuración del grupo", href: "/coordinador/grupo/configuracion" },
          { label: "Registro de cambios", href: "/coordinador/grupo/cambios" },
        ],
      },
      {
        kind: "readings",
        title: "DATOS ACCESIBLES",
        item: lecturas("/coordinador/lecturas"),
        types: ["Temperatura · Humedad", "Luz · Gas · Audio · Cámara"],
      },
    ],
  },

  /* 04 · Administrador */
  administrador: {
    basePath: "/admin",
    scope: {
      title: "Administración",
      description: "Gestionas todos los grupos y cuentas.",
      accountHref: "/admin/cuenta",
    },
    sections: [
      {
        kind: "links",
        items: [
          { label: "Explorar", href: "/admin", icon: Compass },
          { label: "Grupos", href: "/admin/explorar-grupos", icon: Users },
          { label: "Módulos", href: "/admin/explorar-modulos", icon: Cpu },
        ],
      },
      {
        kind: "readings",
        title: "DATOS ACCESIBLES",
        item: lecturas("/admin/lecturas"),
        types: ["Temperatura · Humedad", "Luz · Gas"],
      },
      {
        kind: "links",
        title: "ADMINISTRACIÓN GLOBAL",
        items: [
          { label: "Resumen global", href: "/admin/resumen" },
          { label: "Usuarios y permisos", href: "/admin/usuarios" },
          { label: "Grupos", href: "/admin/grupos" },
          { label: "Módulos", href: "/admin/modulos" },
          { label: "Solicitudes", href: "/admin/solicitudes" },
          { label: "Catálogos", href: "/admin/catalogos" },
          { label: "Auditoría global", href: "/admin/auditoria" },
        ],
      },
    ],
  },
};
