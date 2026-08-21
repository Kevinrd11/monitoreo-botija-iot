/* =====================================================================
 * Monitoreo de Tanque - firmware del ESP8266
 * ---------------------------------------------------------------------
 * Lee dos sensores digitales de nivel (LOW y HIGH), los convierte a
 * booleanos LOGICOS y los envia por HTTP al backend:
 *
 *   POST /api/tank/readings
 *   { "deviceId": "...", "low": true, "high": false,
 *     "timestamp": "2026-08-20T19:30:00Z" }
 *
 * El backend determina el estado (LOW / MEDIUM / FULL / ANOMALY),
 * genera las alertas y actualiza el dashboard. La placa NO decide nada.
 *
 * Placa:      NodeMCU / Wemos D1 mini (ESP8266)
 * Librerias:  ESP8266WiFi, ESP8266HTTPClient (incluidas en el core),
 *             ArduinoJson (opcional; aqui se arma el JSON a mano)
 * =====================================================================
 */

#include <ESP8266WiFi.h>
#include <ESP8266HTTPClient.h>
#include <WiFiClient.h>
#include <time.h>

/* ------------------------- CONFIGURACION ---------------------------- */

// --- WiFi ---
const char* WIFI_SSID     = "TU_RED_WIFI";
const char* WIFI_PASSWORD = "TU_CONTRASENA";

// --- Backend ---
// Debe apuntar al servidor donde corre el dashboard.
const char* API_URL   = "http://192.168.1.100:3000/api/tank/readings";
const char* DEVICE_ID = "ESP8266-TANQUE-001";   // igual que DEVICE_ID en .env

// --- Pines de los sensores ---
const uint8_t PIN_SENSOR_LOW  = D5;   // GPIO14
const uint8_t PIN_SENSOR_HIGH = D6;   // GPIO12

/*
 * Polaridad electrica (debe coincidir con SENSOR_*_ACTIVE_LOW del backend):
 *
 *   false -> Normally Open   : el sensor esta ACTIVO cuando el pin lee HIGH
 *   true  -> Normally Closed : el sensor esta ACTIVO cuando el pin lee LOW
 *
 * Con INPUT_PULLUP y un sensor que cierra a GND, lo habitual es `true`.
 */
const bool SENSOR_LOW_ACTIVE_LOW  = true;
const bool SENSOR_HIGH_ACTIVE_LOW = true;

// --- Temporizacion ---
const unsigned long SEND_INTERVAL_MS = 15000;  // envio periodico (heartbeat)
const unsigned long DEBOUNCE_MS      = 300;    // antirrebote de los flotadores
const bool SEND_ON_CHANGE            = true;   // enviar al instante si cambia

// --- Hora ---
// Si el reloj no esta sincronizado, se omite "timestamp" y el backend usa
// su propia hora de recepcion. Nunca se envia una fecha invalida.
const bool USE_NTP = true;

/* ------------------------- ESTADO INTERNO --------------------------- */

bool lastLow = false;
bool lastHigh = false;
bool hasSentOnce = false;
unsigned long lastSendMs = 0;

/* --------------------------- UTILIDADES ----------------------------- */

/** Convierte el nivel fisico del pin en el booleano logico del sensor. */
bool readSensor(uint8_t pin, bool activeLow) {
  const bool pinIsHigh = digitalRead(pin) == HIGH;
  return activeLow ? !pinIsHigh : pinIsHigh;
}

/** Lectura antirrebote: dos muestras coincidentes separadas por DEBOUNCE_MS. */
bool readSensorDebounced(uint8_t pin, bool activeLow) {
  const bool first = readSensor(pin, activeLow);
  delay(DEBOUNCE_MS);
  const bool second = readSensor(pin, activeLow);
  return first && second;
}

void connectWiFi() {
  if (WiFi.status() == WL_CONNECTED) return;

  Serial.printf("\nConectando a %s", WIFI_SSID);
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  unsigned long start = millis();
  while (WiFi.status() != WL_CONNECTED && millis() - start < 20000) {
    delay(500);
    Serial.print(".");
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.printf("\nWiFi conectado. IP: %s\n", WiFi.localIP().toString().c_str());
  } else {
    Serial.println("\nNo se pudo conectar. Se reintentara.");
  }
}

/** Devuelve la hora UTC en ISO-8601, o cadena vacia si no esta sincronizada. */
String isoTimestamp() {
  if (!USE_NTP) return "";

  time_t now = time(nullptr);
  if (now < 1700000000) return "";  // el reloj aun no tiene hora real

  struct tm timeinfo;
  gmtime_r(&now, &timeinfo);

  char buffer[25];
  strftime(buffer, sizeof(buffer), "%Y-%m-%dT%H:%M:%SZ", &timeinfo);
  return String(buffer);
}

/** Envia la lectura al backend. Devuelve true si el servidor la acepto. */
bool sendReading(bool low, bool high) {
  if (WiFi.status() != WL_CONNECTED) {
    connectWiFi();
    if (WiFi.status() != WL_CONNECTED) return false;
  }

  String payload = "{\"deviceId\":\"";
  payload += DEVICE_ID;
  payload += "\",\"low\":";
  payload += (low ? "true" : "false");
  payload += ",\"high\":";
  payload += (high ? "true" : "false");

  const String ts = isoTimestamp();
  if (ts.length() > 0) {
    payload += ",\"timestamp\":\"";
    payload += ts;
    payload += "\"";
  }
  payload += "}";

  WiFiClient client;
  HTTPClient http;
  http.setTimeout(5000);

  if (!http.begin(client, API_URL)) {
    Serial.println("No se pudo iniciar la conexion HTTP.");
    return false;
  }

  http.addHeader("Content-Type", "application/json");
  const int status = http.POST(payload);
  const String response = http.getString();
  http.end();

  Serial.printf("POST %s -> %d %s\n", payload.c_str(), status, response.c_str());
  return status == 200;
}

/* ------------------------------ SETUP ------------------------------- */

void setup() {
  Serial.begin(115200);
  delay(100);
  Serial.println("\n\nMonitoreo de Tanque - ESP8266");

  // INPUT_PULLUP es lo habitual para flotadores que cierran a GND.
  pinMode(PIN_SENSOR_LOW, INPUT_PULLUP);
  pinMode(PIN_SENSOR_HIGH, INPUT_PULLUP);

  connectWiFi();

  if (USE_NTP) {
    // UTC: el backend normaliza la zona horaria en el dashboard.
    configTime(0, 0, "pool.ntp.org", "time.nist.gov");
    Serial.print("Sincronizando hora");
    unsigned long start = millis();
    while (time(nullptr) < 1700000000 && millis() - start < 10000) {
      delay(500);
      Serial.print(".");
    }
    Serial.println();
  }
}

/* ------------------------------ LOOP -------------------------------- */

void loop() {
  const bool low  = readSensorDebounced(PIN_SENSOR_LOW, SENSOR_LOW_ACTIVE_LOW);
  const bool high = readSensorDebounced(PIN_SENSOR_HIGH, SENSOR_HIGH_ACTIVE_LOW);

  const bool changed = (low != lastLow) || (high != lastHigh);
  const bool due = (millis() - lastSendMs) >= SEND_INTERVAL_MS;

  if (!hasSentOnce || due || (SEND_ON_CHANGE && changed)) {
    if (sendReading(low, high)) {
      lastLow = low;
      lastHigh = high;
      lastSendMs = millis();
      hasSentOnce = true;
    } else {
      // Reintento corto ante fallo de red; el backend marcara OFFLINE
      // si el silencio supera DEVICE_TIMEOUT_SECONDS.
      delay(2000);
    }
  }

  delay(200);
}
