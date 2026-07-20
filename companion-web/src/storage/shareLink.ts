/**
 * Read-only run snapshots encoded into the URL fragment — sharing without a
 * server. Payload is JSON, deflate-compressed when the browser supports
 * CompressionStream ("d." prefix), plain base64url otherwise ("j." prefix).
 */
export interface SharedRun {
  gameId: string;
  position: number;
  version: string | null;
  collected: string[];
  progress: Record<string, number>;
}

const b64url = (bytes: Uint8Array): string =>
  btoa(String.fromCharCode(...bytes))
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replace(/=+$/, "");

const fromB64url = (text: string): Uint8Array => {
  const padded = text.replaceAll("-", "+").replaceAll("_", "/");
  return Uint8Array.from(atob(padded), (c) => c.charCodeAt(0));
};

async function pipe(
  bytes: Uint8Array,
  transform: CompressionStream | DecompressionStream,
): Promise<Uint8Array> {
  const stream = new Blob([bytes as BlobPart]).stream().pipeThrough(transform);
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

export async function encodeShareFragment(run: SharedRun): Promise<string> {
  const json = new TextEncoder().encode(JSON.stringify(run));
  if (typeof CompressionStream === "undefined") {
    return `j.${b64url(json)}`;
  }
  const deflated = await pipe(json, new CompressionStream("deflate-raw"));
  return `d.${b64url(deflated)}`;
}

export async function decodeShareFragment(
  fragment: string,
): Promise<SharedRun> {
  const [scheme, data] = [fragment.slice(0, 2), fragment.slice(2)];
  let json: Uint8Array;
  if (scheme === "j.") {
    json = fromB64url(data);
  } else if (scheme === "d.") {
    json = await pipe(fromB64url(data), new DecompressionStream("deflate-raw"));
  } else {
    throw new Error("Not a share link.");
  }

  const parsed: unknown = JSON.parse(new TextDecoder().decode(json));
  const run = parsed as Partial<SharedRun>;
  if (
    typeof run.gameId !== "string" ||
    typeof run.position !== "number" ||
    !Array.isArray(run.collected) ||
    run.collected.some((id) => typeof id !== "string") ||
    run.progress === null ||
    typeof run.progress !== "object"
  ) {
    throw new Error("Not a share link.");
  }
  return {
    gameId: run.gameId,
    position: run.position,
    version: typeof run.version === "string" ? run.version : null,
    collected: run.collected as string[],
    progress: Object.fromEntries(
      Object.entries(run.progress).filter(
        (entry): entry is [string, number] => typeof entry[1] === "number",
      ),
    ),
  };
}
