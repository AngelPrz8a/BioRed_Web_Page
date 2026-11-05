import Link from "next/link";
import { ArrowRight, LockKeyhole, Plus, UserRound } from "lucide-react";
import { notFound } from "next/navigation";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { GroupDirectoryPage } from "@/components/groups/GroupPages";
import {
  getPublicCatalogData,
  getAuthorizedModuleForUser,
  listUserModuleAccess,
  listPersonalRequests,
  listGroupsForUser,
  AuthError,
  type GroupWorkspaceItem,
  type PersonalRequestView,
} from "@/lib/server/auth-store";
import { getSessionUser } from "@/lib/server/authorization";
import {
  GroupMembershipRequestForm,
  GroupRoleRequestForm,
  ModuleAccessRequestForm,
} from "./RequestForms";

const base = "/espacio";

function PageHeader({
  title,
  description,
  backHref = base,
  backLabel = "Mi resumen",
  breadcrumbHref = base,
  breadcrumbLabel = "Mi espacio",
}: {
  title: string;
  description: string;
  backHref?: string;
  backLabel?: string;
  breadcrumbHref?: string;
  breadcrumbLabel?: string;
}) {
  return (
    <header className="flex flex-col gap-2.5">
      <Breadcrumbs items={[{ label: breadcrumbLabel, href: breadcrumbHref }, { label: title }]} />
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-[1.8125rem] leading-normal tracking-[-0.05rem] text-text">
            {title}
          </h1>
          <p className="mt-1.5 max-w-3xl text-[0.8125rem] leading-[1.55] text-text-muted">
            {description}
          </p>
        </div>
        <Link href={backHref} className="text-xs font-semibold text-primary hover:underline">
          ← {backLabel}
        </Link>
      </div>
    </header>
  );
}

function Panel({
  title,
  children,
  className = "",
}: {
  title: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={`rounded-brand border border-border bg-surface p-4 sm:p-5 ${className}`}>
      <h2 className="text-base font-semibold text-text">{title}</h2>
      <div className="mt-3">{children}</div>
    </section>
  );
}

function InfoNotice({
  children,
  tone = "info",
}: {
  children: React.ReactNode;
  tone?: "info" | "warning";
}) {
  return (
    <p
      className={`rounded-md px-3.5 py-3 text-xs leading-[1.55] ${
        tone === "warning"
          ? "bg-warning-soft text-text"
          : "bg-primary-soft text-text"
      }`}
    >
      {children}
    </p>
  );
}

function ActionLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="inline-flex min-h-9 items-center justify-center gap-2 rounded-md border border-border bg-surface px-3.5 text-xs font-semibold text-primary hover:bg-primary-soft"
    >
      {children}
    </Link>
  );
}

function EmptyCapability({
  title,
  detail,
  href,
  linkLabel,
}: {
  title: string;
  detail: string;
  href?: string;
  linkLabel?: string;
}) {
  return (
    <div className="rounded-brand border border-dashed border-border bg-surface p-7 sm:p-9">
      <div className="mx-auto flex max-w-xl flex-col items-center text-center">
        <span className="flex size-11 items-center justify-center rounded-full bg-primary-soft text-primary">
          <LockKeyhole className="size-5" aria-hidden />
        </span>
        <h2 className="mt-3 text-base font-semibold text-text">{title}</h2>
        <p className="mt-1.5 text-xs leading-[1.6] text-text-muted">{detail}</p>
        {href && linkLabel && (
          <Link
            href={href}
            className="mt-4 inline-flex min-h-9 items-center gap-2 rounded-md bg-primary px-4 text-xs font-semibold text-white hover-bright"
          >
            {linkLabel}
            <ArrowRight className="size-3.5" aria-hidden />
          </Link>
        )}
      </div>
    </div>
  );
}

function groupVisibility(group: GroupWorkspaceItem) {
  return group.visibilidad === "publico" ? "Público" : "Privado";
}

function MemberGroupList({ groups }: { groups: GroupWorkspaceItem[] }) {
  if (!groups.length) {
    return (
      <div className="rounded-md border border-dashed border-border bg-surface-subtle p-5 text-xs text-text-muted">
        Aún no tienes membresías activas o pendientes.
      </div>
    );
  }

  return (
    <div className="divide-y divide-border">
      {groups.map((group) => (
        <article
          key={group.id_grupo}
          className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
        >
          <div className="min-w-0">
            <h3 className="text-sm font-semibold text-text">
              <Link
                href={`${base}/grupos/${group.id_grupo}`}
                className="hover:text-primary hover:underline"
              >
                {group.nombre}
              </Link>
            </h3>
            <p className="mt-1 text-caption text-text-muted">
              {groupVisibility(group)} ·{" "}
              {group.my_status === "pendiente"
                ? "Membresía pendiente"
                : group.my_role === "coordinador"
                  ? "Coordinas este grupo"
                  : "Miembro"}
            </p>
          </div>
          <Link
            href={`${base}/grupos/${group.id_grupo}`}
            className="text-xs font-semibold text-primary hover:underline"
          >
            Abrir grupo →
          </Link>
        </article>
      ))}
    </div>
  );
}

export async function WorkspaceHomePage() {
  const user = await getSessionUser();
  if (!user) return null;
  const [groups, catalog] = await Promise.all([
    listGroupsForUser(user, "member"),
    getPublicCatalogData(),
  ]);
  const pendingMemberships = groups.filter((group) => group.my_status === "pendiente").length;

  return (
    <section className="flex w-full flex-col gap-5">
      <PageHeader
        title={`Bienvenido a tu espacio${user.nombre.trim().split(/\s+/)[0] ? `, ${user.nombre.trim().split(/\s+/)[0]}` : ""}`}
        description="Consulta tus vínculos y explora los datos públicos disponibles. La información personal solo se muestra cuando existe una fuente autorizada."
      />

      <Panel title="Tu espacio está listo">
        <p className="text-xs leading-[1.55] text-text-muted">
          Explora módulos de acceso público o revisa tus grupos. Los módulos propios y las
          visualizaciones no están conectados a registros personales en la base de datos actual.
        </p>
        <div className="mt-4 flex flex-wrap gap-2.5">
          <ActionLink href={`${base}/explorar-modulos`}>Explorar módulos públicos</ActionLink>
          <ActionLink href={`${base}/explorar-grupos`}>Explorar grupos</ActionLink>
        </div>
      </Panel>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Panel title={<Link className="hover:text-primary hover:underline" href={`${base}/grupos`}>Grupos vinculados</Link>}>
          <p className="font-mono text-2xl text-text">{groups.length}</p>
          <p className="mt-1 text-caption text-text-muted">Membresías activas o pendientes.</p>
        </Panel>
        <Panel title={<Link className="hover:text-primary hover:underline" href={`${base}/grupos`}>Membresías pendientes</Link>}>
          <p className="font-mono text-2xl text-text">{pendingMemberships}</p>
          <p className="mt-1 text-caption text-text-muted">Estado informado por el servicio de grupos.</p>
        </Panel>
        <Panel title={<Link className="hover:text-primary hover:underline" href={`${base}/explorar-modulos`}>Módulos públicos</Link>}>
          <p className="font-mono text-2xl text-text">{catalog.modules.length}</p>
          <p className="mt-1 text-caption text-text-muted">Disponibles para consulta pública.</p>
        </Panel>
        <Panel title={<Link className="hover:text-primary hover:underline" href={`${base}/cuenta`}>Datos personales</Link>}>
          <p className="text-sm font-semibold text-text">No conectados</p>
          <p className="mt-1 text-caption text-text-muted">Sin inventario propio ni paneles personales.</p>
        </Panel>
      </div>

      <Panel title={<Link className="hover:text-primary hover:underline" href={`${base}/grupos`}>Mis grupos</Link>}>
        <MemberGroupList groups={groups} />
        <div className="mt-4 border-t border-border pt-3">
          <Link href={`${base}/grupos`} className="text-xs font-semibold text-primary hover:underline">
            Ver mis grupos →
          </Link>
        </div>
      </Panel>
    </section>
  );
}

export async function MyModulesPage() {
  return (
    <section className="flex w-full flex-col gap-5">
      <PageHeader
        title="Mis módulos"
        description="El inventario personal debe proceder de registros asociados a tu cuenta; no se confunde con el catálogo público."
      />
      <InfoNotice>
        La versión actual de la base de datos no expone una consulta de módulos propios ni permite
        registrar un módulo desde este espacio.
      </InfoNotice>
      <EmptyCapability
        title="No hay inventario personal disponible"
        detail="No se muestran módulos públicos como si fueran tuyos. Cuando exista una operación de propiedad, aquí aparecerán únicamente los módulos vinculados a tu cuenta."
        href={`${base}/modulos/nuevo`}
        linkLabel="Agregar módulo propio"
      />
      <div className="flex flex-wrap gap-2.5">
        <ActionLink href={`${base}/modulos/accesos`}>Revisar accesos de mis módulos</ActionLink>
        <ActionLink href={`${base}/explorar-modulos`}>Explorar módulos públicos</ActionLink>
      </div>
    </section>
  );
}

export async function AddOwnModulePage() {
  return (
    <section className="flex w-full flex-col gap-5">
      <PageHeader
        title="Agregar módulo propio"
        description="El registro debe asociar el dispositivo a tu cuenta sin cambiar su firmware ni conceder permisos remotos."
        backHref={`${base}/modulos`}
        backLabel="Mis módulos"
      />
      <Panel title="Registro de propiedad">
        <InfoNotice tone="warning">
          No está disponible el endpoint que registre un módulo propio. No se guardará un formulario
          local ni se presentará como creado.
        </InfoNotice>
        <div className="mt-4 flex flex-wrap gap-2">
          <ActionLink href={`${base}/explorar-modulos`}>Consultar catálogo público</ActionLink>
          <button
            type="button"
            disabled
            className="inline-flex min-h-9 cursor-not-allowed items-center gap-2 rounded-md bg-primary px-4 text-xs font-semibold text-white opacity-50"
            aria-describedby="module-registration-status"
          >
            <Plus className="size-3.5" aria-hidden />
            Guardar módulo · no disponible
          </button>
        </div>
        <p id="module-registration-status" className="mt-2 text-caption text-text-muted">
          El formulario de registro se habilitará cuando exista persistencia autorizada.
        </p>
      </Panel>
    </section>
  );
}

export async function MyVisualizationsPage() {
  return (
    <section className="flex w-full flex-col gap-5">
      <PageHeader
        title="Mis visualizaciones"
        description="Los paneles personales deben conservar su configuración y consultar solo fuentes que tienes autorizadas."
      />
      <InfoNotice>
        La base de datos actual no ofrece lectura ni escritura de visualizaciones personales. No se
        muestran paneles como si estuvieran guardados en tu cuenta.
      </InfoNotice>
      <EmptyCapability
        title="Aún no hay paneles personales disponibles"
        detail="La edición y el guardado se mantienen deshabilitados hasta contar con un servicio que persista la configuración por usuario."
        href={`${base}/visualizaciones/nueva`}
        linkLabel="Abrir editor de visualizaciones"
      />
      <ActionLink href={`${base}/lecturas`}>Consultar lecturas públicas</ActionLink>
    </section>
  );
}

export async function VisualizationEditorPage() {
  return (
    <section className="flex w-full flex-col gap-5">
      <PageHeader
        title="Editor de visualizaciones"
        description="Configura paneles con fuentes y unidades autorizadas."
        backHref={`${base}/visualizaciones`}
        backLabel="Mis visualizaciones"
      />
      <InfoNotice tone="warning">
        No hay una API para cargar o guardar la configuración de un panel por usuario. El editor no
        guardará cambios ni presentará una visualización como persistida.
      </InfoNotice>
      <EmptyCapability
        title="Editor no disponible"
        detail="Puedes consultar las lecturas públicas, pero la selección de gráficas, rangos y agrupaciones no se conservaría."
        href={`${base}/lecturas`}
        linkLabel="Ver lecturas públicas"
      />
    </section>
  );
}

export async function MyRequestsPage() {
  const user = await getSessionUser();
  if (!user) return null;
  const requests = await listPersonalRequests(user.id_usuario);
  const pendingCount = requests.filter((request) => request.estado === "pendiente").length;
  const requestLabels: Record<PersonalRequestView["tipo"], string> = {
    acceso_modulo: "Acceso a módulo",
    ingreso_grupo: "Ingreso a grupo",
    cambio_rol_grupo: "Cambio de rol en grupo",
  } as const;

  return (
    <section className="flex w-full flex-col gap-5">
      <PageHeader
        title="Mis solicitudes"
        description="Consulta el estado, el recurso y la respuesta de tus solicitudes."
      />
      <Panel title={`Solicitudes · ${requests.length} · ${pendingCount} pendientes`}>
        {requests.length ? (
          <div className="divide-y divide-border">
            {requests.map((request) => (
              <article
                key={request.id_solicitud}
                className="grid gap-2 py-3 first:pt-0 last:pb-0 sm:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)_auto]"
              >
                <div>
                  <h3 className="text-sm font-semibold text-text">
                    {requestLabels[request.tipo]}
                  </h3>
                  <p className="mt-1 text-caption text-text-muted">
                    {request.destino}
                  </p>
                  {request.nivel_acceso_solicitado && (
                    <p className="mt-1 text-caption text-text-muted">
                      Nivel solicitado: {request.nivel_acceso_solicitado}
                    </p>
                  )}
                  {request.rol_solicitado && (
                    <p className="mt-1 text-caption text-text-muted">
                      Rol solicitado: {request.rol_solicitado}
                    </p>
                  )}
                  {request.justificacion_solicitante && (
                    <p className="mt-1 text-caption text-text-muted">{request.justificacion_solicitante}</p>
                  )}
                  {request.respuesta_resolucion && (
                    <p className="mt-1 text-caption text-text-muted">
                      Respuesta: {request.respuesta_resolucion}
                    </p>
                  )}
                  {request.tipo === "acceso_modulo" &&
                    request.estado === "aprobada" &&
                    request.id_modulo !== null && (
                      <Link
                        href={`${base}/modulos/privados/${request.id_modulo}`}
                        className="mt-2 inline-flex text-caption font-semibold text-primary hover:underline"
                      >
                        Abrir módulo aprobado →
                      </Link>
                    )}
                </div>
                <p className="text-caption text-text-muted">
                  Enviada: {request.fecha_creacion}
                  {request.fecha_resolucion && ` · Resuelta: ${request.fecha_resolucion}`}
                </p>
                <span className="h-fit w-fit rounded-full bg-primary-soft px-2.5 py-1 text-micro font-semibold text-primary">
                  {request.estado}
                </span>
              </article>
            ))}
          </div>
        ) : (
          <p className="text-xs text-text-muted">Aún no has enviado solicitudes.</p>
        )}
      </Panel>
      <InfoNotice>
        Solo se muestran solicitudes asociadas a tu cuenta. La habilitación para crear grupos no es
        un tipo de solicitud disponible en el servicio actual.
      </InfoNotice>
      <div className="flex flex-wrap gap-2.5">
        <ActionLink href={`${base}/explorar-grupos`}>Explorar grupos</ActionLink>
        <ActionLink href={`${base}/explorar-modulos`}>Explorar módulos públicos</ActionLink>
        <ActionLink href={`${base}/solicitudes/habilitacion`}>Habilitación de grupos</ActionLink>
      </div>
    </section>
  );
}

export async function ModuleAccessPage({ moduleId }: { moduleId?: number } = {}) {
  const user = await getSessionUser();
  const accesses = user && moduleId === undefined
    ? await listUserModuleAccess(user.id_usuario)
    : [];
  return (
    <section className="flex w-full flex-col gap-5">
      <PageHeader
        title={moduleId ? "Solicitar acceso a módulo" : "Accesos de mis módulos"}
        description={
          moduleId
            ? "Solicita un nivel de acceso para revisión administrativa."
            : "Consulta y crea solicitudes para módulos restringidos."
        }
      />
      {moduleId ? (
        <ModuleAccessRequestForm moduleId={moduleId} />
      ) : (
        <>
          {accesses.length > 0 && (
            <Panel title="Módulos con acceso vigente">
              <div className="divide-y divide-border">
                {accesses.map((access) => (
                  <article
                    key={access.id_modulo}
                    className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
                  >
                    <div>
                      <h2 className="text-sm font-semibold text-text">{access.label}</h2>
                      <p className="mt-1 text-caption text-text-muted">
                        Acceso de {access.nivel_acceso}
                        {access.fecha_expiracion && ` · Vence ${access.fecha_expiracion}`}
                      </p>
                    </div>
                    <ActionLink href={`${base}/modulos/privados/${access.id_modulo}`}>
                      Abrir módulo
                    </ActionLink>
                  </article>
                ))}
              </div>
            </Panel>
          )}
          <InfoNotice>
            Puedes solicitar acceso a un módulo restringido usando su identificador. Los módulos
            públicos o disponibles para toda persona con sesión no necesitan aprobación.
          </InfoNotice>
          <ModuleAccessRequestForm />
        </>
      )}
    </section>
  );
}

export async function AuthorizedModulePage({
  moduleId,
  role = "identificado",
}: {
  moduleId: number;
  role?: "identificado" | "coordinador" | "administrador";
}) {
  const user = await getSessionUser();
  let detail: Awaited<ReturnType<typeof getAuthorizedModuleForUser>>;
  try {
    detail = await getAuthorizedModuleForUser(moduleId, user);
  } catch (error) {
    if (error instanceof AuthError && error.status === 404) notFound();
    throw error;
  }
  const areaBase = role === "identificado" ? base : role === "coordinador" ? "/coordinador" : "/admin";
  return (
    <section className="flex w-full flex-col gap-5">
      <PageHeader
        title={detail.label}
        description={`Módulo ${detail.module.visibilidad}${detail.group ? ` · Grupo ${detail.group}` : ""}`}
        breadcrumbHref={areaBase}
        breadcrumbLabel={
          role === "identificado" ? "Mi espacio" : role === "coordinador" ? "Coordinación" : "Administración"
        }
        backHref={role === "identificado" ? `${base}/modulos/accesos` : `${areaBase}/grupos`}
        backLabel={role === "identificado" ? "Mis accesos" : "Volver a grupos"}
      />
      {detail.access && (
        <InfoNotice>Acceso autorizado: {detail.access}. La base de datos actual no almacena lecturas de sensores.</InfoNotice>
      )}
      {detail.sensors.length ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {detail.sensors.map(({ id_sensor, tipo }) => (
            <Panel key={id_sensor} title={tipo}>
              <p className="text-xs text-text-muted">Sin lecturas registradas.</p>
            </Panel>
          ))}
        </div>
      ) : (
        <EmptyCapability
          title="Sin sensores disponibles"
          detail="El módulo está autorizado, pero todavía no tiene sensores asociados en la base de datos."
        />
      )}
      <InfoNotice tone="warning">
        La base de datos actual no almacena telemetría histórica o en tiempo real.
      </InfoNotice>
    </section>
  );
}

export async function CreateGroupPage() {
  return (
    <section className="flex w-full flex-col gap-5">
      <PageHeader
        title="Crear grupo de trabajo"
        description="La creación de grupos requiere una habilitación administrativa previa."
        backHref={`${base}/grupos`}
        backLabel="Mis grupos"
      />
      <InfoNotice tone="warning">
        No hay una operación disponible para enviar o consultar la solicitud de habilitación desde
        el espacio personal. Crear un grupo aquí no asignaría coordinación ni permisos.
      </InfoNotice>
      <EmptyCapability
        title="Solicitud de habilitación no disponible"
        detail="El servicio actual no persiste este trámite para usuarios identificados. No se habilita el alta del grupo hasta que exista una aprobación verificable."
        href={`${base}/grupos`}
        linkLabel="Volver a mis grupos"
      />
    </section>
  );
}

export async function MyGroupsPage() {
  const user = await getSessionUser();
  if (!user) return null;
  const groups = await listGroupsForUser(user, "member");
  const roleEligibleGroups = groups.filter(
    (group) => group.my_status === "activo" && group.my_role === "miembro",
  );
  return (
    <section className="flex w-full flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <ActionLink href={`${base}/grupos/nuevo`}>Solicitar habilitación para crear grupos</ActionLink>
      </div>
      <InfoNotice>
        La base de datos no define un tipo para solicitar la creación de un grupo. Sí puedes pedir
        el rol de coordinador en un grupo del que ya seas miembro activo.
      </InfoNotice>
      <GroupDirectoryPage role="identificado" scope="member" />
      {roleEligibleGroups.length > 0 && (
        <Panel title="Solicitar coordinación">
          <div className="flex flex-col gap-4">
            {roleEligibleGroups.map((group) => (
              <GroupRoleRequestForm key={group.id_grupo} groupId={group.id_grupo} />
            ))}
          </div>
        </Panel>
      )}
    </section>
  );
}

export async function GroupActivationPage() {
  return (
    <section className="flex w-full flex-col gap-5">
      <PageHeader
        title="Habilitación para crear grupos"
        description="La habilitación es una solicitud personal y no crea un grupo ni asigna coordinación automáticamente."
        backHref={`${base}/solicitudes`}
        backLabel="Mis solicitudes"
      />
      <InfoNotice>
        No hay una API de solicitudes de habilitación de grupos en la capa actual. Por privacidad,
        esta pantalla no inventa un estado pendiente, aprobado o rechazado.
      </InfoNotice>
      <EmptyCapability
        title="No se puede consultar ni enviar la solicitud"
        detail="Cuando esta capacidad esté conectada, aquí se mostrará el estado real y el alcance de la habilitación."
        href={`${base}/grupos`}
        linkLabel="Ver mis grupos"
      />
    </section>
  );
}

export async function PrivateGroupJoinPage({ groupId }: { groupId: number }) {
  return (
    <section className="flex w-full flex-col gap-5">
      <PageHeader
        title="Solicitud de ingreso a grupo privado"
        description="El acceso a grupos privados depende de una autorización explícita."
        backHref={`${base}/explorar-grupos`}
        backLabel="Explorar grupos"
      />
      <InfoNotice tone="warning">
        El servidor valida el grupo y registra la solicitud sin revelar información privada antes
        de que se conceda el acceso.
      </InfoNotice>
      <GroupMembershipRequestForm groupId={groupId} />
      <ActionLink href={`${base}/solicitudes`}>Consultar mis solicitudes</ActionLink>
    </section>
  );
}

export async function ProfilePage() {
  const user = await getSessionUser();
  if (!user) return null;
  const groups = await listGroupsForUser(user, "member");
  const role = user.rol_global === "administrador" ? "Administrador" : "Usuario identificado";

  return (
    <section className="flex w-full flex-col gap-5">
      <PageHeader
        title="Mi perfil"
        description="Consulta los datos de tu cuenta y tu contexto de pertenencia. Las etiquetas descriptivas no conceden permisos."
      />
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.3fr)_minmax(18rem,0.7fr)]">
        <div className="flex flex-col gap-4">
          <Panel title="Datos personales">
            <div className="flex items-center gap-3">
              <span className="flex size-12 items-center justify-center rounded-full bg-primary-soft text-sm font-semibold text-primary">
                <UserRound className="size-5" aria-hidden />
              </span>
              <div>
                <p className="text-sm font-semibold text-text">{user.nombre}</p>
                <p className="mt-1 text-caption text-text-muted">{role} · Cuenta personal</p>
              </div>
            </div>
            <dl className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="rounded-md bg-surface-subtle p-3">
                <dt className="text-caption text-text-muted">Nombre</dt>
                <dd className="mt-1 text-xs text-text">{user.nombre}</dd>
              </div>
              <div className="rounded-md bg-surface-subtle p-3">
                <dt className="text-caption text-text-muted">Correo de cuenta</dt>
                <dd className="mt-1 break-all text-xs text-text">{user.correo}</dd>
              </div>
            </dl>
            <p className="mt-3 text-caption text-text-muted">
              La edición de perfil no está conectada a un servicio de actualización.
            </p>
          </Panel>
          <Panel title="Grupos y roles por contexto">
            {groups.length ? (
              <div className="divide-y divide-border">
                {groups.map((group) => (
                  <div
                    key={group.id_grupo}
                    className="grid gap-1 py-3 first:pt-0 sm:grid-cols-[1.4fr_0.8fr_1fr]"
                  >
                    <p className="text-xs text-text">{group.nombre}</p>
                    <p className="text-xs text-text-muted">
                      {group.my_role === "coordinador" ? "Coordinador" : "Miembro"}
                    </p>
                    <p className="text-xs text-text-muted">
                      {group.my_status === "pendiente" ? "Membresía pendiente" : "Consulta según acceso"}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-text-muted">No tienes membresías de grupo registradas.</p>
            )}
            <p className="mt-3 text-caption text-text-muted">
              El rol de coordinación solo aplica al grupo correspondiente.
            </p>
          </Panel>
        </div>
        <div className="flex flex-col gap-4">
          <Panel title="Seguridad y sesión">
            <dl className="space-y-3 text-xs">
              <div className="flex justify-between gap-3">
                <dt className="text-text-muted">Estado de cuenta</dt>
                <dd className="font-semibold text-text">{user.estado_cuenta}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-text-muted">Sesión</dt>
                <dd className="font-semibold text-text">Iniciada</dd>
              </div>
            </dl>
            <p className="mt-4 text-caption text-text-muted">
              El cambio de contraseña no está disponible en esta versión.
            </p>
            <form action="/api/auth/logout" method="post" className="mt-4">
              <button
                type="submit"
                className="inline-flex min-h-9 items-center rounded-md border border-border px-3.5 text-xs font-semibold text-primary hover:bg-primary-soft"
              >
                Cerrar sesión
              </button>
            </form>
          </Panel>
          <Panel title="Habilitación para crear grupos">
            <p className="text-xs leading-[1.55] text-text-muted">
              El estado del trámite no está disponible en la base de datos actual.
            </p>
            <Link
              href={`${base}/solicitudes/habilitacion`}
              className="mt-3 inline-block text-xs font-semibold text-primary hover:underline"
            >
              Consultar disponibilidad →
            </Link>
          </Panel>
        </div>
      </div>
      <InfoNotice>
        Los permisos explícitos de acceso se mantienen separados de la membresía. Un grupo o rol no
        implica autorización automática para consultar módulos.
      </InfoNotice>
    </section>
  );
}
