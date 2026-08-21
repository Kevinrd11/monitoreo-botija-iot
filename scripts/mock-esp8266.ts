/**
 * Simulador de ESP8266 por linea de comandos.
 *
 * Envia peticiones HTTP reales a POST /api/tank/readings, igual que hara la
 * placa. Util para probar el sistema completo desde fuera del proceso Next.js.
 *
 *   npm run mock                      # ciclo de llenado cada 5 s
 *   npm run mock -- --scenario=full   # mantiene el tanque lleno
 *   npm run mock -- --scenario=anomaly --interval=3000
 *   npm run mock -- --once --scenario=low
 *
 * Escenarios: low | rising | full | anomaly | offline | cycle
 */
import { config } from "dotenv";
import { MockESP8266, HttpTransport } from "../src/mocks/mock-esp8266";
import { SCENARIOS, isScenarioId, type ScenarioId } from "../src/mocks/scenarios";

config({ path: ".env.local", quiet: true });
config({ path: ".env", quiet: true });

function arg(name: string): string | undefined {
  const match = process.argv.slice(2).find((a) => a.startsWith(`--${name}=`));
  return match?.split("=").slice(1).join("=");
}

const hasFlag = (name: string) => process.argv.slice(2).includes(`--${name}`);

const baseUrl = arg("url") ?? process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000";
const deviceId = arg("device") ?? process.env.DEVICE_ID ?? "ESP8266-TANQUE-001";
const intervalMs = Number(arg("interval") ?? process.env.MOCK_ESP8266_INTERVAL_MS ?? 5000);
const scenarioArg = arg("scenario") ?? "cycle";

if (!isScenarioId(scenarioArg)) {
  console.error(`Escenario invalido: ${scenarioArg}`);
  console.error(`Validos: ${Object.keys(SCENARIOS).join(", ")}`);
  process.exit(1);
}
const scenario: ScenarioId = scenarioArg;
const endpoint = `${baseUrl.replace(/\/$/, "")}/api/tank/readings`;

const device = new MockESP8266({
  deviceId,
  transport: new HttpTransport(endpoint),
  intervalMs,
  onSend: (payload, result) => {
    const time = new Date().toLocaleTimeString("es-ES");
    const sensors = `LOW=${payload.low ? "ON " : "OFF"} HIGH=${payload.high ? "ON " : "OFF"}`;
    console.log(
      result.ok
        ? `[${time}] ${sensors} -> ${result.state}`
        : `[${time}] ${sensors} -> ERROR ${result.error ?? "desconocido"}`,
    );
  },
});

console.log("MockESP8266");
console.log(`  endpoint : ${endpoint}`);
console.log(`  deviceId : ${deviceId}`);
console.log(`  escenario: ${scenario} - ${SCENARIOS[scenario].description}`);

if (scenario === "offline") {
  console.log("\nEscenario OFFLINE: no se enviara ninguna lectura.");
  console.log("El dashboard debe marcar el dispositivo como OFFLINE al vencer el timeout.");
  process.exit(0);
}

if (hasFlag("once")) {
  void device.sendScenario(scenario).then(() => process.exit(0));
} else {
  console.log(`  intervalo: ${intervalMs} ms\n(Ctrl+C para detener)\n`);
  device.start(scenario, intervalMs);
  process.on("SIGINT", () => {
    device.stop();
    console.log("\nSimulador detenido.");
    process.exit(0);
  });
}
