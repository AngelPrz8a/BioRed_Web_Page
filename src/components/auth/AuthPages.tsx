"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Cpu, Mail } from "lucide-react";
import { useState, type FormEvent, type ReactNode } from "react";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";

const fieldClassName =
  "min-h-10.5 w-full rounded-md border border-border bg-surface px-3 text-xs text-text placeholder:text-text-muted focus-visible:outline-primary";

function Field({
  id,
  label,
  type = "text",
  autoComplete,
  minLength,
}: {
  id: string;
  label: string;
  type?: string;
  autoComplete?: string;
  minLength?: number;
}) {
  return (
    <label htmlFor={id} className="flex w-full flex-col gap-1.75">
      <span className="text-[0.6875rem] font-semibold text-text">{label} *</span>
      <input
        id={id}
        name={id}
        type={type}
        autoComplete={autoComplete}
        minLength={minLength}
        required
        className={fieldClassName}
      />
    </label>
  );
}

function FormNotice({ children }: { children: ReactNode }) {
  return (
    <p role="status" className="rounded-md bg-primary-soft px-3 py-2 text-xs text-text">
      {children}
    </p>
  );
}

function Benefit({
  icon,
  iconSize = 18,
  title,
  description,
}: {
  icon: string | ReactNode;
  iconSize?: number;
  title: string;
  description: string;
}) {
  return (
    <div className="flex items-start gap-3.5">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-primary-soft">
        {typeof icon === "string" ? (
          <Image src={icon} width={iconSize} height={iconSize} alt="" aria-hidden unoptimized />
        ) : (
          icon
        )}
      </span>
      <div className="flex flex-col gap-1 text-xs leading-[1.5]">
        <p className="font-semibold text-text">{title}</p>
        <p className="text-text-muted">{description}</p>
      </div>
    </div>
  );
}

function AuthVisualPanel({ title, description }: { title: string; description: string }) {
  return (
    <div className="flex w-full flex-col gap-6 xl:w-[28.125rem] xl:shrink-0">
      <div className="flex flex-col gap-3.5">
        <h1 className="text-[2rem] leading-[1.2] tracking-[-0.05rem] text-text">{title}</h1>
        <p className="text-[0.8125rem] leading-[1.5] text-text-muted">{description}</p>
      </div>

      <Image
        src="/images/campus-greenhouse.png"
        alt="Invernadero del campus con plantas y estaciones de monitoreo"
        width={1416}
        height={708}
        className="h-[14.75rem] w-full rounded-[0.625rem] object-cover"
        priority
      />

      <div className="flex flex-col gap-4">
        <Benefit
          icon={<Cpu className="size-4.5 text-text-muted" strokeWidth={1.6} aria-hidden />}
          title="Registra tus propios módulos"
          description="Organiza sensores y define quién puede consultar tus mediciones."
        />
        <Benefit
          icon="/images/benefit-dashboard.svg"
          title="Construye tus paneles"
          description="Crea visualizaciones con fuentes a las que ya tienes acceso."
        />
        <Benefit
          icon="/images/benefit-network.svg"
          iconSize={16}
          title="Participa en la red"
          description="Solicita acceso a módulos, ingreso a grupos o revisión de coordinación."
        />
      </div>
    </div>
  );
}

function AuthBreadcrumb({ page }: { page: string }) {
  return (
    <div className="flex items-center justify-between gap-4 text-xs">
      <Link href="/" className="text-primary hover:underline">
        ← Volver a explorar
      </Link>
      <Breadcrumbs items={[{ label: "Explorar", href: "/" }, { label: page }]} />
    </div>
  );
}

export function RegistrationPage() {
  const [notice, setNotice] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);

    if (formData.get("password") !== formData.get("confirm-password")) {
      setNotice("Las contraseñas no coinciden.");
      return;
    }

    setSubmitting(true);
    setNotice(null);
    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.get("name"),
          email: formData.get("email"),
          password: formData.get("password"),
          privacyConsent: formData.get("privacy-consent") === "on",
        }),
      });
      const result = (await response.json()) as { error?: string; redirectTo?: string };
      if (!response.ok) throw new Error(result.error ?? "No fue posible crear la cuenta.");
      if (!result.redirectTo) throw new Error("La cuenta fue creada, pero no se recibió el destino.");
      window.location.assign(result.redirectTo);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "No fue posible crear la cuenta.");
      setSubmitting(false);
    }
  }

  return (
    <section className="mx-auto flex w-full max-w-[69.375rem] flex-col gap-7 pt-2.5">
      <AuthBreadcrumb page="Registro de usuario" />

      <div className="flex w-full flex-col items-stretch gap-8 xl:flex-row xl:items-center xl:gap-11">
        <AuthVisualPanel
          title="Una cuenta, más formas de investigar."
          description="Conecta tus observaciones con una comunidad de monitoreo ambiental. Tú decides cómo compartir tus módulos."
        />

        <form
          method="post"
          onSubmit={handleSubmit}
          className="flex min-w-0 flex-1 flex-col gap-4.5 rounded-[0.625rem] border border-border bg-surface p-5.5"
        >
          <div className="flex flex-col gap-3">
            <h2 className="text-[1.0625rem] font-semibold text-text">Crear una cuenta</h2>
            <p className="text-[0.8125rem] leading-[1.5] text-text-muted">
              Completa tus datos para crear tu espacio personal.
            </p>
          </div>

          <Field id="name" label="Nombre completo" autoComplete="name" />
          <Field
            id="email"
            label="Correo electrónico"
            type="email"
            autoComplete="email"
          />
          <Field
            id="password"
            label="Contraseña"
            type="password"
            autoComplete="new-password"
            minLength={8}
          />
          <Field
            id="confirm-password"
            label="Confirmar contraseña"
            type="password"
            autoComplete="new-password"
            minLength={8}
          />

          <label className="flex items-start gap-2.5 text-xs leading-[1.6] text-text">
            <input
              type="checkbox"
              name="privacy-consent"
              required
              className="mt-0.5 size-3.5 shrink-0 accent-primary"
            />
            <span>
              He leído la política de privacidad y autorizo el tratamiento de mis datos para la
              gestión de mi cuenta en BioRed.{" "}
              <Link href="/privacidad" className="text-primary hover:underline">
                Consultar política de privacidad →
              </Link>
            </span>
          </label>

          {notice && <FormNotice>{notice}</FormNotice>}

          <button
            type="submit"
            disabled={submitting}
            className="min-h-10.5 rounded-md bg-primary px-4 text-xs font-semibold text-surface hover-bright disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? "Creando cuenta..." : "Crear cuenta"}
          </button>

          <p className="text-center text-xs text-text-muted">
            ¿Ya tienes una cuenta?{" "}
            <Link href="/ingresar" className="font-semibold text-primary hover:underline">
              Iniciar sesión →
            </Link>
          </p>
        </form>
      </div>
    </section>
  );
}

export function SignInPage() {
  const [notice, setNotice] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    setSubmitting(true);
    setNotice(null);
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: formData.get("email"),
          password: formData.get("password"),
          remember: formData.get("remember") === "on",
        }),
      });
      const result = (await response.json()) as { error?: string; redirectTo?: string };
      if (!response.ok) throw new Error(result.error ?? "No fue posible iniciar sesión.");
      if (!result.redirectTo) throw new Error("No se recibió el destino de tu espacio.");
      window.location.assign(result.redirectTo);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "No fue posible iniciar sesión.");
      setSubmitting(false);
    }
  }

  return (
    <section className="mx-auto flex w-full max-w-[69.375rem] flex-col gap-7 pt-2.5">
      <AuthBreadcrumb page="Ingresar" />

      <div className="flex w-full flex-col items-stretch gap-8 xl:flex-row xl:items-center xl:gap-11">
        <AuthVisualPanel
          title="Qué bueno verte de nuevo."
          description="Continúa explorando las observaciones y proyectos de monitoreo ambiental de la comunidad BioRed."
        />

        <form
          method="post"
          onSubmit={handleSubmit}
          className="flex min-w-0 flex-1 flex-col gap-4.5 rounded-[0.625rem] border border-border bg-surface p-5.5"
        >
          <div className="flex flex-col gap-3">
            <h2 className="text-[1.0625rem] font-semibold text-text">Inicio de sesión</h2>
            <p className="text-[0.8125rem] leading-[1.5] text-text-muted">
              Completa tus datos para continuar en la plataforma.
            </p>
          </div>

          <Field id="email" label="Correo electrónico" type="email" autoComplete="email" />
          <Field
            id="password"
            label="Contraseña"
            type="password"
            autoComplete="current-password"
          />

          <label className="flex items-center gap-2.5 text-xs text-text">
            <input
              type="checkbox"
              name="remember"
              defaultChecked
              className="size-3.5 shrink-0 accent-primary"
            />
            Recordarme en este dispositivo
          </label>

          {notice && <FormNotice>{notice}</FormNotice>}

          <div className="flex flex-col gap-3 sm:flex-row">
            <button
              type="submit"
              disabled={submitting}
              className="min-h-10.5 flex-1 rounded-md bg-primary px-4 text-xs font-semibold text-surface hover-bright disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? "Ingresando..." : "Ingresar"}
            </button>
            <Link
              href="/recuperar-contrasena"
              className="flex min-h-10.5 flex-1 items-center justify-center rounded-md border border-border bg-surface px-4 text-xs font-semibold text-primary hover:bg-surface-subtle"
            >
              Recuperar contraseña
            </Link>
          </div>

          <p className="text-center text-xs text-text-muted">
            ¿No tienes una cuenta?{" "}
            <Link href="/registro" className="font-semibold text-primary hover:underline">
              Registrarse →
            </Link>
          </p>
        </form>
      </div>
    </section>
  );
}

export function PasswordRecoveryPage() {
  const router = useRouter();

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    router.push("/recuperar-contrasena/confirmacion");
  }

  return (
    <section className="flex w-full flex-col gap-7">
      <header className="flex flex-col gap-2.5">
        <AuthBreadcrumb page="Recuperar contraseña" />
        <h1 className="text-[1.8125rem] leading-normal tracking-[-0.05rem] text-text">
          Recuperar contraseña
        </h1>
        <p className="text-[0.8125rem] leading-[1.45] text-text-muted">
          Ingresa el correo asociado a tu cuenta para continuar con la recuperación.
        </p>
      </header>

      <form
        onSubmit={handleSubmit}
        className="flex w-full max-w-[35rem] flex-col gap-4 rounded-[0.625rem] border border-border bg-surface p-5.5"
      >
        <h2 className="text-base font-semibold text-text">Recuperación de contraseña</h2>
        <p className="text-xs leading-[1.5] text-text-muted">
          Indica el correo asociado a tu cuenta para continuar con la solicitud de restablecimiento.
        </p>
        <Field id="recovery-email" label="Correo electrónico" type="email" autoComplete="email" />
        <p className="rounded-md border border-warning bg-warning-soft px-3 py-2 text-xs leading-[1.5] text-text">
          El envío de correos de recuperación aún no está implementado. Este formulario es una
          demostración y no enviará ningún mensaje.
        </p>
        <button
          type="submit"
          className="min-h-10.5 rounded-md bg-primary px-4 text-xs font-semibold text-surface hover-bright"
        >
          Continuar
        </button>
        <p className="text-center text-xs text-text-muted">
          ¿Ya recordaste tu contraseña?{" "}
          <Link href="/ingresar" className="font-semibold text-primary hover:underline">
            Ingresar →
          </Link>
        </p>
      </form>
    </section>
  );
}

export function PasswordRecoveryConfirmationPage() {
  return (
    <section className="flex w-full flex-col gap-7">
      <header className="flex flex-col gap-2.5">
        <AuthBreadcrumb page="Confirmación de recuperación" />
        <h1 className="text-[1.8125rem] leading-normal tracking-[-0.05rem] text-text">
          Confirmación de recuperación
        </h1>
        <p className="text-[0.8125rem] leading-[1.45] text-text-muted">
          Revisa esta información antes de continuar con la recuperación.
        </p>
      </header>

      <section
        aria-labelledby="recovery-confirmation-heading"
        className="flex w-full max-w-[35rem] flex-col gap-4 rounded-[0.625rem] border border-border bg-surface p-5.5"
      >
        <h2 id="recovery-confirmation-heading" className="text-base font-semibold text-text">
          Estado de la solicitud
        </h2>
        <div role="status" className="flex items-start gap-3 rounded-md bg-warning-soft p-3.5">
          <Mail className="mt-0.5 size-5 shrink-0 text-warning" aria-hidden />
          <p className="text-xs leading-[1.6] text-text">
            No se envió ningún correo ni se generó un enlace de restablecimiento. La recuperación de
            contraseña es solo una demostración mientras no exista un servicio de envío configurado.
          </p>
        </div>
        <Link
          href="/recuperar-contrasena"
          className="flex min-h-10.5 items-center justify-center rounded-md border border-border bg-surface px-4 text-xs font-semibold text-primary hover:bg-surface-subtle"
        >
          Volver a intentar
        </Link>
        <p className="text-center text-xs text-text-muted">
          ¿Ya recordaste tu contraseña?{" "}
          <Link href="/ingresar" className="font-semibold text-primary hover:underline">
            Ingresar →
          </Link>
        </p>
      </section>
    </section>
  );
}
