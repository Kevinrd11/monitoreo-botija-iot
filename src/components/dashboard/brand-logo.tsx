import Image from "next/image";
import { cn } from "@/lib/utils";

/**
 * Logo de Botija - Finca Agroturística.
 *
 * El archivo `public/botija-logo.png` es el logo recortado a su circulo, con el
 * exterior transparente, de modo que se integra igual sobre fondo claro u
 * oscuro. El aro calido lo separa del fondo del panel sin recortar la marca.
 */
export function BrandLogo({
  size = 40,
  className,
  priority = false,
}: {
  size?: number;
  className?: string;
  priority?: boolean;
}) {
  return (
    <Image
      src="/botija-logo.png"
      alt="Botija - Finca Agroturística"
      width={size}
      height={size}
      priority={priority}
      className={cn(
        "rounded-full ring-1 ring-[var(--brand)]/35 shadow-sm select-none",
        className,
      )}
    />
  );
}
