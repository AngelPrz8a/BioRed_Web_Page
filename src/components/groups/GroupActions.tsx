"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

type GroupVisibility = "publico" | "privado";
type MembershipStatus = "activo" | "inactivo" | "pendiente";

function responseMessage(body: unknown, fallback: string) {
  if (body && typeof body === "object" && "error" in body && typeof body.error === "string") {
    return body.error;
  }
  return fallback;
}

export function GroupJoinForm({
  groupId,
  membershipStatus,
}: {
  groupId: number;
  membershipStatus: MembershipStatus | null;
}) {
  const router = useRouter();
  const [notice, setNotice] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (membershipStatus === "activo") {
    return (
      <p className="rounded-md bg-primary-soft px-3 py-2 text-xs font-semibold text-primary">
        Ya haces parte de este grupo.
      </p>
    );
  }
  if (membershipStatus === "pendiente") {
    return (
      <p className="rounded-md bg-surface-subtle px-3 py-2 text-xs text-text-muted">
        Tu solicitud de ingreso está pendiente de revisión.
      </p>
    );
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setNotice(null);
    const formData = new FormData(event.currentTarget);
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
      if (!response.ok) throw new Error(responseMessage(body, "No se pudo enviar la solicitud."));
      setNotice("Solicitud enviada. Un coordinador revisará tu ingreso.");
      router.refresh();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "No se pudo enviar la solicitud.");
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-3 rounded-brand bg-surface-subtle p-4">
      <div>
        <h3 className="text-sm font-semibold text-text">Solicitar ingreso</h3>
        <p className="mt-1 text-xs leading-[1.5] text-text-muted">
          El coordinador del grupo revisará tu solicitud antes de activar la membresía.
        </p>
      </div>
      <label className="flex flex-col gap-1.5 text-caption text-text-muted">
        ¿Por qué quieres unirte? <span className="font-normal">(opcional)</span>
        <textarea
          name="justificacion"
          rows={3}
          maxLength={500}
          className="w-full resize-y rounded-md border border-border bg-surface px-3 py-2 text-xs text-text focus-visible:outline-primary"
        />
      </label>
      {notice && <p role="status" className="text-xs text-text">{notice}</p>}
      <button
        type="submit"
        disabled={submitting}
        className="min-h-9 w-fit rounded-md bg-primary px-4 text-xs font-semibold text-surface hover-bright disabled:opacity-60"
      >
        {submitting ? "Enviando..." : "Enviar solicitud"}
      </button>
    </form>
  );
}

export function GroupJoinRequestDecision({
  groupId,
  requestId,
}: {
  groupId: number;
  requestId: number;
}) {
  const router = useRouter();
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function decide(decision: "aprobada" | "rechazada") {
    setBusy(true);
    setNotice(null);
    try {
      const response = await fetch(`/api/groups/${groupId}/requests/${requestId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decision }),
      });
      const body: unknown = await response.json();
      if (!response.ok) throw new Error(responseMessage(body, "No se pudo resolver la solicitud."));
      router.refresh();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "No se pudo resolver la solicitud.");
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col items-start gap-2">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={() => decide("aprobada")}
          className="min-h-8 rounded-md bg-primary px-3 text-caption font-semibold text-surface disabled:opacity-60"
        >
          Aprobar
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => decide("rechazada")}
          className="min-h-8 rounded-md border border-border px-3 text-caption font-semibold text-text disabled:opacity-60"
        >
          Rechazar
        </button>
      </div>
      {notice && <p role="status" className="text-caption text-text-muted">{notice}</p>}
    </div>
  );
}

export function GroupMembershipStatusControl({
  groupId,
  membershipId,
  status,
}: {
  groupId: number;
  membershipId: number;
  status: MembershipStatus;
}) {
  const router = useRouter();
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function updateStatus(nextStatus: MembershipStatus) {
    setBusy(true);
    setNotice(null);
    try {
      const response = await fetch(`/api/groups/${groupId}/memberships/${membershipId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ estado: nextStatus }),
      });
      const body: unknown = await response.json();
      if (!response.ok) throw new Error(responseMessage(body, "No se pudo cambiar la membresía."));
      router.refresh();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "No se pudo cambiar la membresía.");
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-1">
      <select
        aria-label="Estado de la membresía"
        value={status}
        disabled={busy}
        onChange={(event) => updateStatus(event.target.value as MembershipStatus)}
        className="h-8 rounded-md border border-border bg-surface px-2 text-caption text-text disabled:opacity-60"
      >
        <option value="activo">Activo</option>
        <option value="inactivo">Inactivo</option>
        <option value="pendiente">Pendiente</option>
      </select>
      {notice && <p role="status" className="max-w-40 text-micro text-text-muted">{notice}</p>}
    </div>
  );
}

export function AdminGroupEditor({
  group,
}: {
  group?: {
    id_grupo: number;
    nombre: string;
    descripcion: string | null;
    visibilidad: GroupVisibility;
  };
}) {
  const router = useRouter();
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setNotice(null);
    const formData = new FormData(event.currentTarget);
    const payload = {
      nombre: formData.get("nombre"),
      descripcion: formData.get("descripcion"),
      visibilidad: formData.get("visibilidad"),
    };
    try {
      const response = await fetch(
        group ? `/api/admin/groups/${group.id_grupo}` : "/api/admin/groups",
        {
          method: group ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
      const body: unknown = await response.json();
      if (!response.ok) throw new Error(responseMessage(body, "No se pudo guardar el grupo."));
      setNotice("Cambios guardados.");
      router.refresh();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "No se pudo guardar el grupo.");
      setBusy(false);
    }
  }

  return (
    <form
      onSubmit={submit}
      className="flex flex-col gap-4 rounded-[0.625rem] border border-border bg-surface p-4 sm:p-5"
    >
      <div>
        <h2 className="text-base font-semibold text-text">
          {group ? "Editar información y visibilidad" : "Crear grupo"}
        </h2>
        <p className="mt-1 text-xs leading-[1.5] text-text-muted">
          Los grupos privados solo aparecen a sus miembros y administradores.
        </p>
      </div>
      <label className="flex flex-col gap-1.5 text-caption font-semibold text-text">
        Nombre *
        <input
          name="nombre"
          required
          minLength={3}
          maxLength={120}
          defaultValue={group?.nombre}
          className="h-10 rounded-md border border-border bg-surface px-3 text-xs font-normal text-text focus-visible:outline-primary"
        />
      </label>
      <label className="flex flex-col gap-1.5 text-caption font-semibold text-text">
        Descripción
        <textarea
          name="descripcion"
          rows={4}
          maxLength={1000}
          defaultValue={group?.descripcion ?? ""}
          className="w-full resize-y rounded-md border border-border bg-surface px-3 py-2 text-xs font-normal text-text focus-visible:outline-primary"
        />
      </label>
      <label className="flex flex-col gap-1.5 text-caption font-semibold text-text">
        Visibilidad
        <select
          name="visibilidad"
          defaultValue={group?.visibilidad ?? "privado"}
          className="h-10 rounded-md border border-border bg-surface px-3 text-xs font-normal text-text"
        >
          <option value="publico">Público</option>
          <option value="privado">Privado</option>
        </select>
      </label>
      {notice && <p role="status" className="text-xs text-text">{notice}</p>}
      <button
        type="submit"
        disabled={busy}
        className="min-h-10 w-fit rounded-md bg-primary px-4 text-xs font-semibold text-surface hover-bright disabled:opacity-60"
      >
        {busy ? "Guardando..." : "Guardar grupo"}
      </button>
    </form>
  );
}
