# Firmware del ESP8266

Sketch de Arduino que convierte las lecturas fisicas de los dos sensores en el
JSON que espera el backend.

## Cableado de referencia

| Sensor | Pin NodeMCU | GPIO | Modo         |
|--------|-------------|------|--------------|
| LOW    | D5          | 14   | INPUT_PULLUP |
| HIGH   | D6          | 12   | INPUT_PULLUP |

Con `INPUT_PULLUP`, un flotador que cierra el circuito a GND deja el pin en LOW
cuando detecta agua. Por eso el sketch usa `SENSOR_*_ACTIVE_LOW = true`.
Si sus sensores son *Normally Open* respecto a 3V3, ponga esas constantes en
`false`. Los mismos valores deben reflejarse en `SENSOR_LOW_ACTIVE_LOW` y
`SENSOR_HIGH_ACTIVE_LOW` del backend (solo a efectos documentales: el backend
recibe siempre el booleano logico ya convertido).

## Pasos

1. Abra `esp8266-tanque/esp8266-tanque.ino` en el IDE de Arduino.
2. Instale el core `esp8266` (Gestor de tarjetas).
3. Ajuste `WIFI_SSID`, `WIFI_PASSWORD`, `API_URL` y `DEVICE_ID`.
   `DEVICE_ID` debe coincidir con el del archivo `.env.local` del servidor.
4. Compile y suba el sketch.
5. Abra el monitor serie a 115200 baudios para ver cada POST y su respuesta.

## Comportamiento

- Envia una lectura cada `SEND_INTERVAL_MS` (heartbeat, mantiene ONLINE).
- Envia de inmediato cuando cambia cualquiera de los dos sensores.
- Aplica antirrebote de `DEBOUNCE_MS` para evitar falsos cambios por oleaje.
- Omite `timestamp` si el reloj NTP aun no esta sincronizado: en ese caso el
  backend usa su propia hora de recepcion.
