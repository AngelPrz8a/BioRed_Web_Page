import Link from "next/link";
import { notFound } from "next/navigation";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import {
  getGroupDetailForUser,
  listGroupsForUser,
  listManagedGroups,
  type AuthenticatedUser,
  type GroupDetailData,
  type GroupWorkspaceItem,
} from "@/lib/server/auth-store";
import { getSessionUser } from "@/lib/server/authorization";
import {
  AdminGroupEditor,
  GroupJoinForm,
  GroupJoinRequestDecision,
  GroupMembershipStatusControl,
} from "./GroupActions";

type AppRole = "particular" | "identificado" | "coordinador" | "administrador";
type GroupScope = "public" | "member" | "coordinator" | "all";

const roleBase: Record<AppRole, string> = {
  particular: "",
  identificado: "/espacio",
  coordinador: "/coordinador",
  administrador: "/admin",
};

function directoryPath(role: AppRole, scope: GroupScope) {
  const base = roleBase[role];
  if (scope === "public") return role === "particular" ? "/grupos" : `${base}/explorar-grupos`;
  if (scope === "member") return `${base}/grupos`;
  return `${base}/grupos`;
}

function groupPath(role: AppRole, groupId: number) {
  const base = roleBase[role];
  return role === "particular"
    ? `/grupos/${groupId}`
    : `${base}/grupos/${groupId}`;
}

function directoryGroupPath(role: AppRole, scope: GroupScope, groupId: number) {
  if (role === "coordinador" && scope === "public") {
    return `${roleBase.coordinador}/explorar-grupos/${groupId}`;
  }
  return groupPath(role, groupId);
}

function modulePath(
  role: AppRole,
  module: GroupDetailData["modules"][number],
) {
  if (role === "particular") return `/modulos/${module.id_modulo}`;
  const base = roleBase[role];
  return module.visibilidad === "publico"
    ? `${base}/explorar-modulos/${module.id_modulo}`
    : `${base}/modulos/privados/${module.id_modulo}`;
}

function visibilityLabel(visibility: "publico" | "privado") {
  return visibility === "publico" ? "Público" : "Privado";
}

function formatCreatedAt(value: string) {
  const parsed = new Date(value.replace(" ", "T") + (value.includes("Z") ? "" : "Z"));
  if (Number.isNaN(parsed.getTime())) return value;
  return new Intl.DateTimeFormat("es-CO", { dateStyle: "medium" }).format(parsed);
}

function GroupCards({
  groups,
  role,
  scope,
  showJoin,
}: {
  groups: GroupWorkspaceItem[];
  role: AppRole;
  scope: GroupScope;
  showJoin: boolean;
}) {
  if (!groups.length) {
    return (
      <div className="rounded-[0.625rem] border border-dashed border-border bg-surface p-8 text-center">
        <p className="text-sm font-semibold text-text">Aún no hay grupos para mostrar</p>
        <p className="mt-1.5 text-xs text-text-muted">
          Prueba la exploración pública o revisa tus filtros de acceso.
        </p>
      </div>
    );
  }
  return (
    <div className="grid gap-4 xl:grid-cols-2">
      {groups.map((group) => (
        <article
          key={group.id_grupo}
          className="flex min-w-0 flex-col gap-4 rounded-[0.625rem] border border-border bg-surface p-4 sm:p-5"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h2 className="text-base font-semibold text-text">
                <Link
                  href={directoryGroupPath(role, scope, group.id_grupo)}
                  className="hover:text-primary hover:underline"
                >
                  {group.nombre}
                </Link>
              </h2>
              <p className="mt-1.5 text-xs leading-[1.55] text-text-muted">
                {group.descripcion || "Este grupo aún no tiene descripción."}
              </p>
            </div>
            <span className="shrink-0 rounded-full bg-primary-soft px-2.5 py-1 text-micro font-semibold text-primary">
              {visibilityLabel(group.visibilidad)}
            </span>
          </div>

          <dl className="grid grid-cols-2 gap-3 rounded-md bg-surface-subtle p-3 text-caption">
            <div>
              <dt className="text-text-muted">Miembros activos</dt>
              <dd className="mt-1 font-semibold text-text">{group.member_count}</dd>
            </div>
            <div>
              <dt className="text-text-muted">Módulos públicos</dt>
              <dd className="mt-1 font-semibold text-text">{group.public_module_count}</dd>
            </div>
          </dl>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-3">
            <p className="text-caption text-text-muted">
              Creado {formatCreatedAt(group.fecha_creacion)}
              {group.my_role === "coordinador" && " · Coordinas este grupo"}
              {group.my_role === "miembro" && " · Eres miembro"}
              {group.my_status === "pendiente" && " · Membresía pendiente"}
            </p>
            <Link
              href={directoryGroupPath(role, scope, group.id_grupo)}
              className="text-xs font-semibold text-primary hover:underline"
            >
              Ver grupo →
            </Link>
          </div>

          {showJoin && group.my_status !== "activo" && group.my_status !== "pendiente" && (
            <GroupJoinForm groupId={group.id_grupo} membershipStatus={group.my_status} />
          )}
        </article>
      ))}
    </div>
  );
}

export async function GroupDirectoryPage({
  role,
  scope,
}: {
  role: AppRole;
  scope: GroupScope;
}) {
  const user = role === "particular" ? null : await getSessionUser();
  const groups = await listGroupsForUser(user, scope);
  const path = directoryPath(role, scope);
  const title =
    scope === "public"
      ? "Grupos públicos"
      : scope === "member"
        ? "Mis grupos"
        : scope === "coordinator"
          ? "Grupos que coordino"
          : "Administrar grupos";
  const showJoin = role === "identificado" && scope === "public";

  return (
    <section className="flex w-full flex-col gap-6">
      <header className="flex flex-col gap-2.5">
        <Breadcrumbs
          items={[
            { label: "Explorar", href: role === "particular" ? "/" : roleBase[role] },
            { label: title },
          ]}
        />
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-[1.8125rem] leading-normal tracking-[-0.05rem] text-text">{title}</h1>
          <p className="text-xs text-primary">
            {groups.length} {groups.length === 1 ? "grupo" : "grupos"}
          </p>
        </div>
        <p className="max-w-3xl text-[0.8125rem] leading-[1.55] text-text-muted">
          {scope === "public"
            ? "Consulta los grupos cuya visibilidad es pública. La información privada solo aparece para sus miembros y administradores."
            : scope === "member"
              ? "Aquí aparecen los grupos donde tienes una membresía activa o pendiente."
              : scope === "coordinator"
                ? "Gestiona únicamente los grupos donde tienes una membresía activa como coordinador."
                : "Consulta y administra todos los grupos, sus estados de visibilidad y las membresías."}
        </p>
      </header>

      {scope === "all" && role === "administrador" && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-md bg-primary-soft p-4">
          <p className="text-xs text-text">
            Los cambios de nombre, descripción y visibilidad quedan registrados en auditoría.
          </p>
          <Link
            href="/admin/grupos/nuevo"
            className="inline-flex min-h-9 items-center justify-center rounded-md bg-primary px-4 text-xs font-semibold text-surface hover-bright"
          >
            Crear grupo
          </Link>
        </div>
      )}

      <GroupCards groups={groups} role={role} scope={scope} showJoin={showJoin} />
    </section>
  );
}

function GroupModules({ data, role }: { data: GroupDetailData; role: AppRole }) {
  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-base font-semibold text-text">Módulos del grupo</h2>
        <span className="text-caption text-text-muted">{data.modules.length} visibles para ti</span>
      </div>
      {data.modules.length ? (
        <div className="overflow-x-auto rounded-[0.625rem] border border-border bg-surface">
          <table className="w-full min-w-[36rem] border-collapse text-left">
            <thead className="bg-surface-subtle text-micro uppercase text-text-muted">
              <tr>
                <th scope="col" className="px-4 py-3">Módulo</th>
                <th scope="col" className="px-4 py-3">Sensores</th>
                <th scope="col" className="px-4 py-3">Visibilidad</th>
                <th scope="col" className="px-4 py-3">Ubicación</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {data.modules.map((module) => (
                <tr key={module.id_modulo} className="text-xs text-text">
                  <td className="px-4 py-3.5">
                    <Link
                      href={modulePath(role, module)}
                      className="font-semibold hover:text-primary hover:underline"
                    >
                      {module.label}
                    </Link>
                  </td>
                  <td className="px-4 py-3.5 text-text-muted">{module.sensors.join(" · ") || "Sin sensores"}</td>
                  <td className="px-4 py-3.5 text-text-muted">{visibilityLabel(module.visibilidad === "privado" ? "privado" : "publico")}</td>
                  <td className="px-4 py-3.5 text-text-muted">{module.location}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="rounded-md border border-dashed border-border bg-surface p-5 text-xs text-text-muted">
          No hay módulos visibles para tu nivel de acceso.
        </div>
      )}
    </section>
  );
}

function GroupGovernance({
  data,
  showMembers = true,
  showRequests = true,
}: {
  data: GroupDetailData;
  showMembers?: boolean;
  showRequests?: boolean;
}) {
  if (!data.canManage) return null;
  const pendingRequests = data.requests.filter((request) => request.estado === "pendiente");
  return (
    <div className="grid min-w-0 gap-4 xl:grid-cols-2">
      {showMembers && <section className="flex min-w-0 flex-col gap-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-base font-semibold text-text">Membresías</h2>
          <span className="text-caption text-text-muted">{data.members.length} registros</span>
        </div>
        {data.members.length ? (
          <div className="overflow-x-auto rounded-[0.625rem] border border-border bg-surface">
            <table className="w-full min-w-[34rem] border-collapse text-left">
              <thead className="bg-surface-subtle text-micro uppercase text-text-muted">
                <tr>
                  <th scope="col" className="px-3 py-3">Persona</th>
                  <th scope="col" className="px-3 py-3">Rol</th>
                  <th scope="col" className="px-3 py-3">Estado</th>
                  <th scope="col" className="px-3 py-3">Acceso</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {data.members.map((member) => (
                  <tr key={member.id_grupo_usuarios} className="text-xs text-text">
                    <td className="px-3 py-3">
                      <p className="font-semibold">{member.nombre_usuario}</p>
                      <p className="mt-1 text-caption text-text-muted">{member.correo_usuario}</p>
                    </td>
                    <td className="px-3 py-3 text-text-muted">
                      {member.rol_grupo === "coordinador" ? "Coordinador" : "Miembro"}
                    </td>
                    <td className="px-3 py-3 text-text-muted">{member.estado}</td>
                    <td className="px-3 py-3">
                      <GroupMembershipStatusControl
                        groupId={data.group.id_grupo}
                        membershipId={member.id_grupo_usuarios}
                        status={member.estado}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="rounded-md bg-surface p-4 text-xs text-text-muted">Este grupo aún no tiene membresías.</p>
        )}
      </section>}

      {showRequests && <section className="flex min-w-0 flex-col gap-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-base font-semibold text-text">Solicitudes de ingreso</h2>
          <span className="text-caption text-text-muted">{pendingRequests.length} pendientes</span>
        </div>
        {pendingRequests.length ? (
          <div className="flex flex-col gap-3">
            {pendingRequests.map((request) => (
              <article
                key={request.id_solicitud}
                className="flex flex-col gap-3 rounded-[0.625rem] border border-border bg-surface p-4"
              >
                <div>
                  <p className="text-sm font-semibold text-text">{request.nombre_solicitante}</p>
                  <p className="mt-1 text-caption text-text-muted">{request.correo_solicitante}</p>
                  <p className="mt-2 text-xs leading-[1.55] text-text-muted">
                    {request.justificacion_solicitante || "No se incluyó una justificación."}
                  </p>
                </div>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-micro text-text-muted">{formatCreatedAt(request.fecha_creacion)}</span>
                  <GroupJoinRequestDecision
                    groupId={data.group.id_grupo}
                    requestId={request.id_solicitud}
                  />
                </div>
              </article>
            ))}
          </div>
        ) : (
          <p className="rounded-md bg-surface p-4 text-xs text-text-muted">
            No hay solicitudes de ingreso pendientes.
          </p>
        )}
      </section>}
    </div>
  );
}

export async function GroupDetailPage({
  groupId,
  role,
}: {
  groupId: number;
  role: AppRole;
}) {
  const user = role === "particular" ? null : await getSessionUser();
  let data: GroupDetailData;
  try {
    data = await getGroupDetailForUser(groupId, user);
  } catch (error) {
    if (
      error instanceof Error &&
      "status" in error &&
      (error.status === 403 || error.status === 404)
    ) {
      notFound();
    }
    throw error;
  }
  const root = role === "particular" ? "/" : roleBase[role];
  const groupsHref =
    role === "particular" || role === "administrador"
      ? directoryPath(role, role === "particular" ? "public" : "all")
      : role === "identificado"
        ? directoryPath(role, data.membershipStatus ? "member" : "public")
        : directoryPath(role, data.role === "coordinador" ? "coordinator" : "public");
  const rootLabel =
    role === "particular" || role === "identificado"
      ? role === "particular" ? "Explorar" : "Mi espacio"
      : role === "coordinador" ? "Coordinación" : "Administración";
  const isCoordinator = data.role === "coordinador";

  return (
    <section className="flex w-full flex-col gap-6">
      <header className="flex flex-col gap-3">
        <Breadcrumbs
          items={[
            { label: rootLabel, href: root },
            { label: "Grupos", href: groupsHref },
            { label: data.group.nombre },
          ]}
        />
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="text-[1.8125rem] leading-normal tracking-[-0.05rem] text-text">
                {data.group.nombre}
              </h1>
              <span className="rounded-full bg-primary-soft px-2.5 py-1 text-micro font-semibold text-primary">
                {visibilityLabel(data.group.visibilidad)}
              </span>
            </div>
            <p className="mt-2 max-w-3xl text-[0.8125rem] leading-[1.6] text-text-muted">
              {data.group.descripcion || "Este grupo aún no tiene descripción."}
            </p>
          </div>
          <p className="rounded-md bg-surface-subtle px-3 py-2 text-caption text-text-muted">
            {data.role === "coordinador"
              ? "Coordinas este grupo"
              : data.role === "miembro"
                ? "Eres miembro"
                : data.membershipStatus === "pendiente"
                  ? "Membresía pendiente"
                  : data.canManage
                    ? "Administración global"
                    : "Consulta pública"}
          </p>
        </div>
      </header>

      {role === "identificado" && data.group.visibilidad === "publico" && (
        <GroupJoinForm
          groupId={data.group.id_grupo}
          membershipStatus={data.membershipStatus}
        />
      )}

      {role === "particular" && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-md bg-primary-soft p-4">
          <p className="text-xs text-text">Inicia sesión para solicitar ingreso y participar en el grupo.</p>
          <Link
            href="/ingresar"
            className="inline-flex min-h-9 items-center justify-center rounded-md bg-primary px-4 text-xs font-semibold text-surface hover-bright"
          >
            Ingresar
          </Link>
        </div>
      )}

      {role === "administrador" && (
        <AdminGroupEditor group={data.group} />
      )}

      {role === "coordinador" && !isCoordinator && (
        <p className="rounded-md bg-surface-subtle px-4 py-3 text-xs leading-[1.5] text-text-muted">
          Puedes consultar este grupo por ser público, pero solo los coordinadores asignados pueden gestionar sus miembros y solicitudes.
        </p>
      )}

      <GroupModules data={data} role={role} />
      <GroupGovernance data={data} />
    </section>
  );
}

export async function CoordinatorGroupOperationsPage({
  section,
}: {
  section: "members" | "requests" | "settings";
}) {
  const user = await getSessionUser();
  if (!user) notFound();
  const groups = await listManagedGroups(user);
  const data = await Promise.all(
    groups.map(async (group) => getGroupDetailForUser(group.id_grupo, user)),
  );
  const title =
    section === "members"
      ? "Miembros de mis grupos"
      : section === "requests"
        ? "Solicitudes de ingreso"
        : "Configuración de mis grupos";

  return (
    <section className="flex w-full flex-col gap-6">
      <header className="flex flex-col gap-2.5">
        <Breadcrumbs
          items={[
            { label: "Explorar", href: "/coordinador" },
            { label: "Grupos que coordino", href: "/coordinador/grupos" },
            { label: title },
          ]}
        />
        <h1 className="text-[1.8125rem] leading-normal tracking-[-0.05rem] text-text">{title}</h1>
        <p className="text-[0.8125rem] leading-[1.55] text-text-muted">
          Solo se muestran los grupos que tienes permiso para coordinar.
        </p>
      </header>

      {!data.length ? (
        <div className="rounded-[0.625rem] border border-dashed border-border bg-surface p-8 text-center">
          <p className="text-sm font-semibold text-text">No tienes grupos asignados</p>
          <p className="mt-1.5 text-xs text-text-muted">
            Un administrador puede asignarte como coordinador de un grupo.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-5">
          {data.map((groupData) => (
            <section key={groupData.group.id_grupo} className="flex flex-col gap-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-base font-semibold text-text">{groupData.group.nombre}</h2>
                <Link
                  href={`/coordinador/grupos/${groupData.group.id_grupo}`}
                  className="text-xs text-primary hover:underline"
                >
                  Abrir grupo →
                </Link>
              </div>
              {section === "settings" ? (
                <p className="rounded-md bg-surface p-4 text-xs leading-[1.55] text-text-muted">
                  Nombre, descripción y visibilidad son administrados globalmente. Contacta a un administrador para solicitar cambios.
                </p>
              ) : section === "members" ? (
                <GroupGovernance data={groupData} showRequests={false} />
              ) : (
                <GroupGovernance data={groupData} showMembers={false} />
              )}
            </section>
          ))}
        </div>
      )}
    </section>
  );
}

export async function AdminCreateGroupPage() {
  return (
    <section className="mx-auto flex w-full max-w-[48rem] flex-col gap-6">
      <header className="flex flex-col gap-2.5">
        <Breadcrumbs
          items={[
            { label: "Explorar", href: "/admin" },
            { label: "Grupos", href: "/admin/grupos" },
            { label: "Crear grupo" },
          ]}
        />
        <h1 className="text-[1.8125rem] leading-normal tracking-[-0.05rem] text-text">Crear grupo</h1>
        <p className="text-xs leading-[1.5] text-text-muted">
          El grupo quedará registrado en la base de datos de BioRed y disponible según su visibilidad.
        </p>
      </header>
      <AdminGroupEditor />
    </section>
  );
}
