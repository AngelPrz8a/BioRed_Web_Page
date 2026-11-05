"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  ClipboardList,
  FileClock,
  FolderKanban,
  Info,
  Radio,
  ShieldCheck,
  Users,
} from "lucide-react";
import { useMemo, useState, type FormEvent, type ReactNode } from "react";

type AccountStatus = "activa" | "inactiva" | "suspendida" | "pendiente";
type GlobalRole = "usuario" | "administrador";
type MembershipStatus = "activo" | "inactivo" | "pendiente";
type GroupRole = "miembro" | "coordinador";

export type AdminUser = {
  id_usuario: number;
  nombre: string;
  correo: string;
  rol_global: GlobalRole;
  estado_cuenta: AccountStatus;
  fecha_registro: string;
};

export type AdminMembership = {
  id_grupo_usuarios: number;
  id_usuario: number;
  id_grupo: number;
  estado: MembershipStatus;
  rol_grupo: GroupRole;
  fecha_ingreso: string;
  usuario?: string;
  grupo?: string;
};

export type AdminGroup = {
  id_grupo: number;
  nombre: string;
  descripcion: string | null;
  visibilidad: "publico" | "privado";
  fecha_creacion: string;
  member_count: number;
  public_module_count: number;
  active_module_count: number;
};

export type AdminRequest = {
  id_solicitud: number;
  id_solicitante: number;
  id_grupo: number | null;
  id_modulo: number | null;
  tipo: string;
  estado: string;
  fecha_creacion: string;
  fecha_resolucion: string | null;
  justificacion_solicitante: string | null;
  respuesta_resolucion: string | null;
  nivel_acceso_solicitado: string | null;
  rol_solicitado: string | null;
  nombre_solicitante: string;
  correo_solicitante: string;
  destino: string;
};

export type AdminModule = {
  id_modulo: number;
  grupo: string;
  visibilidad: string;
  sensores: string[];
};

export type AdminSensor = {
  id_sensor: number;
  id_modulo: number;
  tipo: string;
};

function messageFrom(body: unknown, fallback: string) {
  if (body && typeof body === "object" && "error" in body && typeof body.error === "string") {
    return body.error;
  }
  return fallback;
}

function PageHeader({
  eyebrow = "Administración",
  title,
  description,
  action,
}: {
  eyebrow?: string;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <header className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <p className="text-caption text-text-muted">{eyebrow}</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-text">{title}</h1>
        <p className="mt-1 max-w-3xl text-sm leading-6 text-text-muted">{description}</p>
      </div>
      {action}
    </header>
  );
}

function Notice({ children, tone = "info" }: { children: ReactNode; tone?: "info" | "warning" }) {
  return (
    <div
      className={`flex gap-2.5 rounded-md px-3.5 py-3 text-xs leading-[1.55] text-text ${
        tone === "warning" ? "border border-amber-200 bg-amber-50" : "bg-primary-soft"
      }`}
      role="note"
    >
      <Info className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
      <div>{children}</div>
    </div>
  );
}

function Panel({
  title,
  detail,
  action,
  children,
  className = "",
}: {
  title: ReactNode;
  detail?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`rounded-brand border border-border bg-surface p-4 sm:p-5 ${className}`}>
      <div className="mb-4 flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold text-text">{title}</h2>
          {detail && <p className="mt-1 text-xs leading-5 text-text-muted">{detail}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

function Metric({
  label,
  value,
  detail,
  icon: Icon,
}: {
  label: ReactNode;
  value: string | number;
  detail: string;
  icon: typeof Users;
}) {
  return (
    <div className="rounded-brand border border-border bg-surface p-4">
      <div className="flex items-center justify-between gap-2 text-xs text-text-muted">
        <span>{label}</span>
        <Icon className="size-4 text-primary" aria-hidden="true" />
      </div>
      <p className="mt-2 text-2xl font-semibold tracking-tight text-text">{value}</p>
      <p className="mt-1 text-micro text-text-muted">{detail}</p>
    </div>
  );
}

function StatusPill({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex rounded-full bg-primary-soft px-2.5 py-1 text-micro font-medium text-primary">
      {children}
    </span>
  );
}

function LinkButton({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link
      href={href}
      className="inline-flex min-h-9 items-center gap-2 rounded-md border border-border bg-surface px-3 text-xs font-semibold text-primary hover:border-primary"
    >
      {children}
      <ArrowRight className="size-3.5" aria-hidden="true" />
    </Link>
  );
}

export function AdminOverviewPage({
  users,
  memberships,
  groups,
  requests,
}: {
  users: AdminUser[];
  memberships: AdminMembership[];
  groups: AdminGroup[];
  requests: AdminRequest[];
}) {
  const activeUsers = users.filter((user) => user.estado_cuenta === "activa").length;
  const pendingRequests = requests.filter((request) => request.estado === "pendiente").length;
  const activeMemberships = memberships.filter((membership) => membership.estado === "activo").length;
  const recentUsers = [...users].sort((a, b) => b.fecha_registro.localeCompare(a.fecha_registro)).slice(0, 5);
  const recentRequests = requests
    .filter((request) => request.estado === "pendiente")
    .slice(0, 4);

  return (
    <div className="mx-auto w-full max-w-[1440px]">
      <PageHeader
        eyebrow="Administración / Resumen global"
        title="Administración global"
        description="Gestiona cuentas, membresías y grupos. Las acciones disponibles conservan su trazabilidad y respetan los permisos por contexto."
        action={<LinkButton href="/admin/usuarios">Gestionar cuentas</LinkButton>}
      />
      <Notice>
        <strong>Alcance global.</strong> El rol define las acciones de la cuenta; los grupos y sus
        membresías determinan el acceso contextual. Las etiquetas de perfil son descriptivas y no
        conceden permisos.
      </Notice>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Metric label={<Link className="hover:text-primary hover:underline" href="/admin/usuarios">Cuentas registradas</Link>} value={users.length} detail={`${activeUsers} activas`} icon={Users} />
        <Metric label={<Link className="hover:text-primary hover:underline" href="/admin/grupos">Grupos</Link>} value={groups.length} detail="Todos los grupos de la plataforma" icon={FolderKanban} />
        <Metric
          label={<Link className="hover:text-primary hover:underline" href="/admin/usuarios">Membresías activas</Link>}
          value={activeMemberships}
          detail="Relaciones usuario–grupo vigentes"
          icon={ShieldCheck}
        />
        <Metric
          label={<Link className="hover:text-primary hover:underline" href="/admin/solicitudes">Solicitudes de ingreso</Link>}
          value={pendingRequests.toString().padStart(2, "0")}
          detail="Pendientes para grupos"
          icon={ClipboardList}
        />
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[1.35fr_1fr]">
        <Panel
          title={<Link className="hover:text-primary hover:underline" href="/admin/usuarios">Cuentas de la plataforma</Link>}
          detail="Cuentas recientes y su estado de acceso."
          action={<LinkButton href="/admin/usuarios">Usuarios y permisos</LinkButton>}
        >
          <div className="overflow-x-auto">
            <table className="w-full min-w-[620px] border-collapse text-left text-xs">
              <thead className="bg-surface-subtle text-micro font-medium uppercase text-text-muted">
                <tr>
                  <th className="px-3 py-2">Usuario</th>
                  <th className="px-3 py-2">Estado</th>
                  <th className="px-3 py-2">Rol global</th>
                  <th className="px-3 py-2">Registro</th>
                </tr>
              </thead>
              <tbody>
                {recentUsers.map((user) => (
                  <tr key={user.id_usuario} className="border-b border-border last:border-0">
                    <td className="px-3 py-3">
                      <p className="font-semibold text-text">{user.nombre}</p>
                      <p className="mt-0.5 text-micro text-text-muted">{user.correo}</p>
                    </td>
                    <td className="px-3 py-3"><StatusPill>{user.estado_cuenta}</StatusPill></td>
                    <td className="px-3 py-3 text-text">{user.rol_global === "administrador" ? "Administrador" : "Usuario identificado"}</td>
                    <td className="px-3 py-3 text-text-muted">{user.fecha_registro}</td>
                  </tr>
                ))}
                {recentUsers.length === 0 && (
                  <tr><td className="px-3 py-6 text-center text-text-muted" colSpan={4}>No hay cuentas registradas.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </Panel>

        <Panel
          title={<Link className="hover:text-primary hover:underline" href="/admin/solicitudes">Solicitudes pendientes</Link>}
          detail="Ingresos a grupos, permisos de módulo y cambios de rol."
          action={<LinkButton href="/admin/solicitudes">Ver solicitudes</LinkButton>}
        >
          {recentRequests.length ? (
            <ul className="divide-y divide-border">
              {recentRequests.map((request) => (
                <li key={request.id_solicitud} className="py-3 first:pt-0 last:pb-0">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold text-text">{request.nombre_solicitante}</p>
                      <p className="mt-1 text-micro text-text-muted">{request.destino}</p>
                    </div>
                    <StatusPill>Pendiente</StatusPill>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="rounded-md bg-surface-subtle p-4 text-xs text-text-muted">
              No hay solicitudes de ingreso pendientes.
            </p>
          )}
        </Panel>

        <Panel title={<Link className="hover:text-primary hover:underline" href="/admin/resumen">Gestión global</Link>} detail="Operaciones respaldadas por la API disponible.">
          <div className="grid gap-3 sm:grid-cols-2">
            {[
              ["Cuentas y membresías", "Asignar roles globales y gestionar relaciones con grupos.", "/admin/usuarios"],
              ["Grupos", "Crear grupos y configurar su visibilidad.", "/admin/grupos"],
              ["Solicitudes", "Revisar ingresos, accesos a módulos y cambios de rol.", "/admin/solicitudes"],
              ["Módulos", "Consultar la cobertura de módulos que exponen los helpers actuales.", "/admin/modulos"],
            ].map(([title, detail, href]) => (
              <Link key={href} href={href} className="rounded-md border border-border p-3 hover:border-primary">
                <p className="text-xs font-semibold text-text">{title}</p>
                <p className="mt-1 text-micro leading-5 text-text-muted">{detail}</p>
              </Link>
            ))}
          </div>
        </Panel>

        <Panel title={<Link className="hover:text-primary hover:underline" href="/admin/auditoria">Auditoría global</Link>} detail="La bitácora se conserva como registro de solo lectura.">
          <p className="text-xs leading-5 text-text-muted">
            El esquema incluye eventos de auditoría, pero la aplicación no ofrece todavía una
            consulta administrativa para recuperarlos. No se muestran eventos inventados ni se
            permite alterar registros desde esta pantalla.
          </p>
          <div className="mt-3"><LinkButton href="/admin/auditoria">Consultar disponibilidad</LinkButton></div>
        </Panel>
      </div>
    </div>
  );
}

function AccountControls({ user }: { user: AdminUser }) {
  const router = useRouter();
  const [role, setRole] = useState(user.rol_global);
  const [status, setStatus] = useState(user.estado_cuenta);
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setNotice("");
    try {
      const response = await fetch(`/api/admin/users/${user.id_usuario}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rol_global: role, estado_cuenta: status }),
      });
      const body: unknown = await response.json();
      if (!response.ok) throw new Error(messageFrom(body, "No se pudo actualizar la cuenta."));
      setNotice("Cambios guardados.");
      router.refresh();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "No se pudo actualizar la cuenta.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={save} className="grid gap-2 sm:grid-cols-[1fr_150px_150px_auto] sm:items-center">
      <div className="min-w-0">
        <p className="truncate text-xs font-semibold text-text">{user.nombre}</p>
        <p className="truncate text-micro text-text-muted">{user.correo}</p>
        {notice && <p role="status" className="mt-1 text-micro text-primary">{notice}</p>}
      </div>
      <label className="flex flex-col gap-1 text-micro text-text-muted">
        Rol global
        <select value={role} onChange={(event) => setRole(event.target.value as GlobalRole)} className="h-9 rounded-md border border-border bg-surface px-2 text-xs text-text">
          <option value="usuario">Usuario</option>
          <option value="administrador">Administrador</option>
        </select>
      </label>
      <label className="flex flex-col gap-1 text-micro text-text-muted">
        Estado
        <select value={status} onChange={(event) => setStatus(event.target.value as AccountStatus)} className="h-9 rounded-md border border-border bg-surface px-2 text-xs text-text">
          <option value="activa">Activa</option>
          <option value="pendiente">Pendiente</option>
          <option value="suspendida">Suspendida</option>
          <option value="inactiva">Inactiva</option>
        </select>
      </label>
      <button type="submit" disabled={busy || (role === user.rol_global && status === user.estado_cuenta)} className="min-h-9 rounded-md bg-primary px-3 text-xs font-semibold text-white disabled:opacity-50">
        {busy ? "Guardando…" : "Guardar"}
      </button>
    </form>
  );
}

function MembershipControls({ membership }: { membership: AdminMembership }) {
  const router = useRouter();
  const [role, setRole] = useState(membership.rol_grupo);
  const [status, setStatus] = useState(membership.estado);
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setNotice("");
    try {
      const response = await fetch(`/api/admin/memberships/${membership.id_grupo_usuarios}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rol_grupo: role, estado: status }),
      });
      const body: unknown = await response.json();
      if (!response.ok) throw new Error(messageFrom(body, "No se pudo actualizar la membresía."));
      setNotice("Guardada.");
      router.refresh();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "No se pudo actualizar la membresía.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={save} className="flex flex-wrap items-end gap-2">
      <label className="flex flex-col gap-1 text-micro text-text-muted">
        Rol en grupo
        <select value={role} onChange={(event) => setRole(event.target.value as GroupRole)} className="h-8 rounded-md border border-border bg-surface px-2 text-xs text-text">
          <option value="miembro">Miembro</option>
          <option value="coordinador">Coordinador</option>
        </select>
      </label>
      <label className="flex flex-col gap-1 text-micro text-text-muted">
        Estado
        <select value={status} onChange={(event) => setStatus(event.target.value as MembershipStatus)} className="h-8 rounded-md border border-border bg-surface px-2 text-xs text-text">
          <option value="activo">Activo</option>
          <option value="pendiente">Pendiente</option>
          <option value="inactivo">Inactivo</option>
        </select>
      </label>
      <button type="submit" disabled={busy || (role === membership.rol_grupo && status === membership.estado)} className="h-8 rounded-md border border-border px-3 text-xs font-semibold text-primary disabled:opacity-50">
        {busy ? "…" : "Guardar"}
      </button>
      {notice && <p role="status" className="w-full text-micro text-text-muted">{notice}</p>}
    </form>
  );
}

function CreateMembershipForm({ users, groups }: { users: AdminUser[]; groups: AdminGroup[] }) {
  const router = useRouter();
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);

  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setNotice("");
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    try {
      const response = await fetch("/api/admin/memberships", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id_usuario: Number(form.get("user")),
          id_grupo: Number(form.get("group")),
          rol_grupo: form.get("role"),
          estado: form.get("status"),
        }),
      });
      const body: unknown = await response.json();
      if (!response.ok) throw new Error(messageFrom(body, "No se pudo crear la membresía."));
      setNotice("Membresía creada.");
      formElement.reset();
      router.refresh();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "No se pudo crear la membresía.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={create} className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <label className="flex flex-col gap-1.5 text-caption text-text-muted">
        Cuenta
        <select required name="user" defaultValue="" className="h-10 rounded-md border border-border bg-surface px-3 text-xs text-text">
          <option value="" disabled>Selecciona una cuenta</option>
          {users.map((user) => <option key={user.id_usuario} value={user.id_usuario}>{user.nombre} · {user.estado_cuenta}</option>)}
        </select>
      </label>
      <label className="flex flex-col gap-1.5 text-caption text-text-muted">
        Grupo
        <select required name="group" defaultValue="" className="h-10 rounded-md border border-border bg-surface px-3 text-xs text-text">
          <option value="" disabled>Selecciona un grupo</option>
          {groups.map((group) => <option key={group.id_grupo} value={group.id_grupo}>{group.nombre}</option>)}
        </select>
      </label>
      <label className="flex flex-col gap-1.5 text-caption text-text-muted">
        Rol del grupo
        <select name="role" defaultValue="miembro" className="h-10 rounded-md border border-border bg-surface px-3 text-xs text-text">
          <option value="miembro">Miembro</option>
          <option value="coordinador">Coordinador</option>
        </select>
      </label>
      <label className="flex flex-col gap-1.5 text-caption text-text-muted">
        Estado inicial
        <select name="status" defaultValue="activo" className="h-10 rounded-md border border-border bg-surface px-3 text-xs text-text">
          <option value="activo">Activo</option>
          <option value="pendiente">Pendiente</option>
          <option value="inactivo">Inactivo</option>
        </select>
      </label>
      <div className="sm:col-span-2 xl:col-span-4">
        <button type="submit" disabled={busy || !users.length || !groups.length} className="min-h-9 rounded-md bg-primary px-4 text-xs font-semibold text-white disabled:opacity-50">
          {busy ? "Creando…" : "Asignar membresía"}
        </button>
        {notice && <p role="status" className="mt-2 text-xs text-text-muted">{notice}</p>}
      </div>
    </form>
  );
}

export function AdminUsersPage({
  users,
  memberships,
  groups,
}: {
  users: AdminUser[];
  memberships: AdminMembership[];
  groups: AdminGroup[];
}) {
  const [filter, setFilter] = useState("");
  const filteredUsers = useMemo(() => {
    const term = filter.trim().toLocaleLowerCase("es");
    return users.filter((user) => !term || `${user.nombre} ${user.correo}`.toLocaleLowerCase("es").includes(term));
  }, [filter, users]);

  return (
    <div className="mx-auto w-full max-w-[1440px]">
      <PageHeader
        eyebrow="Administración / Usuarios y permisos"
        title="Usuarios y permisos"
        description="Administra las cuentas y sus relaciones con grupos. El rol de coordinador es una membresía de grupo, no un rol global."
      />
      <Notice>Las etiquetas de perfil describen a la persona y no otorgan permisos. Las reglas de protección impiden suspender o degradar al último administrador activo y retirar al último coordinador de un grupo.</Notice>
      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <Metric label="Cuentas" value={users.length} detail="Perfiles de la plataforma" icon={Users} />
        <Metric label="Administradores activos" value={users.filter((user) => user.rol_global === "administrador" && user.estado_cuenta === "activa").length} detail="Protección del último administrador" icon={ShieldCheck} />
        <Metric label="Membresías" value={memberships.length} detail="Relaciones con grupos" icon={FolderKanban} />
      </div>

      <Panel title="Cuentas de la plataforma" detail={`${filteredUsers.length} de ${users.length} cuentas`} className="mt-4">
        <label className="mb-4 flex max-w-lg flex-col gap-1.5 text-caption text-text-muted">
          Buscar cuenta
          <input value={filter} onChange={(event) => setFilter(event.target.value)} placeholder="Nombre o correo…" className="h-10 rounded-md border border-border bg-surface px-3 text-xs text-text placeholder:text-text-muted" />
        </label>
        <div className="divide-y divide-border">
          {filteredUsers.map((user) => (
            <div key={user.id_usuario} className="py-3 first:pt-0 last:pb-0">
              <AccountControls user={user} />
            </div>
          ))}
          {!filteredUsers.length && <p className="py-6 text-center text-xs text-text-muted">No se encontraron cuentas.</p>}
        </div>
      </Panel>

      <Panel title="Asignar membresía" detail="La membresía vincula una cuenta a un grupo y define su rol contextual." className="mt-4">
        {users.length && groups.length ? (
          <CreateMembershipForm users={users} groups={groups} />
        ) : (
          <p className="text-xs text-text-muted">Se requiere al menos una cuenta y un grupo para asignar membresías.</p>
        )}
      </Panel>

      <Panel title="Membresías registradas" detail={`${memberships.length} relaciones usuario–grupo`} className="mt-4">
        <div className="divide-y divide-border">
          {memberships.map((membership) => (
            <div key={membership.id_grupo_usuarios} className="grid gap-3 py-3 first:pt-0 last:pb-0 xl:grid-cols-[minmax(190px,0.8fr)_minmax(150px,0.6fr)_minmax(360px,1.3fr)] xl:items-center">
              <div>
                <p className="text-xs font-semibold text-text">{membership.usuario ?? `Cuenta ${membership.id_usuario}`}</p>
                <p className="mt-0.5 text-micro text-text-muted">{membership.grupo ?? `Grupo ${membership.id_grupo}`}</p>
              </div>
              <p className="text-micro text-text-muted">Ingreso: {membership.fecha_ingreso}</p>
              <MembershipControls membership={membership} />
            </div>
          ))}
          {!memberships.length && <p className="py-6 text-center text-xs text-text-muted">Aún no hay membresías.</p>}
        </div>
      </Panel>
    </div>
  );
}

export function AdminAuditPage({
  users,
  groups,
  memberships,
}: {
  users: AdminUser[];
  groups: AdminGroup[];
  memberships: AdminMembership[];
}) {
  return (
    <div className="mx-auto w-full max-w-[1440px]">
      <PageHeader
        eyebrow="Administración / Auditoría global"
        title="Auditoría global"
        description="La bitácora debe ser de solo lectura y conservar los valores históricos de cada operación."
        action={<LinkButton href="/admin">Administración</LinkButton>}
      />
      <Notice tone="warning">
        <strong>Consulta no disponible.</strong> El modelo define la tabla de auditoría y las
        operaciones de gobernanza registran cambios, pero hoy no existe un helper ni endpoint
        administrativo para consultar sus eventos. Esta pantalla no inventa filas ni habilita
        edición o borrado del registro.
      </Notice>
      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <Metric label="Cobertura de cuentas" value={users.length} detail="Registros actuales; no equivale a eventos" icon={Users} />
        <Metric label="Cobertura de grupos" value={groups.length} detail="Registros actuales; no equivale a eventos" icon={FolderKanban} />
        <Metric label="Membresías actuales" value={memberships.length} detail="Estado presente, no historial de cambios" icon={FileClock} />
      </div>
      <Panel title="Registro global" detail="Eventos disponibles: no consultables desde la API actual." className="mt-4">
        <div className="rounded-md border border-dashed border-border bg-surface-subtle p-6 text-center">
          <FileClock className="mx-auto size-7 text-text-muted" aria-hidden="true" />
          <p className="mt-3 text-sm font-semibold text-text">No se muestran eventos de auditoría</p>
          <p className="mx-auto mt-1 max-w-2xl text-xs leading-5 text-text-muted">
            Aunque existe una tabla de auditoría en el modelo, este slice no tiene una función de
            lectura autorizada para consultar fecha, responsable, entidad y cambios. Implementar
            esa consulta requiere exponerla mediante el almacén de servidor antes de mostrar
            registros aquí.
          </p>
        </div>
      </Panel>
      <p className="mt-3 text-micro text-text-muted">
        La auditoría es inmutable en la interfaz; los cambios de cuenta, membresía y grupo siguen
        registrándose en las operaciones servidoras existentes.
      </p>
    </div>
  );
}

export function AdminModulesPage({ modules }: { modules: AdminModule[] }) {
  return (
    <div className="mx-auto w-full max-w-[1440px]">
      <PageHeader
        eyebrow="Administración / Módulos"
        title="Módulos globales"
        description="Consulta los módulos que los helpers actuales hacen visibles al administrador."
        action={<StatusPill>Consulta limitada</StatusPill>}
      />
      <Notice tone="warning">
        El backend administrativo no expone una operación global de módulos ni un helper que
        devuelva propietarios, inventario completo o estado de transmisión. Esta lista cubre los
        módulos de grupos y los módulos sin grupo publicados; no se ofrecen cambios de firmware,
        sensores, propietario ni configuración que la API no respalda.
      </Notice>
      <Panel title="Módulos visibles" detail={`${modules.length} registros consultables`} className="mt-4">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[600px] border-collapse text-left text-xs">
            <thead className="bg-surface-subtle text-micro font-medium uppercase text-text-muted">
              <tr><th className="px-3 py-2">Módulo</th><th className="px-3 py-2">Grupo</th><th className="px-3 py-2">Visibilidad</th><th className="px-3 py-2">Sensores registrados</th></tr>
            </thead>
            <tbody>
              {modules.map((module) => (
                <tr key={module.id_modulo} className="border-b border-border last:border-0">
                  <td className="px-3 py-3 font-semibold text-text">Módulo {module.id_modulo}</td>
                  <td className="px-3 py-3 text-text">{module.grupo}</td>
                  <td className="px-3 py-3"><StatusPill>{module.visibilidad}</StatusPill></td>
                  <td className="px-3 py-3 text-text-muted">{module.sensores.length ? module.sensores.join(", ") : "Sin sensores registrados"}</td>
                </tr>
              ))}
              {!modules.length && <tr><td colSpan={4} className="px-3 py-8 text-center text-text-muted">No hay módulos visibles mediante los helpers disponibles.</td></tr>}
            </tbody>
          </table>
        </div>
      </Panel>
      <div className="mt-4 flex items-start gap-2 rounded-md border border-border bg-surface p-3 text-xs leading-5 text-text-muted">
        <Radio className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
        <p>La base no ofrece telemetría ni un estado de conexión verificable aquí. La propiedad y la configuración física del dispositivo no se modifican desde BioRed.</p>
      </div>
    </div>
  );
}

export function AdminRequestsPage({ requests }: { requests: AdminRequest[] }) {
  const [filter, setFilter] = useState("");
  const pendingCount = requests.filter((request) => request.estado === "pendiente").length;
  const filteredRequests = useMemo(() => {
    const term = filter.trim().toLocaleLowerCase("es");
    return requests.filter((request) =>
      !term || `${request.nombre_solicitante} ${request.correo_solicitante} ${request.destino} ${request.tipo}`.toLocaleLowerCase("es").includes(term),
    );
  }, [filter, requests]);

  return (
    <div className="mx-auto w-full max-w-[1440px]">
      <PageHeader
        eyebrow="Administración / Solicitudes"
        title="Solicitudes globales"
        description="Revisa solicitudes de ingreso, acceso a módulos y cambios de rol. Las aprobaciones actualizan las relaciones de gobernanza en la base de datos."
        action={<StatusPill>{pendingCount} pendientes</StatusPill>}
      />
      <Notice>
        La aprobación de ingreso crea o reactiva una membresía; la de módulo crea un permiso de
        acceso; y la de cambio de rol actualiza la membresía existente. La habilitación para crear
        grupos no está modelada como tipo de solicitud en el esquema actual.
      </Notice>
      <Panel title="Solicitudes" detail={`${filteredRequests.length} registros`} className="mt-4">
        <label className="mb-4 flex max-w-lg flex-col gap-1.5 text-caption text-text-muted">
          Buscar solicitante o grupo
          <input value={filter} onChange={(event) => setFilter(event.target.value)} placeholder="Nombre, correo o grupo…" className="h-10 rounded-md border border-border bg-surface px-3 text-xs text-text" />
        </label>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[880px] border-collapse text-left text-xs">
            <thead className="bg-surface-subtle text-micro font-medium uppercase text-text-muted">
              <tr><th className="px-3 py-2">Solicitante</th><th className="px-3 py-2">Tipo y recurso</th><th className="px-3 py-2">Enviada</th><th className="px-3 py-2">Motivo</th><th className="px-3 py-2">Estado y decisión</th></tr>
            </thead>
            <tbody>
              {filteredRequests.map((request) => (
                <tr key={request.id_solicitud} className="border-b border-border align-top last:border-0">
                  <td className="px-3 py-3">
                    <p className="font-semibold text-text">{request.nombre_solicitante}</p>
                    <p className="mt-0.5 text-micro text-text-muted">{request.correo_solicitante}</p>
                  </td>
                  <td className="px-3 py-3 text-text">
                    <p className="font-medium">{requestTypeLabel(request.tipo)}</p>
                    <p className="mt-1 text-micro text-text-muted">{request.destino}</p>
                    {request.nivel_acceso_solicitado && <p className="mt-1 text-micro text-text-muted">Nivel: {request.nivel_acceso_solicitado}</p>}
                    {request.rol_solicitado && <p className="mt-1 text-micro text-text-muted">Rol: {request.rol_solicitado}</p>}
                  </td>
                  <td className="px-3 py-3 text-text-muted">{request.fecha_creacion}</td>
                  <td className="max-w-64 px-3 py-3 leading-5 text-text-muted">{request.justificacion_solicitante || "Sin motivo indicado."}</td>
                  <td className="px-3 py-3">
                    <div className="flex flex-col items-start gap-2">
                      <StatusPill>{request.estado}</StatusPill>
                      {request.estado === "pendiente" && (
                        <RequestDecision requestId={request.id_solicitud} />
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {!filteredRequests.length && <tr><td colSpan={5} className="px-3 py-8 text-center text-text-muted">No hay solicitudes que coincidan con el filtro.</td></tr>}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}

function requestTypeLabel(type: string) {
  if (type === "ingreso_grupo") return "Ingreso a grupo";
  if (type === "acceso_modulo") return "Acceso a módulo";
  if (type === "cambio_rol_grupo") return "Cambio de rol";
  return type;
}

function RequestDecision({ requestId }: { requestId: number }) {
  const router = useRouter();
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);

  async function decide(decision: "aprobada" | "rechazada") {
    setBusy(true);
    setNotice("");
    try {
      const response = await fetch(`/api/admin/requests/${requestId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decision }),
      });
      const body: unknown = await response.json();
      if (!response.ok) throw new Error(messageFrom(body, "No se pudo resolver la solicitud."));
      router.refresh();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "No se pudo resolver la solicitud.");
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-wrap gap-1.5">
      <button type="button" disabled={busy} onClick={() => decide("aprobada")} className="min-h-8 rounded-md bg-primary px-2.5 text-micro font-semibold text-white disabled:opacity-50">Aprobar</button>
      <button type="button" disabled={busy} onClick={() => decide("rechazada")} className="min-h-8 rounded-md border border-border px-2.5 text-micro font-semibold text-text disabled:opacity-50">Rechazar</button>
      {notice && <p role="status" className="basis-full text-micro text-text-muted">{notice}</p>}
    </div>
  );
}

export function AdminCatalogsPage({ sensors }: { sensors: AdminSensor[] }) {
  const typeCounts = new Map<string, number>();
  for (const sensor of sensors) typeCounts.set(sensor.tipo, (typeCounts.get(sensor.tipo) ?? 0) + 1);
  const sensorTypes = [...typeCounts.entries()].sort(([a], [b]) => a.localeCompare(b, "es"));

  return (
    <div className="mx-auto w-full max-w-[1440px]">
      <PageHeader
        eyebrow="Administración / Catálogos"
        title="Catálogos y etiquetas"
        description="Consulta los tipos de sensor que se pueden leer en el catálogo público actual."
        action={<StatusPill>Solo consulta</StatusPill>}
      />
      <Notice>
        Las etiquetas de perfil y los detalles descriptivos de los sensores no están expuestos por
        los helpers de gobernanza. El esquema guarda nombres de etiquetas, pero no una descripción
        administrable; el catálogo de sensores se deriva de los sensores asociados a módulos
        públicos. Por eso esta vista no inventa ni guarda cambios de catálogo.
      </Notice>
      <div className="mt-4 grid gap-4 xl:grid-cols-[1fr_1.2fr]">
        <Panel title="Tipos de sensor publicados" detail={`${sensorTypes.length} tipos · ${sensors.length} sensores asociados`}>
          <div className="divide-y divide-border">
            {sensorTypes.map(([type, count]) => (
              <div key={type} className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
                <div>
                  <p className="text-xs font-semibold text-text">{type}</p>
                  <p className="mt-0.5 text-micro text-text-muted">Tipo registrado en el modelo de sensor</p>
                </div>
                <StatusPill>{count} {count === 1 ? "sensor" : "sensores"}</StatusPill>
              </div>
            ))}
            {!sensorTypes.length && <p className="py-6 text-center text-xs text-text-muted">No hay sensores publicados disponibles en este catálogo.</p>}
          </div>
        </Panel>
        <Panel title="Sensores del catálogo público" detail="Datos de sensores reales asociados a módulos que se exponen en el catálogo.">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[440px] border-collapse text-left text-xs">
              <thead className="bg-surface-subtle text-micro font-medium uppercase text-text-muted">
                <tr><th className="px-3 py-2">Sensor</th><th className="px-3 py-2">Módulo</th><th className="px-3 py-2">Tipo</th></tr>
              </thead>
              <tbody>
                {sensors.map((sensor) => (
                  <tr key={sensor.id_sensor} className="border-b border-border last:border-0">
                    <td className="px-3 py-3 text-text">#{sensor.id_sensor}</td>
                    <td className="px-3 py-3 text-text">Módulo {sensor.id_modulo}</td>
                    <td className="px-3 py-3 text-text-muted">{sensor.tipo}</td>
                  </tr>
                ))}
                {!sensors.length && <tr><td colSpan={3} className="px-3 py-6 text-center text-text-muted">No hay sensores disponibles.</td></tr>}
              </tbody>
            </table>
          </div>
        </Panel>
      </div>
      <div className="mt-4 flex items-start gap-2 rounded-md border border-border bg-surface p-3 text-xs leading-5 text-text-muted">
        <ClipboardList className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
        <p>El modelo actual almacena los tipos e identificadores de los sensores, pero no lecturas ni nombres descriptivos de módulos.</p>
      </div>
    </div>
  );
}
