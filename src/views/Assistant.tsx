/**
 * Local AI assistant over the user's data, powered by their own Ollama.
 *
 * The system prompt lives in the Rust backend as a compile-time constant
 * and is scoped to data questions only — it can't be viewed or changed
 * from here. Questions and the data snapshot go only to the Ollama URL
 * the user configures; nothing leaves the machine otherwise.
 */

import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { api } from "../api";
import "./Assistant.css";

const DEFAULT_URL = "http://localhost:11434";

interface ChatEntry {
  role: "user" | "assistant" | "error";
  text: string;
}

export default function Assistant() {
  const [url, setUrl] = useState(DEFAULT_URL);
  const [models, setModels] = useState<string[] | null>(null);
  const [model, setModel] = useState("");
  const [connected, setConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [connectError, setConnectError] = useState("");
  const [chat, setChat] = useState<ChatEntry[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    api
      .getSettings()
      .then((s) => {
        const savedUrl = s.ollama_url || DEFAULT_URL;
        setUrl(savedUrl);
        if (s.ollama_url && s.ollama_model) {
          setModel(s.ollama_model);
          setConnected(true);
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chat, busy]);

  const connect = async () => {
    setConnecting(true);
    setConnectError("");
    try {
      const found = await api.ollamaModels(url);
      if (found.length === 0) {
        setConnectError(
          "Ollama is running but has no models. Pull one first, e.g.: ollama pull llama3.2",
        );
        setModels(null);
      } else {
        setModels(found);
        if (!found.includes(model)) setModel(found[0]);
      }
    } catch (e) {
      setConnectError(String(e));
      setModels(null);
    } finally {
      setConnecting(false);
    }
  };

  const saveConnection = async () => {
    await api.setSetting("ollama_url", url);
    await api.setSetting("ollama_model", model);
    setConnected(true);
  };

  const disconnect = async () => {
    await api.setSetting("ollama_url", "");
    await api.setSetting("ollama_model", "");
    setConnected(false);
    setModels(null);
    setChat([]);
  };

  const ask = async () => {
    const question = input.trim();
    if (!question || busy) return;
    setInput("");
    setChat((c) => [...c, { role: "user", text: question }]);
    setBusy(true);
    try {
      const answer = await api.ollamaAsk(url, model, question);
      setChat((c) => [...c, { role: "assistant", text: answer }]);
    } catch (e) {
      setChat((c) => [...c, { role: "error", text: String(e) }]);
    } finally {
      setBusy(false);
    }
  };

  if (!connected) {
    return (
      <div className="assistant-setup">
        <div className="assistant-setup-card">
          <h2>Connect Ollama</h2>
          <p className="assistant-help">
            Ask questions about your application data in plain language —
            answered by a model running on your own machine via{" "}
            <a
              href="https://ollama.com"
              target="_blank"
              rel="noreferrer"
            >
              Ollama
            </a>
            . Your data goes only to the URL below, nowhere else. The
            assistant is restricted to your data: it won't answer anything
            unrelated.
          </p>
          <div>
            <label>Ollama URL</label>
            <input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder={DEFAULT_URL}
            />
          </div>
          {models === null ? (
            <button className="primary" onClick={connect} disabled={connecting}>
              {connecting ? "Connecting…" : "Connect"}
            </button>
          ) : (
            <>
              <div>
                <label>Model</label>
                <select value={model} onChange={(e) => setModel(e.target.value)}>
                  {models.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              </div>
              <button className="primary" onClick={saveConnection}>
                Use this model
              </button>
            </>
          )}
          {connectError && <p className="assistant-error">{connectError}</p>}
        </div>
      </div>
    );
  }

  return (
    <div className="assistant">
      <div className="assistant-bar">
        <span className="assistant-status">
          <span className="assistant-status-dot" />
          {model} · local
        </span>
        <button onClick={disconnect}>Disconnect</button>
      </div>

      <div className="assistant-chat">
        {chat.length === 0 && (
          <div className="assistant-suggestions">
            <p>Try asking:</p>
            {[
              "How many applications did I send this week?",
              "Which portal has responded the most?",
              "What salary did I quote most often?",
              "Which companies have I not heard back from?",
            ].map((q) => (
              <button key={q} onClick={() => setInput(q)}>
                {q}
              </button>
            ))}
          </div>
        )}
        {chat.map((entry, i) => (
          <div key={i} className={`assistant-msg ${entry.role}`}>
            {entry.role === "assistant" ? (
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {entry.text}
              </ReactMarkdown>
            ) : (
              entry.text
            )}
          </div>
        ))}
        {busy && <div className="assistant-msg assistant-thinking">Thinking…</div>}
        <div ref={chatEndRef} />
      </div>

      <div className="assistant-input-row">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && ask()}
          placeholder="Ask about your applications…"
          disabled={busy}
        />
        <button className="primary" onClick={ask} disabled={busy || !input.trim()}>
          Ask
        </button>
      </div>
    </div>
  );
}
