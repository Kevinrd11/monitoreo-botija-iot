import Link from "next/link";
import { ArrowLeft, Cable, Database, Radio, Timer } from "lucide-react";
import { BrandLogo } from "@/components/dashboard/brand-logo";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { serverEnv } from "@/config/env";
import { describePolarity, getSensorPolarity } from "@/config/sensors";
import { getRepositories } from "@/repositories";

export const dynamic = "force-dynamic";

/**
 * Configuracion efectiva del sistema de prevencion (solo lectura).
 * Los valores provienen de variables de entorno; ver .env.example.
 */
export default function SettingsPage() {
  const polarity = getSensorPolarity();
  const driver = getRepositories().driver;

  const sections = [
    {
      icon: Radio,
      title: "Dispositivo de supervisión",
      rows: [
        ["DEVICE_ID", serverEnv.deviceId],
        ["Nombre", serverEnv.deviceName],
        ["Tipo", "ESP8266"],
        ["Endpoint de ingesta", "POST /api/tank/readings"],
      ],
    },
    {
      icon: Timer,
      title: "Umbrales de aviso",
      rows: [
        [
          "DEVICE_TIMEOUT_SECONDS",
          `${serverEnv.deviceTimeoutSeconds} s sin datos → reserva sin supervisión`,
        ],
        [
          "LOW_LEVEL_CRITICAL_MINUTES",
          `${serverEnv.lowLevelCriticalMinutes} min bajo el mínimo → aviso crítico`,
        ],
        ["Canal en tiempo real", "Server-Sent Events (/api/tank/stream)"],
      ],
    },
    {
      icon: Cable,
      title: "Polaridad de los sensores",
      rows: [
        ["Sensor LOW", describePolarity(polarity.lowActiveLow)],
        ["Sensor HIGH", describePolarity(polarity.highActiveLow)],
        [
          "Nota",
          "El backend siempre recibe el significado lógico (true = el agua alcanza el sensor). La conversión eléctrica la hace el firmware.",
        ],
      ],
    },
    {
      icon: Database,
      title: "Persistencia",
      rows: [
        ["Driver activo", driver === "postgres" ? "PostgreSQL" : "En memoria (sin DATABASE_URL)"],
        ["DATABASE_URL", serverEnv.databaseUrl ? "configurada" : "no configurada"],
        ["Ensayo de escenarios", serverEnv.mockEnabled ? "habilitado" : "deshabilitado"],
        ["Reserva supervisada", serverEnv.tankName],
      ],
    },
  ];

  return (
    <div className="mx-auto w-full max-w-4xl px-6 py-8">
      <Link
        href="/"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Volver a la supervisión
      </Link>

      <div className="mt-4 flex items-center gap-3">
        <BrandLogo size={44} />
        <div>
          <p className="text-[11px] font-semibold tracking-[0.16em] text-[var(--brand)]">
            BOTIJA
            <span className="ml-1.5 font-normal tracking-normal text-[var(--brand-olive)]">
              Finca Agroturística
            </span>
          </p>
          <h1 className="text-2xl font-bold tracking-tight">Configuración</h1>
        </div>
      </div>
      <p className="mt-3 text-sm text-muted-foreground">
        Valores efectivos leídos de las variables de entorno. Para modificarlos edite
        <code className="mx-1 rounded bg-muted px-1.5 py-0.5 font-mono text-xs">.env.local</code>
        y reinicie el servidor.
      </p>

      <div className="mt-6 space-y-5">
        {sections.map((section) => (
          <Card key={section.title} className="gap-0 overflow-hidden py-0">
            <CardHeader className="border-b border-border/70 px-5 py-4">
              <CardTitle className="flex items-center gap-2 text-sm font-semibold tracking-[0.14em]">
                <section.icon className="size-4 text-muted-foreground" />
                {section.title.toUpperCase()}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <dl className="divide-y divide-border/70">
                {section.rows.map(([label, value]) => (
                  <div key={label} className="flex flex-col gap-1 px-5 py-3 sm:flex-row sm:gap-4">
                    <dt className="w-72 shrink-0 font-mono text-xs text-muted-foreground">
                      {label}
                    </dt>
                    <dd className="text-sm">{value}</dd>
                  </div>
                ))}
              </dl>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
