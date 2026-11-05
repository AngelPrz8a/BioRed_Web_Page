import Image from "next/image";

export function Footer() {
  return (
    <footer className="hidden flex-col items-start justify-between gap-4 border-t border-border bg-surface px-4 pt-4.75 pb-5 leading-[1.45] sm:flex-row sm:items-center sm:px-8 lg:flex lg:h-(--footer-height) lg:shrink-0">
      <div className="flex flex-col items-start gap-1.25 text-left">
        <p className="text-xs font-semibold text-text">
          BioRed · Semillero de investigación · UNIMINUTO
        </p>
        <p className="text-micro font-normal text-text-muted">
          Monitoreo ambiental con estaciones ESP32
        </p>
      </div>

      <Image
        src="/images/footer-institutional.png"
        alt="UNIMINUTO, Corporación Universitaria Minuto de Dios"
        width={340}
        height={100}
        className="h-auto w-42.5 shrink-0"
      />
    </footer>
  );
}
