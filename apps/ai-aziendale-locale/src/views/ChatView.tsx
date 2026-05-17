import { useEffect, useRef, useState } from "react";
import { brand, Button } from "@mini-tools/ui-brand";
import { open } from "@tauri-apps/plugin-dialog";
import { listKnowledgeBases, createKnowledgeBase, deleteKnowledgeBase, loadSettings, type KnowledgeBase } from "../lib/db.js";
import { indexFolder, type IndexProgress } from "../lib/index-docs.js";
import { searchTopK, type SearchHit } from "../lib/search.js";
import { streamChat, type ChatMessage } from "../lib/ollama.js";

export interface ChatViewProps {
  onReconfigure: () => void;
}

interface UiMessage {
  role: "user" | "assistant";
  content: string;
  citations?: SearchHit[];
}

export function ChatView({ onReconfigure }: ChatViewProps) {
  const [kbs, setKbs] = useState<KnowledgeBase[]>([]);
  const [activeKbs, setActiveKbs] = useState<Set<number>>(new Set());
  const [messages, setMessages] = useState<UiMessage[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [indexing, setIndexing] = useState<IndexProgress | null>(null);
  const [settings, setSettings] = useState<{ chatModel: string; embeddingModel: string; ollamaHost: string } | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  async function loadAll() {
    setKbs(await listKnowledgeBases());
    setSettings(await loadSettings());
  }
  useEffect(() => { void loadAll(); }, []);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  async function newKb() {
    if (!settings) return;
    const path = await open({ directory: true, multiple: false });
    if (typeof path !== "string") return;
    const name = path.split(/[\/\\]/).pop() ?? "Knowledge Base";
    const kbId = await createKnowledgeBase(name, path);
    setIndexing({ totalFiles: 0, processedFiles: 0, currentFile: "", chunks: 0, errors: [] });
    try {
      const result = await indexFolder(kbId, path, settings.embeddingModel, settings.ollamaHost, (p) => setIndexing({ ...p }));
      setIndexing(result);
    } catch (e) {
      console.error(e);
    }
    setIndexing(null);
    await loadAll();
  }

  async function removeKb(id: number) {
    if (!confirm("Eliminare questa knowledge base e tutti i suoi chunk?")) return;
    await deleteKnowledgeBase(id);
    await loadAll();
    setActiveKbs((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  }

  function toggleKb(id: number) {
    setActiveKbs((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function send() {
    if (!input.trim() || !settings || activeKbs.size === 0 || busy) return;
    const userMsg: UiMessage = { role: "user", content: input };
    setMessages((m) => [...m, userMsg]);
    setInput("");
    setBusy(true);

    const hits = await searchTopK(input, Array.from(activeKbs), 5, settings.embeddingModel, settings.ollamaHost);
    const context = hits.map((h, i) => `[${i + 1}] da ${h.sourceFile}:\n${h.content}`).join("\n\n");

    const chatHistory: ChatMessage[] = [
      {
        role: "system",
        content:
          "Sei un assistente che risponde basandosi ESCLUSIVAMENTE sui documenti forniti nel contesto. " +
          "Cita le fonti usando [1], [2], ecc. Se l'informazione non è nei documenti, dillo chiaramente. Rispondi in italiano.",
      },
      ...messages.map((m) => ({ role: m.role, content: m.content }) as ChatMessage),
      { role: "user", content: `Contesto:\n${context}\n\nDomanda: ${input}` },
    ];

    let assistantText = "";
    setMessages((m) => [...m, { role: "assistant", content: "", citations: hits }]);
    try {
      for await (const chunk of streamChat(chatHistory, settings.chatModel, settings.ollamaHost)) {
        assistantText += chunk;
        setMessages((m) => {
          const next = m.slice();
          next[next.length - 1] = { role: "assistant", content: assistantText, citations: hits };
          return next;
        });
      }
    } catch (e) {
      setMessages((m) => {
        const next = m.slice();
        next[next.length - 1] = {
          role: "assistant",
          content: `Errore: ${e instanceof Error ? e.message : String(e)}`,
        };
        return next;
      });
    }
    setBusy(false);
  }

  return (
    <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
      <aside style={{ width: 260, borderRight: `1px solid ${brand.colors.border}`, background: brand.colors.surface, display: "flex", flexDirection: "column" }}>
        <div style={{ padding: 12, borderBottom: `1px solid ${brand.colors.border}` }}>
          <Button size="sm" onClick={newKb} disabled={!!indexing}>+ Nuova Knowledge Base</Button>
          <Button size="sm" variant="ghost" onClick={onReconfigure} style={{ marginLeft: 4 }}>⚙</Button>
        </div>
        <div style={{ flex: 1, overflow: "auto", padding: 8 }}>
          {kbs.length === 0 && (
            <p style={{ fontSize: 11, color: brand.colors.textMuted, textAlign: "center", padding: 16 }}>
              Aggiungi una cartella per indicizzarla.
            </p>
          )}
          {kbs.map((kb) => (
            <div key={kb.id} style={{
              padding: 8, marginBottom: 4,
              background: activeKbs.has(kb.id) ? brand.colors.surfaceAlt : "transparent",
              border: `1px solid ${activeKbs.has(kb.id) ? brand.colors.accent : brand.colors.border}`,
              cursor: "pointer",
            }} onClick={() => toggleKb(kb.id)}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <strong style={{ fontSize: 12 }}>{kb.name}</strong>
                <button onClick={(e) => { e.stopPropagation(); removeKb(kb.id); }} style={{ background: "transparent", border: "none", color: brand.colors.textMuted, cursor: "pointer", fontSize: 11 }}>×</button>
              </div>
              <div style={{ fontSize: 10, color: brand.colors.textMuted }}>{kb.chunk_count} chunks</div>
            </div>
          ))}
        </div>
        {indexing && (
          <div style={{ padding: 12, borderTop: `1px solid ${brand.colors.border}`, fontSize: 11 }}>
            <div>Indicizzazione: {indexing.processedFiles}/{indexing.totalFiles}</div>
            <div style={{ color: brand.colors.textMuted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{indexing.currentFile.split(/[\/\\]/).pop()}</div>
            <div style={{ color: brand.colors.accent }}>{indexing.chunks} chunks</div>
            {indexing.errors.length > 0 && <div style={{ color: brand.colors.danger }}>{indexing.errors.length} errori</div>}
          </div>
        )}
      </aside>

      <section style={{ flex: 1, display: "flex", flexDirection: "column" }}>
        <div ref={scrollRef} style={{ flex: 1, overflow: "auto", padding: 24 }}>
          {messages.length === 0 ? (
            <div style={{ textAlign: "center", color: brand.colors.textMuted, padding: 60 }}>
              <div style={{ fontSize: 36 }}>💬</div>
              {activeKbs.size === 0
                ? <p>Seleziona almeno una knowledge base dalla sidebar.</p>
                : <p>Fai una domanda sui tuoi documenti.</p>}
            </div>
          ) : (
            messages.map((m, i) => (
              <MessageView key={i} msg={m} />
            ))
          )}
        </div>
        <div style={{ padding: 16, borderTop: `1px solid ${brand.colors.border}`, background: brand.colors.surface, display: "flex", gap: 8 }}>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void send();
              }
            }}
            placeholder={activeKbs.size === 0 ? "Prima seleziona una KB…" : "Fai una domanda… (Invio per inviare, Shift+Invio per nuova riga)"}
            disabled={busy || activeKbs.size === 0}
            rows={2}
            style={{
              flex: 1,
              padding: 10,
              background: brand.colors.surfaceAlt,
              border: `1px solid ${brand.colors.border}`,
              color: brand.colors.text,
              fontSize: 13,
              resize: "none",
              fontFamily: "inherit",
            }}
          />
          <Button onClick={send} disabled={busy || activeKbs.size === 0 || !input.trim()}>
            {busy ? "…" : "↑"}
          </Button>
        </div>
      </section>
    </div>
  );
}

function MessageView({ msg }: { msg: UiMessage }) {
  const isUser = msg.role === "user";
  return (
    <div style={{ marginBottom: 16, display: "flex", flexDirection: "column", alignItems: isUser ? "flex-end" : "flex-start" }}>
      <div style={{
        maxWidth: "80%",
        padding: "10px 14px",
        background: isUser ? brand.colors.accent : brand.colors.surface,
        color: isUser ? "#000" : brand.colors.text,
        border: `1px solid ${isUser ? brand.colors.accent : brand.colors.border}`,
        fontSize: 14,
        whiteSpace: "pre-wrap",
      }}>
        {msg.content}
      </div>
      {msg.citations && msg.citations.length > 0 && (
        <div style={{ marginTop: 6, maxWidth: "80%" }}>
          <div style={{ fontSize: 10, color: brand.colors.textMuted, textTransform: "uppercase" }}>Fonti</div>
          <ul style={{ listStyle: "none", padding: 0, margin: 4 }}>
            {msg.citations.map((c, i) => (
              <li key={i} title={c.content} style={{
                fontSize: 11, padding: "2px 6px", background: brand.colors.surface,
                marginBottom: 2, border: `1px solid ${brand.colors.border}`,
              }}>
                [{i + 1}] {c.sourceFile.split(/[\/\\]/).pop()} ({Math.round(c.score * 100)}%)
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
