import Link from "next/link";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";

export default function PublicNotFound() {
  return (
    <section className="mx-auto flex w-full max-w-[48rem] flex-col gap-5 py-8">
      <Breadcrumbs items={[{ label: "Explorar", href: "/" }, { label: "Página no encontrada" }]} />
      <div className="rounded-[0.625rem] border border-border bg-surface p-6 sm:p-8">
        <p className="font-mono text-4xl text-primary">404</p>
        <h1 className="mt-3 text-xl font-semibold text-text">No encontramos esta página</h1>
        <p className="mt-2 text-sm leading-[1.6] text-text-muted">
          La dirección puede haber cambiado o el contenido no está disponible públicamente.
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          <Link
            href="/"
            className="inline-flex min-h-10 items-center justify-center rounded-md bg-primary px-4 text-xs font-semibold text-surface hover-bright"
          >
            Volver a Explorar
          </Link>
          <Link
            href="/modulos"
            className="inline-flex min-h-10 items-center justify-center rounded-md border border-border px-4 text-xs font-semibold text-primary hover:bg-surface-subtle"
          >
            Ver módulos públicos
          </Link>
        </div>
      </div>
    </section>
  );
}
