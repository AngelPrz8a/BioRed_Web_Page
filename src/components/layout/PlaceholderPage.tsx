/** Contenido temporal hasta migrar cada pantalla. */
export function PlaceholderPage({ title, path }: { title: string; path: string }) {
  return (
    <div className="flex max-w-2xl flex-col gap-2">
      <p className="text-caption text-text-muted">{path}</p>
      <h1 className="text-2xl font-bold text-text">{title}</h1>
      <p className="text-xs text-text-muted">
        Pantalla pendiente de migrar. Por ahora solo están listos el header, el menú lateral y el
        footer.
      </p>
    </div>
  );
}
