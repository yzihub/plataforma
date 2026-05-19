import { NextResponse } from "next/server";
import {
  executeJuRuntimeState,
  getCorrelationId,
  isRuntimeRequestAuthorized,
  logUnauthorizedRuntimeRequest,
  validateRuntimeGatewayBody,
  type RuntimeGatewayTrace,
  type RuntimeStateRequest,
} from "@/lib/ju-runtime/runtime-gateway";

export async function POST(request: Request) {
  const startedCorrelationId = getCorrelationId(request.headers, null);
  let body: RuntimeStateRequest = {};

  try {
    body = (await request.json()) as RuntimeStateRequest;
  } catch {
    return NextResponse.json(
      {
        ok: false,
        correlation_id: startedCorrelationId,
        error: "invalid_json",
      },
      { status: 400, headers: { "x-correlation-id": startedCorrelationId } },
    );
  }

  const correlationId = getCorrelationId(request.headers, body);
  const trace: RuntimeGatewayTrace = {
    route: "/api/runtime/ju/state",
    method: "POST",
    source: "runtime_gateway",
    channel: body.channel ?? body.entry_profile ?? null,
    origin: body.origin ?? request.headers.get("origin"),
    correlation_id: correlationId,
    authenticated: false,
  };

  const auth = isRuntimeRequestAuthorized(request.headers);
  if (!auth.ok) {
    await logUnauthorizedRuntimeRequest(body, trace, auth.reason);
    return NextResponse.json(
      {
        ok: false,
        correlation_id: correlationId,
        error: "unauthorized_runtime_request",
        reason: auth.reason,
      },
      { status: 401, headers: { "x-correlation-id": correlationId } },
    );
  }

  const validation = validateRuntimeGatewayBody(body);
  if (!validation.ok) {
    return NextResponse.json(
      {
        ok: false,
        correlation_id: correlationId,
        error: "invalid_runtime_request",
        details: validation.errors,
      },
      { status: 400, headers: { "x-correlation-id": correlationId } },
    );
  }

  try {
    const result = await executeJuRuntimeState(body, {
      ...trace,
      authenticated: true,
    });

    return NextResponse.json(result, {
      headers: { "x-correlation-id": result.correlation_id },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro interno";
    console.error("[POST /api/runtime/ju/state]", message);
    return NextResponse.json(
      {
        ok: false,
        correlation_id: correlationId,
        error: message,
        fallback: {
          mode: "minimal",
          retrieval_policy: "disabled",
          transcript_policy: "short_window_only",
        },
      },
      { status: 500, headers: { "x-correlation-id": correlationId } },
    );
  }
}
