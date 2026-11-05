"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

type RequestType = "acceso_modulo" | "cambio_rol_grupo";

function getErrorMessage(body: unknown, fallback: string) {
  if (body && typeof body === "object" && "error" in body && typeof body.error === "string") {
    return body.error;
  }
  return fallback;
}

function useRequestSubmit(type: RequestType, resourceId?: number) {
  const router = useRouter();
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>, fields: Record<string, unknown>) {
    event.preventDefault();
    const form = event.currentTarget;
    setBusy(true);
    setNotice(null);
    const formData = new FormData(form);
    try {
      const response = await fetch("/api/requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tipo: type,
          ...(type === "acceso_modulo"
            ? { id_modulo: resourceId ?? Number(formData.get("id_modulo")) }
            : { id_grupo: resourceId }),
          ...fields,
          justificacion: formData.get("justificacion"),
        }),
      });
      const body: unknown = await response.json();
      if (!response.ok) throw new Error(getErrorMessage(body, "No se pudo enviar la solicitud."));
      setNotice("Solicitud enviada y registrada. Puedes consultar su estado en Mis solicitudes.");
      form.reset();
      router.refresh();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "No se pudo enviar la solicitud.");
    } finally {
      setBusy(false);
    }
  }

  return { submit, notice, busy };
}

function JustificationField() {
  return (
    <label className="flex flex-col gap-1.5 text-caption text-text-muted">
      Justificación <span className="font-normal">(opcional)</span>
      <textarea
        name="justificacion"
        rows={3}
        maxLength={500}
        className="w-full resize-y rounded-md border border-border bg-surface px-3 py-2 text-xs text-text focus-visible:outline-primary"
      />
    </label>
  );
}

function SubmitState({
  notice,
  busy,
}: {
  notice: string | null;
  busy: boolean;
}) {
  return (
    <>
      {notice && <p role="status" className="text-xs text-text">{notice}</p>}
      <button
        type="submit"
        disabled={busy}
        className="min-h-9 w-fit rounded-md bg-primary px-4 text-xs font-semibold text-surface hover-bright disabled:opacity-60"
      >
        {busy ? "Enviando..." : "Enviar solicitud"}
      </button>
    </>
  );
}

export function ModuleAccessRequestForm({ moduleId }: { moduleId?: number }) {
  const { submit, notice, busy } = useRequestSubmit("acceso_modulo", moduleId);
  return (
    <form
      onSubmit={(event) =>
        submit(event, {
          nivel_acceso_solicitado: new FormData(event.currentTarget).get("nivel_acceso_solicitado"),
        })
      }
      className="flex flex-col gap-3 rounded-brand border border-border bg-surface p-4 sm:p-5"
    >
      <div>
        <h2 className="text-sm font-semibold text-text">Solicitar acceso a módulo</h2>
        <p className="mt-1 text-xs leading-[1.5] text-text-muted">
          La solicitud se enviará al administrador para su revisión.
        </p>
      </div>
      {moduleId === undefined && (
        <label className="flex flex-col gap-1.5 text-caption text-text-muted">
          Identificador del módulo
          <input
            name="id_modulo"
            type="number"
            min={1}
            required
            className="h-10 rounded-md border border-border bg-surface px-3 text-xs text-text"
          />
        </label>
      )}
      <label className="flex flex-col gap-1.5 text-caption text-text-muted">
        Nivel solicitado
        <select
          name="nivel_acceso_solicitado"
          defaultValue="lectura"
          className="h-10 rounded-md border border-border bg-surface px-3 text-xs text-text"
        >
          <option value="lectura">Lectura</option>
          <option value="escritura">Escritura</option>
        </select>
      </label>
      <JustificationField />
      <SubmitState notice={notice} busy={busy} />
    </form>
  );
}

export function GroupRoleRequestForm({ groupId }: { groupId: number }) {
  const { submit, notice, busy } = useRequestSubmit("cambio_rol_grupo", groupId);
  return (
    <form
      onSubmit={(event) => submit(event, { rol_solicitado: "coordinador" })}
      className="flex flex-col gap-3 rounded-md bg-surface-subtle p-4"
    >
      <div>
        <h3 className="text-sm font-semibold text-text">Solicitar coordinación</h3>
        <p className="mt-1 text-xs leading-[1.5] text-text-muted">
          Un administrador revisará tu solicitud. Este trámite no cambia el rol hasta que sea aprobado.
        </p>
      </div>
      <JustificationField />
      <SubmitState notice={notice} busy={busy} />
    </form>
  );
}

export function GroupMembershipRequestForm({ groupId }: { groupId: number }) {
  const router = useRouter();
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    setBusy(true);
    setNotice(null);
    const formData = new FormData(form);
    try {
      const response = await fetch("/api/groups/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id_grupo: groupId,
          justificacion: formData.get("justificacion"),
        }),
      });
      const body: unknown = await response.json();
      if (!response.ok) throw new Error(getErrorMessage(body, "No se pudo enviar la solicitud."));
      setNotice("Solicitud registrada. La persona responsable revisará el ingreso.");
      router.refresh();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "No se pudo enviar la solicitud.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-3 rounded-brand border border-border bg-surface p-4 sm:p-5">
      <div>
        <h2 className="text-sm font-semibold text-text">Solicitar ingreso al grupo</h2>
        <p className="mt-1 text-xs leading-[1.5] text-text-muted">
          El identificador se validará en el servidor; no se muestran datos del grupo privado antes de su aprobación.
        </p>
      </div>
      <JustificationField />
      {notice && <p role="status" className="text-xs text-text">{notice}</p>}
      <button
        type="submit"
        disabled={busy}
        className="min-h-9 w-fit rounded-md bg-primary px-4 text-xs font-semibold text-surface hover-bright disabled:opacity-60"
      >
        {busy ? "Enviando..." : "Enviar solicitud"}
      </button>
    </form>
  );
}
