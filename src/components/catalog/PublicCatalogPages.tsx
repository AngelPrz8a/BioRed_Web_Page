import Link from "next/link";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { getPublicCatalogData } from "@/lib/server/auth-store";

type CatalogSearchParams = {
  sensor?: string;
  grupo?: string;
  modulo?: string;
};

type PublicCatalogData = Awaited<ReturnType<typeof getPublicCatalogData>>;

const sensorLabels: Record<string, string> = {
  temperatura: "Temperatura",
  humedad: "Humedad",
  luz: "Luz",
  gas: "Gas",
};

function labelForSensor(type: string) {
  return sensorLabels[type.toLowerCase()] ?? type.charAt(0).toUpperCase() + type.slice(1);
}

function moduleLabel(data: PublicCatalogData, moduleId: number) {
  return data.moduleLabels.find((label) => label.id_modulo === moduleId);
}

function moduleSensors(data: PublicCatalogData, moduleId: number) {
  return data.sensors.filter((sensor) => sensor.id_modulo === moduleId);
}

function readingsPathForModuleAction(moduleAction: string) {
  return moduleAction.endsWith("/explorar-modulos")
    ? moduleAction.replace(/\/explorar-modulos$/, "/lecturas")
    : "/lecturas";
}

function explorePathForAction(action: string) {
  if (action === "/modulos" || action === "/lecturas") return "/";
  return action.replace(/\/(?:explorar-modulos|lecturas)$/, "") || "/";
}

function DemoNotice() {
  return (
    <p className="rounded-md bg-primary-soft px-3.5 py-3 text-xs leading-[1.5] text-text">
      La base de datos actual no registra telemetría histórica ni estado de conexión. Esta interfaz
      muestra sensores configurados, no valores de medición.
    </p>
  );
}

function CatalogFilters({
  data,
  action,
  kind,
  sensor = "",
  group = "",
  module = "",
}: {
  data: PublicCatalogData;
  action: string;
  kind: "modules" | "readings";
  sensor?: string;
  group?: string;
  module?: string;
}) {
  const sensorTypes = [...new Set(data.sensors.map((item) => item.tipo.toLowerCase()))].sort();

  return (
    <form
      action={action}
      method="get"
      className="grid gap-3 rounded-brand border border-border bg-surface p-4 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_auto]"
    >
      <label className="flex flex-col gap-1.5 text-caption text-text-muted">
        Variable
        <select
          name="sensor"
          defaultValue={sensor}
          className="h-10 rounded-md border border-border bg-surface px-3 text-xs text-text"
        >
          <option value="">Todas las variables</option>
          {sensorTypes.map((type) => (
            <option key={type} value={type}>
              {labelForSensor(type)}
            </option>
          ))}
          {sensor && !sensorTypes.includes(sensor.toLowerCase()) && (
            <option value={sensor}>{labelForSensor(sensor)}</option>
          )}
        </select>
      </label>

      {kind === "modules" && (
        <label className="flex flex-col gap-1.5 text-caption text-text-muted">
          Grupo
          <select
            name="grupo"
            defaultValue={group}
            className="h-10 rounded-md border border-border bg-surface px-3 text-xs text-text"
          >
            <option value="">Todos los grupos</option>
            {data.groups.map((item) => (
              <option key={item.id_grupo} value={item.id_grupo}>
                {item.nombre}
              </option>
            ))}
          </select>
        </label>
      )}

      {kind === "readings" && (
        <label className="flex flex-col gap-1.5 text-caption text-text-muted">
          Módulo
          <select
            name="modulo"
            defaultValue={module}
            className="h-10 rounded-md border border-border bg-surface px-3 text-xs text-text"
          >
            <option value="">Todos los módulos</option>
            {data.modules.map((item) => (
              <option key={item.id_modulo} value={item.id_modulo}>
                {moduleLabel(data, item.id_modulo)?.label ?? `Módulo ${item.id_modulo}`}
              </option>
            ))}
          </select>
        </label>
      )}

      <div className="flex items-end gap-3">
        <button
          type="submit"
          className="h-10 rounded-md bg-primary px-4 text-xs font-semibold text-white hover-bright"
        >
          Aplicar filtros
        </button>
        <Link href={action} className="pb-2.5 text-xs text-primary hover:underline">
          Limpiar
        </Link>
      </div>
    </form>
  );
}

function EmptyResults({ message }: { message: string }) {
  return (
    <div className="rounded-brand border border-dashed border-border bg-surface p-8 text-center">
      <p className="text-sm font-semibold text-text">No hay resultados</p>
      <p className="mt-1.5 text-xs text-text-muted">{message}</p>
    </div>
  );
}

export async function PublicModulesPage({
  action = "/modulos",
  searchParams = {},
}: {
  action?: string;
  searchParams?: CatalogSearchParams;
}) {
  const data = await getPublicCatalogData();
  const selectedSensor = searchParams.sensor?.trim().toLowerCase() ?? "";
  const selectedGroup = searchParams.grupo ?? "";
  const filteredModules = data.modules.filter((module) => {
    const matchesSensor =
      !selectedSensor ||
      moduleSensors(data, module.id_modulo).some(
        (sensor) => sensor.tipo.toLowerCase() === selectedSensor,
      );
    const matchesGroup = !selectedGroup || String(module.id_grupo ?? "") === selectedGroup;
    return matchesSensor && matchesGroup;
  });

  return (
    <section className="flex w-full flex-col gap-6">
      <header className="flex flex-col gap-2.5">
        <Breadcrumbs
          items={[
            { label: "Explorar", href: explorePathForAction(action) },
            { label: "Módulos públicos" },
          ]}
        />
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-[1.8125rem] leading-normal tracking-[-0.05rem] text-text">
            Módulos públicos
          </h1>
          <p className="text-xs text-primary">
            {filteredModules.length}{" "}
            {filteredModules.length === 1 ? "módulo disponible" : "módulos disponibles"}
          </p>
        </div>
        <p className="text-[0.8125rem] leading-[1.45] text-text-muted">
          Consulta sensores y lecturas de acceso público sin necesidad de iniciar sesión.
        </p>
      </header>

      <CatalogFilters
        data={data}
        action={action}
        kind="modules"
        sensor={selectedSensor}
        group={selectedGroup}
      />

      {filteredModules.length ? (
        <div className="overflow-x-auto rounded-brand border border-border bg-surface">
          <table className="w-full min-w-[42rem] border-collapse text-left">
            <thead className="bg-surface-subtle text-micro font-medium uppercase text-text-muted">
              <tr>
                <th className="px-3 py-3 sm:px-4">Módulo</th>
                <th className="px-3 py-3 sm:px-4">Locaciones</th>
                <th className="px-3 py-3 sm:px-4">Sensores</th>
                <th className="px-3 py-3 sm:px-4">Telemetría</th>
                <th className="px-3 py-3 sm:px-4">Consulta</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredModules.map((module) => {
                const label = moduleLabel(data, module.id_modulo);
                const sensors = moduleSensors(data, module.id_modulo);
                return (
                  <tr key={module.id_modulo} className="text-xs text-text">
                    <td className="px-3 py-3.5 sm:px-4">
                      <Link
                        href={`${action}/${module.id_modulo}`}
                        className="font-semibold text-text hover:text-primary hover:underline"
                      >
                        {label?.label ?? `Módulo ${module.id_modulo}`}
                      </Link>
                      <p className="mt-1 text-caption text-text-muted">ESP32-{module.id_modulo.toString().padStart(2, "0")}</p>
                    </td>
                    <td className="px-3 py-3.5 text-text-muted sm:px-4">{label?.location ?? "No especificada"}</td>
                    <td className="px-3 py-3.5 text-text-muted sm:px-4">
                      {sensors.map((sensor) => labelForSensor(sensor.tipo)).join(" · ") || "Sin sensores"}
                    </td>
                    <td className="px-3 py-3.5 text-text-muted sm:px-4">
                      Sin lecturas registradas
                    </td>
                    <td className="px-3 py-3.5 sm:px-4">
                      <Link
                        href={`${readingsPathForModuleAction(action)}?modulo=${module.id_modulo}${selectedSensor ? `&sensor=${encodeURIComponent(selectedSensor)}` : ""}`}
                        className="whitespace-nowrap text-primary hover:underline"
                      >
                        Ver lecturas →
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <EmptyResults
          message={
            selectedSensor
              ? `No hay módulos públicos con sensor de ${labelForSensor(selectedSensor).toLowerCase()}.`
              : "Prueba con otros filtros para consultar los módulos públicos."
          }
        />
      )}

      <DemoNotice />
    </section>
  );
}

export async function PublicReadingsPage({
  action = "/lecturas",
  searchParams = {},
}: {
  action?: string;
  searchParams?: CatalogSearchParams;
}) {
  const data = await getPublicCatalogData();
  const selectedSensor = searchParams.sensor?.trim().toLowerCase() ?? "";
  const selectedModule = searchParams.modulo ?? "";
  return (
    <section className="flex w-full flex-col gap-6">
      <header className="flex flex-col gap-2.5">
        <Breadcrumbs
          items={[
            { label: "Explorar", href: explorePathForAction(action) },
            { label: "Lecturas públicas" },
          ]}
        />
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-[1.8125rem] leading-normal tracking-[-0.05rem] text-text">
            Lecturas públicas
          </h1>
          <p className="text-xs text-primary">Sin lecturas registradas</p>
        </div>
        <p className="text-[0.8125rem] leading-[1.45] text-text-muted">
          Consulta el estado de disponibilidad de las lecturas asociadas a módulos públicos.
        </p>
      </header>

      <CatalogFilters
        data={data}
        action={action}
        kind="readings"
        sensor={selectedSensor}
        module={selectedModule}
      />

      <EmptyResults
        message={
          selectedSensor
            ? `No hay lecturas públicas de ${labelForSensor(selectedSensor).toLowerCase()} registradas.`
            : selectedModule
              ? "El módulo seleccionado todavía no tiene lecturas registradas."
              : "Todavía no hay telemetría registrada para los módulos públicos."
        }
      />

      <DemoNotice />
    </section>
  );
}

export async function PublicModuleDetailPage({
  moduleId,
  moduleAction = "/modulos",
}: {
  moduleId: string;
  moduleAction?: string;
}) {
  const data = await getPublicCatalogData();
  const readingsAction = readingsPathForModuleAction(moduleAction);
  const module = data.modules.find((item) => String(item.id_modulo) === moduleId);
  if (!module) {
    return (
      <section className="flex flex-col gap-4">
        <Breadcrumbs
          items={[
            { label: "Explorar", href: explorePathForAction(moduleAction) },
            { label: "Módulos públicos", href: moduleAction },
            { label: "Módulo no disponible" },
          ]}
        />
        <h1 className="text-[1.8125rem] text-text">Módulo no disponible</h1>
        <p className="text-xs text-text-muted">
          No se encontró un módulo público con ese identificador.
        </p>
        <Link href={moduleAction} className="text-xs text-primary hover:underline">
          ← Volver a módulos públicos
        </Link>
      </section>
    );
  }

  const label = moduleLabel(data, module.id_modulo);

  return (
    <section className="flex w-full flex-col gap-6">
      <header className="flex flex-col gap-2.5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Breadcrumbs
            items={[
              { label: "Explorar", href: explorePathForAction(moduleAction) },
              { label: "Módulos públicos", href: moduleAction },
              { label: label?.label ?? `Módulo ${module.id_modulo}` },
            ]}
          />
          <Link href={moduleAction} className="text-xs text-primary hover:underline">
            ← Módulos públicos
          </Link>
        </div>
        <h1 className="text-[1.8125rem] leading-normal tracking-[-0.05rem] text-text">
          {label?.label ?? `Módulo ${module.id_modulo}`}
        </h1>
        <p className="text-[0.8125rem] text-text-muted">
          Módulo público · {label?.location ?? "Locación no especificada"}
        </p>
      </header>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-label="Sensores del módulo">
        {moduleSensors(data, module.id_modulo).map((sensor) => (
          <article
            key={sensor.id_sensor}
            className="flex flex-col gap-2 rounded-brand border border-border bg-surface p-4"
          >
            <p className="text-caption text-text-muted">{labelForSensor(sensor.tipo)}</p>
            <p className="font-mono text-2xl text-text">Sin lecturas registradas</p>
          </article>
        ))}
      </section>

      <section className="flex flex-col gap-3 rounded-brand border border-border bg-surface p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-base font-semibold text-text">Lecturas disponibles</h2>
          <Link
            href={`${readingsAction}?modulo=${module.id_modulo}`}
            className="text-xs text-primary hover:underline"
          >
            Ver todas las lecturas →
          </Link>
        </div>
        <p className="text-xs text-text-muted">
          Todavía no hay telemetría registrada para los sensores de este módulo.
        </p>
      </section>

      <DemoNotice />
    </section>
  );
}
