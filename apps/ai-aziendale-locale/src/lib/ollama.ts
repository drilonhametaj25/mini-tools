const DEFAULT_HOST = "http://localhost:11434";

export interface OllamaModel {
  name: string;
  size: number;
  digest: string;
}

export async function checkOllamaRunning(host: string = DEFAULT_HOST): Promise<boolean> {
  try {
    const res = await fetch(`${host}/api/tags`, { method: "GET" });
    return res.ok;
  } catch {
    return false;
  }
}

export async function listInstalledModels(host: string = DEFAULT_HOST): Promise<OllamaModel[]> {
  const res = await fetch(`${host}/api/tags`);
  if (!res.ok) throw new Error(`Ollama HTTP ${res.status}`);
  const json = (await res.json()) as { models: OllamaModel[] };
  return json.models ?? [];
}

export async function embed(text: string, model: string, host: string = DEFAULT_HOST): Promise<number[]> {
  const res = await fetch(`${host}/api/embeddings`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model, prompt: text }),
  });
  if (!res.ok) throw new Error(`Embed HTTP ${res.status}`);
  const json = (await res.json()) as { embedding: number[] };
  return json.embedding;
}

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export async function* streamChat(
  messages: ChatMessage[],
  model: string,
  host: string = DEFAULT_HOST,
): AsyncGenerator<string> {
  const res = await fetch(`${host}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model, messages, stream: true }),
  });
  if (!res.ok || !res.body) throw new Error(`Chat HTTP ${res.status}`);
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let nl;
    while ((nl = buffer.indexOf("\n")) !== -1) {
      const line = buffer.slice(0, nl).trim();
      buffer = buffer.slice(nl + 1);
      if (!line) continue;
      try {
        const obj = JSON.parse(line) as { message?: { content: string }; done?: boolean };
        if (obj.message?.content) yield obj.message.content;
        if (obj.done) return;
      } catch {
        // ignore malformed line
      }
    }
  }
}

export const PRESET_MODELS = [
  { name: "llama3.2:3b", description: "Llama 3.2 3B — leggero (4 GB RAM)", recommended: true },
  { name: "qwen2.5:7b", description: "Qwen 2.5 7B — bilanciato (8 GB RAM)" },
  { name: "mistral:7b", description: "Mistral 7B — versatile (8 GB RAM)" },
];

export const PRESET_EMBEDDINGS = [
  { name: "nomic-embed-text", description: "Nomic Embed — default, multilingue", recommended: true },
  { name: "mxbai-embed-large", description: "MxBai — embedding più ricco (ma più lento)" },
];
