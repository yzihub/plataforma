import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const workflowPath = path.join(
  process.cwd(),
  "n8n",
  "production",
  "workflow-jurema-main.final-hardened.json",
);

function readWorkflow() {
  return JSON.parse(fs.readFileSync(workflowPath, "utf8"));
}

function mainTargets(workflow: { connections?: Record<string, { main?: Array<Array<{ node: string }>> }> }, node: string) {
  return (workflow.connections?.[node]?.main ?? []).flat().map((connection) => connection.node);
}

describe("Ju Evolution audio normalization pipeline", () => {
  it("normalizes WhatsApp encrypted audio through Evolution decrypt and Audio Converter", () => {
    const workflow = readWorkflow();
    const normalize = workflow.nodes.find((node: { name: string }) => node.name === "Normalize Audio Payload");
    const code = String(normalize?.parameters?.jsCode ?? "");

    expect(code).toContain("evolution_audio_converter_process_audio_v1");
    expect(code).toContain("/chat/getBase64FromMediaMessage/");
    expect(code).toContain("/process-audio");
    expect(code).toContain("format: 'ogg'");
    expect(code).toContain("isOggBase64");
    expect(code).toContain("direct_decrypted_ogg");
    expect(code).toContain("audio: converted.base64");
    expect(code).toContain("data: converted.base64");
    expect(code).toContain("audio.url");
    expect(code).toContain("audio.mediaKey");
    expect(code).toContain("body.apikey");
    expect(code).toContain("$vars.EVOLUTION_API_KEY");
    expect(code).toContain("OggS");
    expect(code).not.toContain("requestBinary");
    expect(code).not.toContain("downloaded.buffer.toString('base64')");
  });

  it("creates binary.data as a valid OpenAI audio file before transcription", () => {
    const workflow = readWorkflow();
    const convert = workflow.nodes.find((node: { name: string }) => node.name === "Convert to audio1");
    const openai = workflow.nodes.find((node: { name: string }) => node.name === "OpenAI1");

    expect(convert?.parameters?.operation).toBe("toBinary");
    expect(convert?.parameters?.sourceProperty).toBe("data");
    expect(convert?.parameters?.binaryPropertyName).toBe("data");
    expect(convert?.parameters?.options?.fileName).toBe("audio.ogg");
    expect(convert?.parameters?.options?.mimeType).toBe("audio/ogg");

    expect(openai?.parameters?.resource).toBe("audio");
    expect(openai?.parameters?.operation).toBe("transcribe");
    expect(openai?.parameters?.binaryPropertyName).toBe("data");
    expect(openai?.parameters?.inputDataFieldName).toBe("data");
  });

  it("preserves the audio branch and sends invalid media to memory fallback instead of OpenAI", () => {
    const workflow = readWorkflow();
    const valid = workflow.nodes.find((node: { name: string }) => node.name === "Audio Media Valid?");

    expect(mainTargets(workflow, "Normalize Audio Payload")).toEqual(["Audio Media Valid?"]);
    expect(mainTargets(workflow, "Audio Media Valid?")).toEqual(["Convert to audio1", "Audio Memory1"]);
    expect(JSON.stringify(valid?.parameters?.conditions ?? {})).toContain("$json.audioValid === true && !!$json.data");
    expect(mainTargets(workflow, "Convert to audio1")).toEqual(["OpenAI1"]);
    expect(mainTargets(workflow, "OpenAI1")).toEqual(["Persist Audio Transcript"]);
    expect(mainTargets(workflow, "Persist Audio Transcript")).toEqual(["Audio Memory1"]);
  });

  it("persists the transcript and reinjects audio as a normal inbound message", () => {
    const workflow = readWorkflow();
    const persist = workflow.nodes.find((node: { name: string }) => node.name === "Persist Audio Transcript");
    const build = workflow.nodes.find((node: { name: string }) => node.name === "Build Context1");
    const code = String(persist?.parameters?.jsCode ?? "");
    const buildCode = String(build?.parameters?.jsCode ?? "");

    expect(code).toContain("audio_as_normal_inbound_message_v1");
    expect(code).toContain("/rest/v1/conversation_messages");
    expect(code).toContain("external_message_id: 'eq.' + externalMessageId");
    expect(code).toContain("content: transcript");
    expect(code).toContain("mensagemCliente: inboundText");
    expect(code).toContain("fallbackAudioText");
    expect(code).toContain("normalized_inbound_message: inboundText");
    expect(code).toContain("audio_transcript_persisted: true");
    expect(persist?.onError).toBe("continueRegularOutput");
    expect(buildCode).toContain("shouldRebuildContextForAudio");
    expect(buildCode).toContain("shouldRebuildContextForAudio ? compactContext()");
  });
});
