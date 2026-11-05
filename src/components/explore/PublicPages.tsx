import Link from "next/link";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { getPublicCatalogData } from "@/lib/server/auth-store";

type PublicCatalogData = Awaited<ReturnType<typeof getPublicCatalogData>>;

function moduleCountForGroup(data: PublicCatalogData, groupId: number) {
  return data.modules.filter((module) => module.id_grupo === groupId).length;
}

function locationCountForGroup(data: PublicCatalogData, groupId: number) {
  const locations = data.modules
    .filter((module) => module.id_grupo === groupId)
    .map((module) =>
      data.moduleLabels.find((label) => label.id_modulo === module.id_modulo)?.location,
    )
    .filter((location): location is string => Boolean(location) && location !== "No especificada");

  return new Set(locations).size;
}

function SummaryMetrics({ data }: { data: PublicCatalogData }) {
  const metrics = [
    {
      key: "modules",
      label: (
        <Link href="/modulos" className="hover:text-primary hover:underline">
          Módulos públicos
        </Link>
      ),
      value: data.modules.length.toString().padStart(2, "0"),
      detail: "Módulos visibles al público",
    },
    {
      key: "groups",
      label: (
        <Link href="/grupos" className="hover:text-primary hover:underline">
          Grupos públicos
        </Link>
      ),
      value: data.groups.length.toString().padStart(2, "0"),
      detail: "Comunidades que comparten sus datos",
    },
    {
      key: "telemetry",
      label: "Telemetría",
      value: "No disponible",
      detail: "La base de datos actual no registra lecturas",
    },
  ];

  return (
    <div className="grid w-full gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {metrics.map((metric) => (
        <article
          key={metric.key}
          className="flex flex-col gap-2 rounded-[0.625rem] border border-border bg-surface p-5"
        >
          <p className="text-xs text-text-muted">{metric.label}</p>
          <p className="font-mono text-[1.8125rem] leading-normal text-text">{metric.value}</p>
          <p className="text-[0.6875rem] leading-[1.45] text-text-muted">{metric.detail}</p>
        </article>
      ))}
    </div>
  );
}

function PublicGroupCards({ data }: { data: PublicCatalogData }) {
  if (!data.groups.length) {
    return (
      <div className="rounded-brand border border-dashed border-border bg-surface p-6 text-center text-xs text-text-muted">
        Aún no hay grupos públicos disponibles.
      </div>
    );
  }

  return (
    <div className="grid w-full gap-4 lg:grid-cols-2">
      {data.groups.map((group) => {
        const moduleCount = moduleCountForGroup(data, group.id_grupo);
        const locationCount = locationCountForGroup(data, group.id_grupo);

        return (
          <article
            id={`grupo-${group.id_grupo}`}
            key={group.id_grupo}
            className="flex min-w-0 flex-col gap-4.5 rounded-[0.625rem] border border-border bg-surface p-5.5"
          >
            <div className="flex min-w-0 items-start">
              <div className="min-w-0 flex-1">
                <h3 className="text-base font-semibold leading-[1.45] text-text">
                  <Link
                    href={`/grupos/${group.id_grupo}`}
                    className="hover:text-primary hover:underline"
                  >
                    {group.nombre}
                  </Link>
                </h3>
                <p className="mt-1 text-xs leading-[1.45] text-text-muted">
                  {group.descripcion || "Comunidad de monitoreo ambiental."}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3 text-[0.6875rem] leading-[1.45]">
              <p className="text-text-muted">
                {moduleCount} {moduleCount === 1 ? "módulo público" : "módulos públicos"}
                {locationCount > 0 &&
                  ` · ${locationCount} ${locationCount === 1 ? "locación" : "locaciones"}`}
              </p>
              <Link
                href={`/grupos/${group.id_grupo}`}
                className="shrink-0 text-xs text-primary hover:underline"
              >
                Ver grupo →
              </Link>
            </div>
          </article>
        );
      })}
    </div>
  );
}

function AccessInvitation() {
  return (
    <div className="flex flex-col gap-3 rounded-md bg-primary-soft px-4 py-3 text-xs sm:flex-row sm:items-center sm:justify-between sm:px-5">
      <Link href="/registro" className="font-semibold text-primary hover:underline">
        Registrarse →
      </Link>
      <p className="text-text">
        Registra tus propios módulos · Participa en la red
      </p>
    </div>
  );
}

export async function ExplorePage() {
  const data = await getPublicCatalogData();

  return (
    <section className="flex w-full flex-col gap-6">
      <header className="flex flex-col gap-2.5">
        <Breadcrumbs items={[{ label: "Explorar" }]} />
        <h1 className="text-[1.8125rem] leading-normal tracking-[-0.05rem] text-text">
          El ambiente, en datos abiertos
        </h1>
        <p className="text-[0.8125rem] leading-[1.45] text-text-muted">
          Explora la red de monitoreo ambiental y consulta las mediciones de acceso público.
        </p>
      </header>

      <SummaryMetrics data={data} />

      <section className="flex flex-col gap-3.5" aria-labelledby="public-groups-heading">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2
            id="public-groups-heading"
            className="text-base font-semibold leading-[1.45] text-text sm:text-xl"
          >
            <Link href="/grupos" className="hover:text-primary hover:underline">
              Grupos que comparten conocimiento
            </Link>
          </h2>
          <Link href="/grupos" className="text-xs text-primary hover:underline">
            Ver grupos públicos →
          </Link>
        </div>
        <PublicGroupCards data={data} />
      </section>

      <AccessInvitation />
    </section>
  );
}

export async function PublicGroupsPage() {
  const data = await getPublicCatalogData();

  return (
    <section className="flex w-full flex-col gap-6">
      <header className="flex flex-col gap-2.5">
        <Breadcrumbs
          items={[{ label: "Explorar", href: "/" }, { label: "Grupos públicos" }]}
        />
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-[1.8125rem] leading-normal tracking-[-0.05rem] text-text">
            Grupos públicos
          </h1>
          <p className="text-xs text-primary">
            {data.groups.length}{" "}
            {data.groups.length === 1 ? "grupo disponible" : "grupos disponibles"}
          </p>
        </div>
        <p className="text-[0.8125rem] leading-[1.45] text-text-muted">
          Explora comunidades que comparten sus módulos y locaciones de acceso público.
        </p>
      </header>

      <SummaryMetrics data={data} />

      <section className="flex flex-col gap-3.5" aria-labelledby="all-public-groups-heading">
        <h2
          id="all-public-groups-heading"
          className="text-base font-semibold leading-[1.45] text-text sm:text-xl"
        >
          Grupos que comparten conocimiento
        </h2>
        <PublicGroupCards data={data} />
      </section>

      <AccessInvitation />
    </section>
  );
}
