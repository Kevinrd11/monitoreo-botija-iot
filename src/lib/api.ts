import { NextResponse } from "next/server";

export type ApiErrorCode =
  | "INVALID_PAYLOAD"
  | "UNKNOWN_DEVICE"
  | "NOT_FOUND"
  | "CONFLICT"
  | "DISABLED"
  | "INTERNAL_ERROR";

export function ok<T extends object>(data: T, init?: ResponseInit) {
  return NextResponse.json({ success: true, ...data }, init);
}

export function fail(code: ApiErrorCode, status: number, details?: unknown) {
  return NextResponse.json(
    { success: false, error: code, ...(details ? { details } : {}) },
    { status },
  );
}

/** Envuelve un handler para que ningun error interno escape sin formato. */
export async function handle(fn: () => Promise<Response>): Promise<Response> {
  try {
    return await fn();
  } catch (error) {
    console.error("[api] error no controlado:", error);
    return fail("INTERNAL_ERROR", 500, {
      message: error instanceof Error ? error.message : String(error),
    });
  }
}
