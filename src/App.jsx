import { useState, useEffect, useRef } from "react";
import Viewer from "./Viewer";
import "./App.css";

const PROXY_URL = "https://cadbot-proxy.hkrishenning.workers.dev";

const buildSystemPrompt = (units) => `You are Axle, a conversational 3D CAD assistant. You help users design 3D shapes through natural conversation. No markdown, no bullet points, no bold text — plain conversational sentences only.

You have two types of responses:

1. SHAPE RESPONSE — when the user wants to create or modify a 3D shape, reply with ONLY this JSON (no other text):
{"shape": {"type": "box", "width": number, "depth": number, "height": number}, "message": "your conversational reply here"}
{"shape": {"type": "sphere", "radius": number}, "message": "your conversational reply here"}
{"shape": {"type": "cylinder", "radius": number, "height": number}, "message": "your conversational reply here"}

2. CHAT RESPONSE — for questions, feedback, or conversation with no shape change, reply in plain text only. No JSON.

Rules:
- The user is working in ${units === "in" ? "inches" : "millimetres"}. Always store dimensions internally in millimetres (1 inch = 25.4mm), but refer to sizes conversationally in ${units === "in" ? "inches" : "millimetres"}.
- Be casual and friendly, like a knowledgeable colleague.
- Remember the current shape context and refer to it naturally.
- If the user says something is good, confirm it enthusiastically.
- If the user wants to save or approve a shape, include "SAVE" anywhere in your message field.
- Keep messages to 1 sentence maximum. Never explain, never ask follow-up questions unless necessary.`;

export default function App() {
  const [input, setInput] = useState("");
  const [status, setStatus] = useState("idle");
  const [meshData, setMeshData] = useState(null);
  const [workerReady, setWorkerReady] = useState(false);
  const [lastShape, setLastShape] = useState(null);
  const [messages, setMessages] = useState([
    { role: "assistant", text: "Hey, I'm Axle. Train me to build better." }
  ]);
  const [paramsOpen, setParamsOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [units, setUnits] = useState(() => localStorage.getItem("axle_units") || "in");
  const [showGrid, setShowGrid] = useState(() => localStorage.getItem("axle_show_grid") !== "false");
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem("axle_dark_mode") !== "false");
  const workerRef = useRef(null);
  const lastShapeRef = useRef(null);
  const chatEndRef = useRef(null);

  useEffect(() => { lastShapeRef.current = lastShape; }, [lastShape]);
  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

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

  const saveUnits = (u) => {
    setUnits(u);
    localStorage.setItem("axle_units", u);
  };

  const toggleGrid = () => {
    const next = !showGrid;
    setShowGrid(next);
    localStorage.setItem("axle_show_grid", next);
  };

  const toggleDark = (val) => {
    setDarkMode(val);
    localStorage.setItem("axle_dark_mode", val);
  };

  const buildShape = (shape) => {
    workerRef.current.postMessage({ shape });
  };

  const updateParam = (key, value) => {
    if (!lastShape) return;
    const mmValue = units === "in" ? parseFloat(value) * 25.4 : parseFloat(value);
    const updated = { ...lastShape, [key]: mmValue };
    setLastShape(updated);
    lastShapeRef.current = updated;
    buildShape(updated);
  };

  const send = async () => {
    const text = input.trim();
    if (!text) return;
    if (!workerReady) { alert("CAD engine still loading, try again in a moment."); return; }

    const userMessage = { role: "user", text };
    setMessages(prev => [...prev, userMessage]);
    setInput("");
    setStatus("loading");

    const history = [...messages, userMessage]
      .slice(1)
      .map(m => ({ role: m.role, content: m.text }));

    if (lastShapeRef.current) {
      history[history.length - 1].content =
        `[Current shape: ${JSON.stringify(lastShapeRef.current)}]\n${text}`;
    }

    try {
      const res = await fetch(PROXY_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-6",
          max_tokens: 100,
          temperature: 0,
          system: buildSystemPrompt(units),
          messages: history,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error?.message || res.statusText);
      }

      const data = await res.json();
      const responseText = data.content[0].text.trim();
      const cleaned = responseText.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```\s*$/i, "").trim();

      let assistantText = responseText;

      try {
        const parsed = JSON.parse(cleaned);
        if (parsed.shape) {
          setLastShape(parsed.shape);
          buildShape(parsed.shape);
          assistantText = parsed.message || "Done!";
        }
      } catch {
        setStatus("idle");
      }

      setMessages(prev => [...prev, { role: "assistant", text: assistantText }]);
    } catch (err) {
      console.error(err);
      setStatus("error");
      setMessages(prev => [...prev, { role: "assistant", text: "Sorry, something went wrong. Try again." }]);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
  };

  // All values stored in mm internally; display in chosen units
  const toDisplay = (mm) => units === "in" ? mm / 25.4 : mm;
  const toMm = (val) => units === "in" ? val * 25.4 : val;
  const fmt = (mm) => units === "in"
    ? `${Math.round((mm / 25.4) * 100) / 100}"`
    : `${Math.round(mm * 10) / 10}mm`;

  const paramFields = () => {
    if (!lastShape) return [];
    if (lastShape.type === "box") return [
      { key: "width", label: "Width", min: units === "in" ? 0.1 : 1, max: units === "in" ? 20 : 500 },
      { key: "depth", label: "Depth", min: units === "in" ? 0.1 : 1, max: units === "in" ? 20 : 500 },
      { key: "height", label: "Height", min: units === "in" ? 0.1 : 1, max: units === "in" ? 20 : 500 },
    ];
    if (lastShape.type === "sphere") return [
      { key: "radius", label: "Radius", min: units === "in" ? 0.1 : 1, max: units === "in" ? 10 : 250 },
    ];
    if (lastShape.type === "cylinder") return [
      { key: "radius", label: "Radius", min: units === "in" ? 0.1 : 1, max: units === "in" ? 10 : 250 },
      { key: "height", label: "Height", min: units === "in" ? 0.1 : 1, max: units === "in" ? 20 : 500 },
    ];
    return [];
  };

  return (
    <div className={`app${darkMode ? " dark" : ""}`}>
      {/* ── Sidebar ── */}
      <aside className="sidebar">
        <div className="sidebar-top">
          <div className="logo">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#5a82f5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
            </svg>
            <span>Axle</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <button className="settings-icon-btn" onClick={() => setSettingsOpen(o => !o)} title="Settings">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
            </button>
            <div className={`status-pill ${status}`}>
              <span className="status-dot-indicator" />
              {status === "idle" && (workerReady ? "Ready" : "Loading...")}
              {status === "loading" && "Thinking..."}
              {status === "ready" && "Rendered"}
              {status === "error" && "Error"}
            </div>
          </div>
        </div>

        {/* Settings panel */}
        {settingsOpen && (
          <div className="settings-panel">
            <div className="settings-panel-header">Settings</div>
            <div className="settings-row">
              <span className="settings-label">Units</span>
              <div className="units-toggle">
                <button className={units === "in" ? "active" : ""} onClick={() => saveUnits("in")}>Inches</button>
                <button className={units === "mm" ? "active" : ""} onClick={() => saveUnits("mm")}>mm</button>
              </div>
            </div>
            <div className="settings-row">
              <span className="settings-label">Theme</span>
              <div className="units-toggle">
                <button className={!darkMode ? "active" : ""} onClick={() => toggleDark(false)}>Light</button>
                <button className={darkMode ? "active" : ""} onClick={() => toggleDark(true)}>Dark</button>
              </div>
            </div>
            <div className="settings-row">
              <span className="settings-label">Floor grid</span>
              <div className="units-toggle">
                <button className={showGrid ? "active" : ""} onClick={() => !showGrid && toggleGrid()}>On</button>
                <button className={!showGrid ? "active" : ""} onClick={() => showGrid && toggleGrid()}>Off</button>
              </div>
            </div>
          </div>
        )}

        <div className="chat-thread">
          {messages.map((m, i) => (
            <div key={i} className={`bubble ${m.role}`}>{m.text}</div>
          ))}
          <div ref={chatEndRef} />
        </div>

        <div className="chat-input-area">
          <textarea
            rows={2}
            placeholder="Describe a shape or ask anything..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={status === "loading"}
          />
          <button className="send-btn" onClick={send} disabled={status === "loading"}>
            {status === "loading" ? "..." : "Send"}
          </button>
        </div>
      </aside>

      {/* ── Viewport ── */}
      <main className="viewport">
        <Viewer meshData={meshData} showGrid={showGrid} darkMode={darkMode} />

        {lastShape && (
          <button className="params-toggle-btn" onClick={() => setParamsOpen(o => !o)}>
            {paramsOpen ? "✕" : "⚙"}
          </button>
        )}

        {lastShape && paramsOpen && (
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
                  step={units === "in" ? 0.01 : 0.5}
                  value={toDisplay(lastShape[key])}
                  onChange={(e) => updateParam(key, e.target.value)}
                  className="param-slider"
                />
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
