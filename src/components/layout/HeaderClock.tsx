"use client";

import { useEffect, useState, useSyncExternalStore } from "react";

type HourFormat = "24" | "12";

const STORAGE_KEY = "biored-hour-format";

/* ---------- Preferencia persistente ---------- */

const listeners = new Set<() => void>();
let memory: HourFormat | null = null; // respaldo si localStorage está bloqueado

function subscribe(callback: () => void) {
  listeners.add(callback);
  window.addEventListener("storage", callback); // sincroniza entre pestañas
  return () => {
    listeners.delete(callback);
    window.removeEventListener("storage", callback);
  };
}

function getSnapshot(): HourFormat {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === "12" || saved === "24") return saved;
  } catch {
    /* localStorage no disponible */
  }
  return memory ?? "24";
}

const getServerSnapshot = (): HourFormat => "24";

function saveHourFormat(value: HourFormat) {
  memory = value;
  try {
    localStorage.setItem(STORAGE_KEY, value);
  } catch {
    /* ignorar */
  }
  listeners.forEach((l) => l());
}

/* ---------- Formato de fecha ---------- */

function format(hourFormat: HourFormat) {
  const parts = new Intl.DateTimeFormat("es-CO", {
    timeZone: "America/Bogota",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: hourFormat === "12" ? "numeric" : "2-digit",
    minute: "2-digit",
    hour12: hourFormat === "12",
  }).formatToParts(new Date());

  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((p) => p.type === type)?.value ?? "";

  const date = `${get("day")} ${get("month").replace(".", "")} ${get("year")}`;
  const time = `${get("hour")}:${get("minute")}`;
  const period =
    hourFormat === "12"
      ? ` ${get("dayPeriod").replace(/\s/g, "").toLowerCase().replace(/^(\w)\.?(\w)\.?$/, "$1. $2.")}`
      : "";

  return `${date}, ${time}${period} COT`;
}

/* ---------- Componente ---------- */

export function HeaderClock() {
  const hourFormat = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const [value, setValue] = useState("");

  useEffect(() => {
    setValue(format(hourFormat));
    const id = setInterval(() => setValue(format(hourFormat)), 30_000);
    return () => clearInterval(id);
  }, [hourFormat]);

  return (
    <button
      type="button"
      onClick={() => saveHourFormat(hourFormat === "24" ? "12" : "24")}
      title={hourFormat === "24" ? "Cambiar a formato de 12 horas" : "Cambiar a formato de 24 horas"}
      className="min-w-[11.5rem] text-left"
      suppressHydrationWarning
    >
      <time>{value || "\u00a0"}</time>
    </button>
  );
}