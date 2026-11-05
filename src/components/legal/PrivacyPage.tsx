import Link from "next/link";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";

const sections = [
  {
    title: "Datos utilizados",
    paragraphs: [
      "El registro solicita nombre y correo electrónico. La contraseña se transforma en un hash con sal aleatoria; BioRed no la conserva en texto legible.",
      "Al iniciar sesión se utiliza una cookie HttpOnly para mantener la sesión. No se usa para mostrar contenido privado a personas sin autorización.",
    ],
  },
  {
    title: "Finalidad y permisos",
    paragraphs: [
      "Estos datos permiten crear la cuenta, identificar al usuario y aplicar los roles, estados y permisos configurados para grupos y módulos.",
      "La información de grupos y módulos se muestra públicamente únicamente cuando su visibilidad efectiva está configurada como pública.",
    ],
  },
  {
    title: "Almacenamiento",
    paragraphs: [
    "Los datos de cuenta, las sesiones y la gobernanza se almacenan en la base de datos MySQL configurada para el servicio.",
    "La base de datos actual no almacena telemetría histórica ni mediciones en vivo.",
    ],
  },
  {
    title: "Solicitud o actualización de datos",
    paragraphs: [
      "El canal oficial para consultas, actualización o eliminación de datos personales y la información completa del responsable deben definirse antes de publicar BioRed para uso real.",
    ],
  },
];

export function PrivacyPage() {
  return (
    <section className="mx-auto flex w-full max-w-[54rem] flex-col gap-6">
      <header className="flex flex-col gap-3">
        <Breadcrumbs items={[{ label: "Explorar", href: "/" }, { label: "Aviso de privacidad" }]} />
        <h1 className="text-[1.8125rem] leading-normal tracking-[-0.05rem] text-text">
          Aviso de privacidad
        </h1>
        <p className="text-[0.8125rem] leading-[1.6] text-text-muted">
          Información sobre los datos que utiliza la versión actual de BioRed.
        </p>
      </header>

      <aside
        role="note"
        className="rounded-md border border-border bg-primary-soft px-4 py-3.5 text-xs leading-[1.6] text-text"
      >
        Este es un aviso provisional para el entorno de desarrollo, no una política oficial. El
        responsable de datos debe revisar y completar el canal de contacto, los plazos de conservación
        y los procedimientos para ejercer derechos antes de habilitar el servicio para uso real.
      </aside>

      <div className="flex flex-col divide-y divide-border rounded-[0.625rem] border border-border bg-surface px-5 sm:px-6">
        {sections.map((section) => (
          <section key={section.title} className="flex flex-col gap-2.5 py-5">
            <h2 className="text-sm font-semibold text-text">{section.title}</h2>
            {section.paragraphs.map((paragraph) => (
              <p key={paragraph} className="text-xs leading-[1.7] text-text-muted">
                {paragraph}
              </p>
            ))}
          </section>
        ))}
      </div>

      <Link href="/registro" className="w-fit text-xs text-primary hover:underline">
        Volver al registro →
      </Link>
    </section>
  );
}
