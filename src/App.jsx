import { useState, useEffect, useRef } from "react";
import Viewer from "./Viewer";
import "./App.css";

const PROXY_URL = "https://cadbot-proxy.hkrishenning.workers.dev";

const SYSTEM_PROMPT = `You are CadBot, a 3D CAD assistant. Casual, helpful, no markdown.

When the user wants a 3D shape, output ONLY valid JSON:
{ "type": "box", "width": number, "depth": number, "height": number }
{ "type": "sphere", "radius": number }
{ "type": "cylinder", "radius": number, "height": number }

All dimensions in millimetres. Convert inches to mm (1 inch = 25.4mm).
For questions or chat, respond in plain text. Keep it short.`;

export default function App() {
  const [prompt, setPrompt] = useState("");
  const [status, setStatus] = useState("idle");
  const [meshData, setMeshData] = useState(null);
  const [workerReady, setWorkerReady] = useState(false);
  const [lastShape, setLastShape] = useState(null);
  const [chatResponse, setChatResponse] = useState(null);
  const workerRef = useRef(null);
  const lastShapeRef = useRef(null);

  useEffect(() => { lastShapeRef.current = lastShape; }, [lastShape]);

  useEffect(() => {
    const worker = new Worker(new URL("./cadWorker.js", import.meta.url), { type: "module" });
    workerRef.current = worker;
    worker.onmessage = (e) => {
      if (e.data.type === "ready") setWorkerReady(true);
      else if (e.data.type === "mesh") { setMeshData(e.data.mesh); setStatus("ready"); }
      else if (e.data.type === "error") { console.error("Worker error:", e.data.message); setStatus("error"); }
    };
    return () => worker.terminate();
  }, []);

  const buildShape = (shape) => {
    workerRef.current.postMessage({ shape });
  };

  const updateParam = (key, value) => {
    if (!lastShape) return;
    const updated = { ...lastShape, [key]: parseFloat(value) };
    setLastShape(updated);
    lastShapeRef.current = updated;
    buildShape(updated);
  };

  const generate = async () => {
    const text = prompt.trim();
    if (!text) return;
    if (!workerReady) { alert("CAD engine still loading, try again in a moment."); return; }

    setStatus("loading");
    setChatResponse(null);

    try {
      const contextText = lastShapeRef.current
        ? `Current shape: ${JSON.stringify(lastShapeRef.current)}\n\nUser: ${text}`
        : text;

      const res = await fetch(PROXY_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-6",
          max_tokens: 512,
          temperature: 0,
          system: SYSTEM_PROMPT,
          messages: [{ role: "user", content: contextText }],
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error?.message || res.statusText);
      }

      const data = await res.json();
      const responseText = data.content[0].text.trim();
      const cleaned = responseText.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```\s*$/i, "").trim();

      try {
        const shape = JSON.parse(cleaned);
        setLastShape(shape);
        setChatResponse(null);
        buildShape(shape);
      } catch {
        setChatResponse(responseText);
        setStatus("idle");
      }
    } catch (err) {
      console.error(err);
      setStatus("error");
      alert("Error: " + err.message);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); generate(); }
  };

  const paramFields = () => {
    if (!lastShape) return [];
    if (lastShape.type === "box") return [
      { key: "width", label: "Width", min: 1, max: 500 },
      { key: "depth", label: "Depth", min: 1, max: 500 },
      { key: "height", label: "Height", min: 1, max: 500 },
    ];
    if (lastShape.type === "sphere") return [
      { key: "radius", label: "Radius", min: 1, max: 250 },
    ];
    if (lastShape.type === "cylinder") return [
      { key: "radius", label: "Radius", min: 1, max: 250 },
      { key: "height", label: "Height", min: 1, max: 500 },
    ];
    return [];
  };

  const fmt = (v) => `${Math.round(v * 10) / 10}mm / ${Math.round((v / 25.4) * 100) / 100}"`;

  return (
    <div className="app">
      {/* ── Sidebar ── */}
      <aside className="sidebar">
        <div className="sidebar-top">
          <div className="logo">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#5a82f5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
            </svg>
            <span>CadBot</span>
          </div>
        </div>

        <div className="field">
          <label>{lastShape ? "Revise" : "Describe a shape"}</label>
          <textarea
            rows={4}
            placeholder="e.g. a 4 inch cube, a cylinder 3 inches tall..."
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={handleKeyDown}
          />
        </div>

        <button className="generate-btn" onClick={generate} disabled={status === "loading"}>
          {status === "loading" ? "Generating..." : "Generate"}
        </button>

        {chatResponse && <div className="chat-response">{chatResponse}</div>}

        {/* Parameters panel in sidebar */}
        {lastShape && paramFields().length > 0 && (
          <div className="params-panel">
            <div className="params-header">Parameters</div>
            {paramFields().map(({ key, label, min, max }) => (
              <div key={key} className="param-row">
                <div className="param-label-row">
                  <span className="param-label">{label}</span>
                  <span className="param-value">{fmt(lastShape[key])}</span>
                </div>
                <input
                  type="range"
                  min={min}
                  max={max}
                  step={0.5}
                  value={lastShape[key]}
                  onChange={(e) => updateParam(key, e.target.value)}
                  className="param-slider"
                />
              </div>
            ))}
          </div>
        )}

        <div className={`status-bar ${status}`}>
          <span className="status-dot-indicator" />
          {status === "idle" && (workerReady ? "CAD engine ready" : "Loading CAD engine...")}
          {status === "loading" && "Generating..."}
          {status === "ready" && "Shape rendered"}
          {status === "error" && "Error — check console"}
        </div>
      </aside>

      {/* ── Viewport ── */}
      <main className="viewport">
        <Viewer meshData={meshData} />
      </main>
    </div>
  );
}
