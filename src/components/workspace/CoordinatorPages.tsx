import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getGroupDetailForUser,
  listManagedGroups,
  type GroupDetailData,
  type GroupWorkspaceItem,
} from "@/lib/server/auth-store";
import { getSessionUser } from "@/lib/server/authorization";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import {
  GroupJoinRequestDecision,
  GroupMembershipStatusControl,
} from "@/components/groups/GroupActions";

type CoordinatorSection = "modules" | "settings" | "changes";

const coordinatorBase = "/coordinador";

const groupSections = [
  { label: "Resumen", path: "resumen" },
  { label: "Módulos", path: "modulos" },
  { label: "Miembros", path: "miembros" },
  { label: "Solicitudes", path: "solicitudes" },
  { label: "Configuración", path: "configuracion" },
  { label: "Registro de cambios", path: "cambios" },
];

async function getCoordinatorGroups() {
  const user = await getSessionUser();
  if (
    !user ||
    user.rol_global !== "usuario" ||
    !user.memberships.some(
      (membership) =>
        membership.estado === "activo" && membership.rol_grupo === "coordinador",
    )
  ) {
    return { user, groups: [] as GroupWorkspaceItem[] };
  }

  const groups = await listManagedGroups(user);
  return {
    user,
    groups: groups.filter(
      (group) => group.my_role === "coordinador" && group.my_status === "activo",
    ),
  };
}

async function getManagedGroup(groupId: number) {
  const { user, groups } = await getCoordinatorGroups();
  if (!user) notFound();

  const group = groups.find((candidate) => candidate.id_grupo === groupId);
  if (!group) notFound();

  const data = await getGroupDetailForUser(groupId, user);
  if (!data.canManage || data.role !== "coordinador") notFound();
  return { user, groups, group, data };
}

function chooseGroup(
  groups: GroupWorkspaceItem[],
  requestedId?: string,
): GroupWorkspaceItem | undefined {
  const parsedId = requestedId && /^\d+$/.test(requestedId) ? Number(requestedId) : undefined;
  return groups.find((group) => group.id_grupo === parsedId) ?? groups[0];
}

function formatDate(value: string) {
  const normalized = value.includes("T") ? value : value.replace(" ", "T");
  const parsed = new Date(/(?:Z|[+-]\d{2}:\d{2})$/i.test(normalized) ? normalized : `${normalized}Z`);
  if (Number.isNaN(parsed.getTime())) return value;
  return new Intl.DateTimeFormat("es-CO", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(parsed);
}

function visibilityLabel(visibility: GroupWorkspaceItem["visibilidad"]) {
  return visibility === "publico" ? "Público" : "Privado";
}

function moduleVisibilityLabel(visibility: GroupDetailData["modules"][number]["visibilidad"]) {
  if (visibility === "publico") return "Público";
  if (visibility === "privado") return "Privado";
  if (visibility === "identificados") return "Solo identificados";
  return "Grupo";
}

function EmptyGroups() {
  return (
    <div className="rounded-[0.625rem] border border-dashed border-border bg-surface p-8 text-center">
      <h2 className="text-sm font-semibold text-text">No tienes grupos activos asignados</h2>
      <p className="mt-2 text-xs leading-[1.55] text-text-muted">
        Esta sección solo muestra grupos donde tu membresía de coordinador está activa. Un
        administrador puede asignarte a un grupo.
      </p>
      <Link
        href={`${coordinatorBase}/explorar-grupos`}
        className="mt-4 inline-flex min-h-9 items-center rounded-md border border-border px-4 text-xs font-semibold text-primary hover:bg-surface-subtle"
      >
        Explorar grupos públicos
      </Link>
    </div>
  );
}

function GroupWorkspaceTabs({
  groupId,
  current,
}: {
  groupId: number;
  current: string;
}) {
  return (
    <nav aria-label="Secciones del grupo" className="overflow-x-auto border-b border-border">
      <div className="flex min-w-max gap-5">
        {groupSections.map((section) => {
          const href = `${coordinatorBase}/grupo/${section.path}?grupo=${groupId}`;
          const active = section.path === current;
          return (
            <Link
              key={section.path}
              href={href}
              aria-current={active ? "page" : undefined}
              className={`border-b-2 px-0.5 pb-3 text-xs ${
                active
                  ? "border-primary font-semibold text-primary"
                  : "border-transparent text-text-muted hover:text-text"
              }`}
            >
              {section.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

function GroupContext({
  groups,
  group,
  section,
}: {
  groups: GroupWorkspaceItem[];
  group: GroupWorkspaceItem;
  section: string;
}) {
  return (
    <>
      <Breadcrumbs
        items={[
          { label: "Mis grupos", href: `${coordinatorBase}/grupos` },
          { label: group.nombre, href: `${coordinatorBase}/grupos/${group.id_grupo}` },
          { label: groupSections.find((item) => item.path === section)?.label ?? "Grupo" },
        ]}
      />
      {groups.length > 1 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-caption text-text-muted">Grupo activo</span>
          {groups.map((option) => (
            <Link
              key={option.id_grupo}
              href={`${coordinatorBase}/grupo/${section}?grupo=${option.id_grupo}`}
              aria-current={option.id_grupo === group.id_grupo ? "true" : undefined}
              className={`rounded-full border px-3 py-1.5 text-caption ${
                option.id_grupo === group.id_grupo
                  ? "border-primary bg-primary-soft font-semibold text-primary"
                  : "border-border bg-surface text-text-muted hover:text-text"
              }`}
            >
              {option.nombre}
            </Link>
          ))}
        </div>
      )}
      <GroupWorkspaceTabs groupId={group.id_grupo} current={section} />
    </>
  );
}

function Notice({ children }: { children: React.ReactNode }) {
  return (
    <p className="rounded-md bg-primary-soft px-4 py-3 text-xs leading-[1.55] text-text">
      {children}
    </p>
  );
}

function Metric({
  label,
  value,
  detail,
}: {
  label: React.ReactNode;
  value: number | string;
  detail: string;
}) {
  return (
    <article className="rounded-[0.625rem] border border-border bg-surface p-4">
      <p className="text-caption text-text-muted">{label}</p>
      <p className="mt-2 text-2xl font-medium tracking-tight text-text">{value}</p>
      <p className="mt-1 text-caption text-text-muted">{detail}</p>
    </article>
  );
}

export async function CoordinatorGroupSelectorPage() {
  const { groups } = await getCoordinatorGroups();
  return (
    <section className="flex w-full flex-col gap-6">
      <header className="flex flex-col gap-2.5">
        <Breadcrumbs
          items={[
            { label: "Mi espacio", href: coordinatorBase },
            { label: "Grupos coordinados" },
          ]}
        />
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-[1.8125rem] leading-normal tracking-[-0.05rem] text-text">
              Grupos coordinados
            </h1>
            <p className="mt-1 max-w-3xl text-[0.8125rem] leading-[1.55] text-text-muted">
              Selecciona un grupo para consultar sus secciones. Cada grupo conserva sus propios
              permisos y datos.
            </p>
          </div>
          <span className="text-xs font-semibold text-primary">
            {groups.length} {groups.length === 1 ? "grupo activo" : "grupos activos"}
          </span>
        </div>
      </header>

      <Notice>
        Solo se muestran grupos donde tu membresía activa tiene el rol de coordinador. La
        coordinación no permite editar módulos ajenos ni asignar roles globales.
      </Notice>

      {!groups.length ? (
        <EmptyGroups />
      ) : (
        <section className="rounded-[0.625rem] border border-border bg-surface p-4 sm:p-5">
          <h2 className="text-base font-semibold text-text">Grupos disponibles para coordinación</h2>
          <div className="mt-3 divide-y divide-border">
            {groups.map((group) => (
              <article
                key={group.id_grupo}
                className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <h3 className="text-sm font-semibold text-text">
                    <Link
                      href={`${coordinatorBase}/grupos/${group.id_grupo}`}
                      className="hover:text-primary hover:underline"
                    >
                      {group.nombre}
                    </Link>
                  </h3>
                  <p className="mt-1 text-caption text-text-muted">
                    {group.member_count} miembros · {group.public_module_count} módulos públicos ·{" "}
                    {visibilityLabel(group.visibilidad)}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Link
                    href={`${coordinatorBase}/grupo/resumen?grupo=${group.id_grupo}`}
                    className="inline-flex min-h-9 items-center justify-center rounded-md bg-primary px-4 text-xs font-semibold text-surface hover-bright"
                  >
                    Seleccionar
                  </Link>
                  <Link
                    href={`${coordinatorBase}/grupos/${group.id_grupo}`}
                    className="inline-flex min-h-9 items-center justify-center rounded-md border border-border px-4 text-xs font-semibold text-primary hover:bg-surface-subtle"
                  >
                    Ver detalle
                  </Link>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}
    </section>
  );
}

export async function CoordinatorOverviewPage({ groupId }: { groupId?: string }) {
  const { groups } = await getCoordinatorGroups();
  if (!groups.length) {
    return (
      <section className="flex w-full flex-col gap-6">
        <h1 className="text-[1.8125rem] tracking-[-0.05rem] text-text">Resumen del grupo</h1>
        <EmptyGroups />
      </section>
    );
  }
  const group = chooseGroup(groups, groupId)!;
  const { data } = await getManagedGroup(group.id_grupo);
  const activeMembers = data.members.filter((member) => member.estado === "activo").length;
  const pendingRequests = data.requests.filter((request) => request.estado === "pendiente");

  return (
    <section className="flex w-full flex-col gap-5">
      <GroupContext groups={groups} group={group} section="resumen" />
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-[1.8125rem] leading-normal tracking-[-0.05rem] text-text">
            <Link
              href={`${coordinatorBase}/grupos/${group.id_grupo}`}
              className="hover:text-primary hover:underline"
            >
              {group.nombre}
            </Link>
          </h1>
          <p className="mt-1 text-[0.8125rem] leading-[1.55] text-text-muted">
            Coordina la comunidad, revisa solicitudes y consulta la información disponible del grupo.
          </p>
        </div>
        <Link
          href={`${coordinatorBase}/grupo/modulos?grupo=${group.id_grupo}`}
          className="inline-flex min-h-9 items-center rounded-md border border-border bg-surface px-4 text-xs font-semibold text-primary hover:bg-surface-subtle"
        >
          Ver módulos del grupo
        </Link>
      </header>

      <Notice>
        Tu alcance se limita a este grupo. Puedes revisar sus membresías y solicitudes de ingreso;
        la edición de módulos ajenos y la administración de perfiles corresponden a sus
        propietarios o a administración.
      </Notice>

      <div className="grid gap-3 sm:grid-cols-2 2xl:grid-cols-3">
        <Metric
          label={
            <Link
              href={`${coordinatorBase}/grupo/miembros?grupo=${group.id_grupo}`}
              className="hover:text-primary hover:underline"
            >
              Miembros activos
            </Link>
          }
          value={activeMembers}
          detail="Membresías activas del grupo"
        />
        <Metric
          label={
            <Link
              href={`${coordinatorBase}/grupo/modulos?grupo=${group.id_grupo}`}
              className="hover:text-primary hover:underline"
            >
              Módulos visibles para ti
            </Link>
          }
          value={data.modules.length}
          detail="El acceso depende de la visibilidad de cada módulo"
        />
        <Metric
          label={
            <Link
              href={`${coordinatorBase}/grupo/solicitudes?grupo=${group.id_grupo}`}
              className="hover:text-primary hover:underline"
            >
              Solicitudes de ingreso pendientes
            </Link>
          }
          value={pendingRequests.length}
          detail="Solo solicitudes de ingreso al grupo"
        />
      </div>

      <div className="grid min-w-0 gap-4 xl:grid-cols-2">
        <section className="rounded-[0.625rem] border border-border bg-surface p-4 sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-base font-semibold text-text">
              <Link
                href={`${coordinatorBase}/grupo/solicitudes?grupo=${group.id_grupo}`}
                className="hover:text-primary hover:underline"
              >
                Solicitudes de ingreso
              </Link>
            </h2>
            <Link
              href={`${coordinatorBase}/grupo/solicitudes?grupo=${group.id_grupo}`}
              className="text-xs font-semibold text-primary hover:underline"
            >
              Revisar solicitudes →
            </Link>
          </div>
          {pendingRequests.length ? (
            <div className="mt-4 divide-y divide-border">
              {pendingRequests.slice(0, 4).map((request) => (
                <div
                  key={request.id_solicitud}
                  className="flex flex-wrap items-center justify-between gap-2 py-3"
                >
                  <div>
                    <p className="text-xs font-semibold text-text">{request.nombre_solicitante}</p>
                    <p className="mt-1 text-caption text-text-muted">
                      Ingreso al grupo · {formatDate(request.fecha_creacion)}
                    </p>
                  </div>
                  <span className="rounded-full bg-primary-soft px-2.5 py-1 text-micro font-semibold text-primary">
                    Pendiente
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-4 rounded-md bg-surface-subtle p-4 text-xs text-text-muted">
              No hay solicitudes de ingreso pendientes.
            </p>
          )}
        </section>

        <section className="rounded-[0.625rem] border border-border bg-surface p-4 sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-base font-semibold text-text">
              <Link
                href={`${coordinatorBase}/grupo/configuracion?grupo=${group.id_grupo}`}
                className="hover:text-primary hover:underline"
              >
                Acceso y configuración
              </Link>
            </h2>
            <Link
              href={`${coordinatorBase}/grupo/configuracion?grupo=${group.id_grupo}`}
              className="text-xs font-semibold text-primary hover:underline"
            >
              Ver configuración →
            </Link>
          </div>
          <div className="mt-4 rounded-md bg-surface-subtle p-4">
            <p className="text-caption text-text-muted">Visibilidad actual del grupo</p>
            <p className="mt-1 text-sm font-semibold text-text">
              {visibilityLabel(data.group.visibilidad)}
            </p>
            <p className="mt-2 text-caption leading-[1.55] text-text-muted">
              La visibilidad y los cambios de configuración los administra una cuenta autorizada
              globalmente.
            </p>
          </div>
          <p className="mt-4 text-caption leading-[1.55] text-text-muted">
            El registro de cambios se mantiene separado de las solicitudes; consulta únicamente los
            eventos que estén disponibles en una lectura autorizada.
          </p>
          <Link
            href={`${coordinatorBase}/grupo/cambios?grupo=${group.id_grupo}`}
            className="mt-2 inline-flex text-xs font-semibold text-primary hover:underline"
          >
            Abrir registro de cambios →
          </Link>
        </section>
      </div>
    </section>
  );
}

function CoordinatorModules({ data }: { data: GroupDetailData }) {
  return (
    <section className="rounded-[0.625rem] border border-border bg-surface p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-base font-semibold text-text">Módulos del grupo</h2>
        <span className="text-caption text-text-muted">
          {data.modules.length} visibles para tu acceso
        </span>
      </div>
      {data.modules.length ? (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[36rem] border-collapse text-left">
            <thead className="bg-surface-subtle text-micro uppercase text-text-muted">
              <tr>
                <th scope="col" className="px-3 py-3">Módulo</th>
                <th scope="col" className="px-3 py-3">Sensores</th>
                <th scope="col" className="px-3 py-3">Visibilidad</th>
                <th scope="col" className="px-3 py-3">Ubicación</th>
                <th scope="col" className="px-3 py-3">Permiso</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {data.modules.map((module) => (
                <tr key={module.id_modulo} className="text-xs text-text">
                  <td className="px-3 py-3.5 font-medium">
                    <Link
                      href={
                        module.visibilidad === "publico"
                          ? `${coordinatorBase}/explorar-modulos/${module.id_modulo}`
                          : `${coordinatorBase}/modulos/privados/${module.id_modulo}`
                      }
                      className="hover:text-primary hover:underline"
                    >
                      {module.label}
                    </Link>
                  </td>
                  <td className="px-3 py-3.5 text-text-muted">
                    {module.sensors.length ? module.sensors.join(" · ") : "Sin sensores"}
                  </td>
                  <td className="px-3 py-3.5 text-text-muted">
                    {moduleVisibilityLabel(module.visibilidad)}
                  </td>
                  <td className="px-3 py-3.5 text-text-muted">{module.location}</td>
                  <td className="px-3 py-3.5 text-text-muted">Solo consulta</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="mt-4 rounded-md border border-dashed border-border p-5 text-xs text-text-muted">
          No hay módulos visibles para tu nivel de acceso.
        </p>
      )}
      <p className="mt-4 text-caption leading-[1.55] text-text-muted">
        Se muestran únicamente los módulos que el servidor autoriza para tu acceso. La
        coordinación no concede permisos de edición sobre módulos ajenos.
      </p>
    </section>
  );
}

function CoordinatorConfiguration({ data }: { data: GroupDetailData }) {
  return (
    <div className="grid gap-4 xl:grid-cols-2">
      <section className="rounded-[0.625rem] border border-border bg-surface p-4 sm:p-5">
        <h2 className="text-base font-semibold text-text">Visibilidad del grupo</h2>
        <p className="mt-1 text-caption text-text-muted">Configuración actual</p>
        <div className="mt-4 rounded-md bg-primary-soft p-4">
          <p className="text-sm font-semibold text-text">{visibilityLabel(data.group.visibilidad)}</p>
          <p className="mt-1 text-caption leading-[1.55] text-text-muted">
            {data.group.visibilidad === "publico"
              ? "El grupo puede aparecer en la exploración pública; el acceso a cada módulo conserva sus propias reglas."
              : "El grupo solo está disponible para personas con una membresía activa o autorización administrativa."}
          </p>
        </div>
        <p className="mt-4 text-xs leading-[1.55] text-text-muted">
          Esta vista es de consulta. La configuración de visibilidad, el nombre y la descripción
          requieren una acción administrativa que no está disponible para el rol coordinador.
        </p>
      </section>
      <section className="rounded-[0.625rem] border border-border bg-surface p-4 sm:p-5">
        <h2 className="text-base font-semibold text-text">Acceso efectivo</h2>
        <p className="mt-1 text-caption text-text-muted">
          La visibilidad del grupo y la de cada módulo se evalúan por separado.
        </p>
        <ul className="mt-4 space-y-3 text-xs leading-[1.55] text-text-muted">
          <li className="rounded-md bg-surface-subtle p-3">
            Los grupos privados no se muestran a personas sin membresía activa ni autorización.
          </li>
          <li className="rounded-md bg-surface-subtle p-3">
            Los módulos conservan sus propios permisos; un grupo coordinado no concede acceso de
            edición a módulos de terceros.
          </li>
          <li className="rounded-md bg-surface-subtle p-3">
            Las decisiones sobre solicitudes de ingreso quedan sujetas a la autorización del
            servidor y al estado de la cuenta solicitante.
          </li>
        </ul>
      </section>
    </div>
  );
}

function CoordinatorMembers({ data }: { data: GroupDetailData }) {
  return (
    <>
      <Notice>
        Puedes consultar y actualizar el estado de membresías de este grupo. La asignación de
        coordinadores y la administración de cuentas quedan reservadas a administración.
      </Notice>
      <section className="rounded-[0.625rem] border border-border bg-surface p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-base font-semibold text-text">Miembros del grupo</h2>
          <span className="text-caption text-text-muted">{data.members.length} membresías</span>
        </div>
        {data.members.length ? (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[38rem] border-collapse text-left">
              <thead className="bg-surface-subtle text-micro uppercase text-text-muted">
                <tr>
                  <th scope="col" className="px-3 py-3">Miembro</th>
                  <th scope="col" className="px-3 py-3">Rol</th>
                  <th scope="col" className="px-3 py-3">Estado</th>
                  <th scope="col" className="px-3 py-3">Cuenta</th>
                  <th scope="col" className="px-3 py-3">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {data.members.map((member) => (
                  <tr key={member.id_grupo_usuarios} className="text-xs text-text">
                    <td className="px-3 py-3.5">
                      <p className="font-semibold">{member.nombre_usuario}</p>
                      <p className="mt-1 text-caption text-text-muted">{member.correo_usuario}</p>
                    </td>
                    <td className="px-3 py-3.5 text-text-muted">
                      {member.rol_grupo === "coordinador" ? "Coordinador" : "Miembro"}
                    </td>
                    <td className="px-3 py-3.5 text-text-muted">{member.estado}</td>
                    <td className="px-3 py-3.5 text-text-muted">{member.estado_cuenta}</td>
                    <td className="px-3 py-3.5">
                      {member.rol_grupo === "coordinador" ? (
                        <span className="text-caption text-text-muted">Solo administración</span>
                      ) : (
                        <GroupMembershipStatusControl
                          groupId={data.group.id_grupo}
                          membershipId={member.id_grupo_usuarios}
                          status={member.estado}
                        />
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="mt-4 rounded-md border border-dashed border-border p-5 text-xs text-text-muted">
            Este grupo aún no tiene membresías registradas.
          </p>
        )}
      </section>
    </>
  );
}

function CoordinatorRequests({ data }: { data: GroupDetailData }) {
  const pending = data.requests.filter((request) => request.estado === "pendiente");
  const history = data.requests.filter((request) => request.estado !== "pendiente");

  return (
    <>
      <Notice>
        Esta sección incluye solicitudes de ingreso al grupo. Las solicitudes de acceso a módulos
        y su revisión administrativa no están implementadas en este flujo.
      </Notice>
      <section className="rounded-[0.625rem] border border-border bg-surface p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-base font-semibold text-text">Solicitudes pendientes</h2>
          <span className="text-caption font-semibold text-primary">
            {pending.length} pendientes
          </span>
        </div>
        {pending.length ? (
          <div className="mt-4 divide-y divide-border">
            {pending.map((request) => (
              <article
                key={request.id_solicitud}
                className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-text">{request.nombre_solicitante}</p>
                  <p className="mt-1 text-caption text-text-muted">{request.correo_solicitante}</p>
                  <p className="mt-2 text-xs leading-[1.55] text-text-muted">
                    {request.justificacion_solicitante || "No se incluyó una justificación."}
                  </p>
                  <p className="mt-2 text-caption text-text-muted">
                    Recibida {formatDate(request.fecha_creacion)}
                  </p>
                </div>
                <GroupJoinRequestDecision
                  groupId={data.group.id_grupo}
                  requestId={request.id_solicitud}
                />
              </article>
            ))}
          </div>
        ) : (
          <p className="mt-4 rounded-md bg-surface-subtle p-4 text-xs text-text-muted">
            No hay solicitudes de ingreso pendientes.
          </p>
        )}
      </section>

      <section className="rounded-[0.625rem] border border-border bg-surface p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-base font-semibold text-text">Historial de decisiones</h2>
          <span className="text-caption text-text-muted">
            {history.length} {history.length === 1 ? "decisión" : "decisiones"}
          </span>
        </div>
        {history.length ? (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[35rem] border-collapse text-left">
              <thead className="bg-surface-subtle text-micro uppercase text-text-muted">
                <tr>
                  <th scope="col" className="px-3 py-3">Persona</th>
                  <th scope="col" className="px-3 py-3">Decisión</th>
                  <th scope="col" className="px-3 py-3">Fecha</th>
                  <th scope="col" className="px-3 py-3">Respuesta registrada</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {history.map((request) => (
                  <tr key={request.id_solicitud} className="text-xs text-text">
                    <td className="px-3 py-3.5">
                      <p className="font-medium">{request.nombre_solicitante}</p>
                      <p className="mt-1 text-caption text-text-muted">
                        {request.correo_solicitante}
                      </p>
                    </td>
                    <td className="px-3 py-3.5 text-text-muted">
                      {request.estado === "aprobada"
                        ? "Aprobada"
                        : request.estado === "rechazada"
                          ? "Rechazada"
                          : request.estado}
                    </td>
                    <td className="px-3 py-3.5 text-text-muted">
                      {request.fecha_resolucion ? formatDate(request.fecha_resolucion) : "Sin fecha"}
                    </td>
                    <td className="px-3 py-3.5 text-text-muted">
                      {request.respuesta_resolucion || "Sin respuesta registrada"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="mt-4 rounded-md bg-surface-subtle p-4 text-xs text-text-muted">
            No hay decisiones previas registradas en las solicitudes de este grupo.
          </p>
        )}
      </section>
    </>
  );
}

function CoordinatorChangeLog() {
  return (
    <section className="rounded-[0.625rem] border border-border bg-surface p-5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-base font-semibold text-text">Registro de cambios del grupo</h2>
          <p className="mt-1 text-caption text-text-muted">
            Historial de lectura; no se pueden editar ni eliminar eventos desde esta sección.
          </p>
        </div>
        <span className="text-caption font-semibold text-primary">Solo lectura</span>
      </div>
      <div className="mt-5 rounded-md border border-dashed border-border bg-surface-subtle p-5">
        <p className="text-sm font-semibold text-text">El historial no está disponible en esta vista</p>
        <p className="mt-2 text-xs leading-[1.55] text-text-muted">
          El flujo actual no expone una consulta de auditoría autorizada para estos cambios. No se
          muestran eventos inferidos ni datos de auditoría global como si fueran historial local
          del grupo.
        </p>
      </div>
    </section>
  );
}

export async function CoordinatorGroupWorkspacePage({
  groupId,
  section,
}: {
  groupId?: string;
  section: CoordinatorSection | "members" | "requests";
}) {
  const { groups } = await getCoordinatorGroups();
  if (!groups.length) {
    return (
      <section className="flex w-full flex-col gap-6">
        <h1 className="text-[1.8125rem] tracking-[-0.05rem] text-text">
          {section === "modules"
            ? "Módulos del grupo"
            : section === "settings"
              ? "Configuración del grupo"
              : section === "members"
                ? "Miembros del grupo"
                : section === "requests"
                  ? "Solicitudes del grupo"
                  : "Registro de cambios"}
        </h1>
        <EmptyGroups />
      </section>
    );
  }

  const group = chooseGroup(groups, groupId)!;
  const { data } = await getManagedGroup(group.id_grupo);
  const title =
    section === "modules"
      ? "Módulos del grupo"
      : section === "settings"
        ? "Configuración del grupo"
        : section === "members"
          ? "Miembros del grupo"
          : section === "requests"
            ? "Solicitudes del grupo"
            : "Registro de cambios";
  const path =
    section === "modules"
      ? "modulos"
      : section === "settings"
        ? "configuracion"
        : section === "members"
          ? "miembros"
          : section === "requests"
            ? "solicitudes"
            : "cambios";

  return (
    <section className="flex w-full flex-col gap-5">
      <GroupContext groups={groups} group={group} section={path} />
      <header>
        <h1 className="text-[1.8125rem] leading-normal tracking-[-0.05rem] text-text">{title}</h1>
        <p className="mt-1 text-[0.8125rem] leading-[1.55] text-text-muted">
          {section === "modules"
            ? `Consulta los módulos asociados a ${group.nombre}.`
            : section === "settings"
              ? `Consulta el acceso efectivo y la configuración actual de ${group.nombre}.`
              : section === "members"
                ? `Consulta y administra las membresías de ${group.nombre} dentro de tu alcance.`
                : section === "requests"
                  ? `Revisa solicitudes de ingreso y decisiones registradas para ${group.nombre}.`
                  : `Consulta la disponibilidad del registro local de ${group.nombre}.`}
        </p>
      </header>
      {section === "modules" ? (
        <>
          <Notice>
            Como coordinador puedes revisar los módulos autorizados para tu acceso. La edición de
            módulos y sus permisos corresponde a sus propietarios o a administración.
          </Notice>
          <CoordinatorModules data={data} />
        </>
      ) : section === "members" ? (
        <CoordinatorMembers data={data} />
      ) : section === "requests" ? (
        <CoordinatorRequests data={data} />
      ) : section === "settings" ? (
        <>
          <Notice>
            La coordinación puede revisar el acceso del grupo, pero no editar datos globales,
            asignar roles ni cambiar la configuración.
          </Notice>
          <CoordinatorConfiguration data={data} />
        </>
      ) : (
        <>
          <Notice>
            Este registro debe contener únicamente cambios reales del grupo y no sustituye la
            auditoría global.
          </Notice>
          <CoordinatorChangeLog />
        </>
      )}
    </section>
  );
}

export async function CoordinatorManagedGroupDetailPage({ groupId }: { groupId: number }) {
  const { groups } = await getCoordinatorGroups();
  if (!groups.some((group) => group.id_grupo === groupId)) notFound();
  const { GroupDetailPage } = await import("@/components/groups/GroupPages");
  return <GroupDetailPage groupId={groupId} role="coordinador" />;
}

export async function CoordinatorPersonalModulesPage() {
  const { user, groups } = await getCoordinatorGroups();
  if (!user || !groups.length) {
    return (
      <section className="flex w-full flex-col gap-6">
        <h1 className="text-[1.8125rem] tracking-[-0.05rem] text-text">Mis módulos</h1>
        <EmptyGroups />
      </section>
    );
  }
  const details = await Promise.all(
    groups.map(async (group) => ({
      group,
      detail: await getGroupDetailForUser(group.id_grupo, user),
    })),
  );
  const modules = details.flatMap(({ group, detail }) =>
    detail.modules.map((module) => ({ ...module, groupName: group.nombre })),
  );

  return (
    <section className="flex w-full flex-col gap-6">
      <header className="flex flex-col gap-2.5">
        <Breadcrumbs items={[{ label: "Mi espacio" }, { label: "Mis módulos" }]} />
        <h1 className="text-[1.8125rem] tracking-[-0.05rem] text-text">Módulos accesibles</h1>
        <p className="max-w-3xl text-[0.8125rem] leading-[1.55] text-text-muted">
          Consulta los módulos visibles en los grupos que coordinas. La coordinación no convierte
          estos módulos en propiedad personal ni habilita su edición.
        </p>
      </header>
      {modules.length ? (
        <div className="overflow-x-auto rounded-[0.625rem] border border-border bg-surface">
          <table className="w-full min-w-[38rem] border-collapse text-left">
            <thead className="bg-surface-subtle text-micro uppercase text-text-muted">
              <tr>
                <th scope="col" className="px-4 py-3">Módulo</th>
                <th scope="col" className="px-4 py-3">Grupo</th>
                <th scope="col" className="px-4 py-3">Sensores</th>
                <th scope="col" className="px-4 py-3">Permiso</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {modules.map((module) => (
                <tr key={`${module.groupName}-${module.id_modulo}`} className="text-xs text-text">
                  <td className="px-4 py-3.5 font-medium">{module.label}</td>
                  <td className="px-4 py-3.5 text-text-muted">{module.groupName}</td>
                  <td className="px-4 py-3.5 text-text-muted">
                    {module.sensors.length ? module.sensors.join(" · ") : "Sin sensores"}
                  </td>
                  <td className="px-4 py-3.5 text-text-muted">Solo consulta</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="rounded-[0.625rem] border border-dashed border-border bg-surface p-8 text-center text-xs text-text-muted">
          No hay módulos visibles para tu acceso en los grupos coordinados.
        </div>
      )}
    </section>
  );
}

export function CoordinatorVisualizationsPage() {
  return (
    <section className="flex w-full flex-col gap-6">
      <header className="flex flex-col gap-2.5">
        <Breadcrumbs items={[{ label: "Mi espacio" }, { label: "Mis visualizaciones" }]} />
        <h1 className="text-[1.8125rem] tracking-[-0.05rem] text-text">Mis visualizaciones</h1>
        <p className="max-w-3xl text-[0.8125rem] leading-[1.55] text-text-muted">
          Las visualizaciones guardadas de usuario no están disponibles en este flujo. Puedes
          consultar las lecturas que tu acceso permite.
        </p>
      </header>
      <section className="rounded-[0.625rem] border border-border bg-surface p-5">
        <h2 className="text-sm font-semibold text-text">No hay una vista personal conectada</h2>
        <p className="mt-2 text-xs leading-[1.55] text-text-muted">
          No se muestran gráficas de ejemplo como si fueran visualizaciones guardadas. La sección
          de lecturas presenta por separado los datos disponibles para consulta.
        </p>
        <Link
          href={`${coordinatorBase}/lecturas`}
          className="mt-4 inline-flex min-h-9 items-center rounded-md bg-primary px-4 text-xs font-semibold text-surface hover-bright"
        >
          Consultar lecturas
        </Link>
      </section>
    </section>
  );
}

export function CoordinatorPersonalRequestsPage() {
  return (
    <section className="flex w-full flex-col gap-6">
      <header className="flex flex-col gap-2.5">
        <Breadcrumbs items={[{ label: "Mi espacio" }, { label: "Mis solicitudes" }]} />
        <h1 className="text-[1.8125rem] tracking-[-0.05rem] text-text">Mis solicitudes</h1>
        <p className="max-w-3xl text-[0.8125rem] leading-[1.55] text-text-muted">
          Esta vista no dispone de una consulta autorizada para solicitudes personales. No se
          infiere un historial a partir de las solicitudes que recibes como coordinador.
        </p>
      </header>
      <section className="rounded-[0.625rem] border border-border bg-surface p-5">
        <h2 className="text-sm font-semibold text-text">Revisa las solicitudes que coordinas</h2>
        <p className="mt-2 text-xs leading-[1.55] text-text-muted">
          Las solicitudes de ingreso pendientes de tus grupos están disponibles en la sección de
          gestión del grupo.
        </p>
        <Link
          href={`${coordinatorBase}/grupo/solicitudes`}
          className="mt-4 inline-flex min-h-9 items-center rounded-md border border-border px-4 text-xs font-semibold text-primary hover:bg-surface-subtle"
        >
          Solicitudes del grupo
        </Link>
      </section>
    </section>
  );
}
