import { NextResponse } from "next/server";
import {
  executeJuRuntimeState,
  getCorrelationId,
  type RuntimeGatewayTrace,
  type RuntimeStateRequest,
} from "@/lib/ju-runtime/runtime-gateway";

export async function POST(request: Request) {
  let body: RuntimeStateRequest | null = null;
  const correlationId = getCorrelationId(request.headers, null);

  try {
    body = (await request.json()) as RuntimeStateRequest;
    const trace: RuntimeGatewayTrace = {
      route: "/api/ju-runtime/state",
      method: "POST",
      source: "legacy_runtime_route",
      channel: body.channel ?? body.entry_profile ?? null,
      origin: body.origin ?? null,
      correlation_id: getCorrelationId(request.headers, body),
      authenticated: false,
    };

    const result = await executeJuRuntimeState(body, trace);
    return NextResponse.json(result, {
      headers: { "x-correlation-id": result.correlation_id },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro interno";
    console.error("[POST /api/ju-runtime/state]", message);
    return NextResponse.json(
      { ok: false, correlation_id: body?.correlation_id ?? correlationId, error: message },
      { status: 500, headers: { "x-correlation-id": body?.correlation_id ?? correlationId } },
    );
  }
}
