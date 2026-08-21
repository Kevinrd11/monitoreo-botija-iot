import type { AlertDTO, DeviceStatusDTO, ReadingDTO, TankStateSnapshot } from "@/types";

export const REALTIME_EVENTS = ["reading", "alerts", "device", "heartbeat"] as const;
export type RealtimeEventName = (typeof REALTIME_EVENTS)[number];

export interface ReadingEventPayload {
  reading: ReadingDTO;
  state: TankStateSnapshot;
  device: DeviceStatusDTO;
  activeAlerts: AlertDTO[];
}

export interface AlertsEventPayload {
  activeAlerts: AlertDTO[];
}

export interface DeviceEventPayload {
  device: DeviceStatusDTO;
}

export interface HeartbeatEventPayload {
  serverTime: string;
}

export type RealtimeEvent =
  | { event: "reading"; data: ReadingEventPayload }
  | { event: "alerts"; data: AlertsEventPayload }
  | { event: "device"; data: DeviceEventPayload }
  | { event: "heartbeat"; data: HeartbeatEventPayload };
