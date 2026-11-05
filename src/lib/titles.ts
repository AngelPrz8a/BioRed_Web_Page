import { ROLES, type Role } from "./navigation";

/** Busca el título del menú para una ruta; si no existe, usa el último segmento. */
export function titleForPath(role: Role, path: string) {
  for (const section of ROLES[role].sections) {
    const items = section.kind === "readings" ? [section.item] : section.items;
    const hit = items.find((i) => i.href === path);
    if (hit) return hit.label;
  }
  const last = path.split("/").filter(Boolean).pop() ?? "Explorar";
  return last.charAt(0).toUpperCase() + last.slice(1).replace(/-/g, " ");
}
