"use client";

import { useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Brain, Upload, X, Loader2, AlertTriangle, CheckCircle, XCircle } from "lucide-react";

const CLASS_META = {
  NonDemented:      { label: "Non-Demented",      color: "#10b981" },
  VeryMildDemented: { label: "Very Mild Dementia", color: "#f59e0b" },
  MildDemented:     { label: "Mild Dementia",      color: "#f97316" },
  ModerateDemented: { label: "Moderate Dementia",  color: "#ef4444" },
};
const CLASS_ORDER = ["NonDemented", "VeryMildDemented", "MildDemented", "ModerateDemented"];

const ACCEPTED = ["image/png", "image/jpeg", "image/jpg", "image/webp"];
const MAX_FILES = 5;
const MAX_BYTES = 4 * 1024 * 1024;

export default function MriPage() {
  const router = useRouter();
  const fileInputRef = useRef(null);

  const [files, setFiles] = useState([]); // { file: File, preview: string }[]
  const [dragOver, setDragOver] = useState(false);
  const [status, setStatus] = useState("idle"); // "idle" | "analyzing" | "done" | "error"
  const [results, setResults] = useState([]);
  const [errorMsg, setErrorMsg] = useState("");

  
  // File handling

  function addFiles(incoming) {
    const valid = [];
    for (const f of incoming) {
      if (!ACCEPTED.includes(f.type)) continue;
      if (f.size > MAX_BYTES) continue;
      valid.push(f);
    }
    setFiles((prev) => {
      const combined = [...prev];
      for (const f of valid) {
        if (combined.length >= MAX_FILES) break;
        if (!combined.find((e) => e.file.name === f.name && e.file.size === f.size)) {
          combined.push({ file: f, preview: URL.createObjectURL(f) });
        }
      }
      return combined;
    });
  }

  function removeFile(index) {
    setFiles((prev) => {
      const next = [...prev];
      URL.revokeObjectURL(next[index].preview);
      next.splice(index, 1);
      return next;
    });
  }

  function handleFileInput(e) {
    addFiles(Array.from(e.target.files || []));
    e.target.value = "";
  }

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setDragOver(false);
    addFiles(Array.from(e.dataTransfer.files || []));
  }, []);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback(() => setDragOver(false), []);

  
  // Analyze

  async function handleAnalyze() {
    if (!files.length) return;
    setStatus("analyzing");
    setResults([]);
    setErrorMsg("");

    const form = new FormData();
    for (const { file } of files) {
      form.append("images", file);
    }

    try {
      const res = await fetch("/api/mri/classify", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.message || "Classification failed.");
        setStatus("error");
        return;
      }
      // Attach preview URLs to results so the UI can show thumbnails
      const withPreviews = (data.results || []).map((r) => {
        const match = files.find((f) => f.file.name === r.filename);
        return { ...r, preview: match?.preview || null };
      });
      setResults(withPreviews);
      setStatus("done");
    } catch {
      setErrorMsg("Network error — could not reach the server.");
      setStatus("error");
    }
  }

  function handleReset() {
    files.forEach(({ preview }) => URL.revokeObjectURL(preview));
    setFiles([]);
    setResults([]);
    setErrorMsg("");
    setStatus("idle");
  }

  const analyzing = status === "analyzing";

  
  // Render helpers

  function ResultCard({ result }) {
    if (result.error) {
      return (
        <div style={cardStyle}>
          {result.preview && <Thumbnail src={result.preview} />}
          <div style={{ flex: 1 }}>
            <p style={{ fontWeight: 600, color: "var(--ink)", marginBottom: "6px" }}>{result.filename}</p>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "#ef4444" }}>
              <XCircle size={16} />
              <span style={{ fontSize: "0.88rem" }}>{result.error}</span>
            </div>
          </div>
        </div>
      );
    }

    if (result.rejected) {
      return (
        <div style={cardStyle}>
          {result.preview && <Thumbnail src={result.preview} />}
          <div style={{ flex: 1 }}>
            <p style={{ fontWeight: 600, color: "var(--ink)", marginBottom: "8px" }}>{result.filename}</p>
            <div style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "7px",
              background: "#fef2f2",
              border: "1px solid #fecaca",
              borderRadius: "8px",
              padding: "8px 14px",
              color: "#dc2626",
              fontSize: "0.88rem",
              fontWeight: 600,
            }}>
              <XCircle size={15} />
              Not a brain MRI scan — skipped
            </div>
            <p style={{ color: "var(--muted)", fontSize: "0.82rem", marginTop: "8px" }}>
              This image was not recognised as a brain MRI. Please upload a valid scan.
            </p>
          </div>
        </div>
      );
    }

    const meta = CLASS_META[result.predictedClass] || { label: result.predictedClass, color: "#64748b" };

    return (
      <div style={cardStyle}>
        {result.preview && <Thumbnail src={result.preview} />}
        <div style={{ flex: 1 }}>
          <p style={{ fontWeight: 600, color: "var(--ink)", marginBottom: "10px" }}>{result.filename}</p>

          {/* Prediction badge */}
          <div style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "7px",
            background: `${meta.color}18`,
            border: `1px solid ${meta.color}55`,
            borderRadius: "8px",
            padding: "6px 14px",
            marginBottom: "16px",
          }}>
            <CheckCircle size={15} style={{ color: meta.color }} />
            <span style={{ color: meta.color, fontWeight: 700, fontSize: "0.92rem" }}>
              {meta.label}
            </span>
            <span style={{ color: meta.color, fontSize: "0.85rem", opacity: 0.85 }}>
              ({(result.confidence * 100).toFixed(1)}% confidence)
            </span>
          </div>

          {/* Probability bars */}
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {CLASS_ORDER.map((cls) => {
              const prob = result.probabilities?.[cls] ?? 0;
              const m = CLASS_META[cls];
              const isTop = cls === result.predictedClass;
              return (
                <div key={cls}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "3px" }}>
                    <span style={{ fontSize: "0.8rem", color: isTop ? m.color : "var(--muted)", fontWeight: isTop ? 600 : 400 }}>
                      {m.label}
                    </span>
                    <span style={{ fontSize: "0.8rem", color: isTop ? m.color : "var(--muted)", fontWeight: isTop ? 600 : 400 }}>
                      {(prob * 100).toFixed(1)}%
                    </span>
                  </div>
                  <div style={{ height: "6px", background: "#e5e7eb", borderRadius: "99px", overflow: "hidden" }}>
                    <div style={{
                      height: "100%",
                      width: `${(prob * 100).toFixed(1)}%`,
                      background: m.color,
                      borderRadius: "99px",
                      transition: "width 0.5s ease",
                    }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  
  // Render
  
  return (
    <main style={{ display: "flex", flexDirection: "column", minHeight: "100vh", background: "#f6f7f4" }}>
      {/* Header */}
      <header style={{ background: "#10251f", color: "#fff", padding: "20px clamp(18px, 4vw, 44px)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
          <button
            onClick={() => router.push("/")}
            style={{ background: "transparent", border: "none", color: "#91d6cd", cursor: "pointer", display: "flex", alignItems: "center", gap: "6px", fontSize: "0.9rem", fontWeight: 500, padding: 0 }}
          >
            <ArrowLeft size={18} />
            Dashboard
          </button>
          <span style={{ color: "rgba(255,255,255,0.25)" }}>|</span>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <Brain size={22} style={{ color: "#91d6cd" }} />
            <h1 style={{ margin: 0, fontSize: "clamp(1.1rem, 1.8vw, 1.5rem)", fontWeight: 700 }}>
              MRI Dementia Screener
            </h1>
          </div>
        </div>
      </header>

      {/* Body */}
      <div style={{ flex: 1, padding: "40px clamp(18px, 4vw, 44px)", maxWidth: "900px", width: "100%", margin: "0 auto" }}>

        {/* Disclaimer */}
        <div style={{
          display: "flex",
          alignItems: "flex-start",
          gap: "12px",
          background: "#fffbeb",
          border: "1px solid #fcd34d",
          borderRadius: "12px",
          padding: "14px 18px",
          marginBottom: "32px",
        }}>
          <AlertTriangle size={18} style={{ color: "#d97706", flexShrink: 0, marginTop: "1px" }} />
          <p style={{ margin: 0, fontSize: "0.88rem", color: "#92400e", lineHeight: 1.5 }}>
            <strong>Research use only.</strong> This tool is intended for research and screening purposes. Results are not a clinical diagnosis. Always consult a qualified clinician before making any medical decisions.
          </p>
        </div>

        {/* Upload card */}
        {status !== "done" && (
          <div style={{ background: "#fff", border: "1px solid var(--line)", borderRadius: "16px", padding: "32px", boxShadow: "var(--shadow)", marginBottom: "28px" }}>
            <h2 style={{ fontSize: "1.15rem", fontWeight: 700, color: "var(--teal-dark)", marginBottom: "20px", marginTop: 0 }}>
              Upload MRI Scans
            </h2>

            {/* Drop zone */}
            <div
              onClick={() => !analyzing && fileInputRef.current?.click()}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              style={{
                border: `2px dashed ${dragOver ? "var(--teal)" : "#d1d5db"}`,
                borderRadius: "12px",
                padding: "36px 24px",
                textAlign: "center",
                cursor: analyzing ? "default" : "pointer",
                background: dragOver ? "rgba(15, 118, 110, 0.04)" : "#fafafa",
                transition: "all 0.2s ease",
                marginBottom: "20px",
              }}
            >
              <Upload size={32} style={{ color: dragOver ? "var(--teal)" : "#9ca3af", margin: "0 auto 12px" }} />
              <p style={{ margin: "0 0 4px", fontWeight: 600, color: "var(--ink)", fontSize: "0.95rem" }}>
                Drop brain MRI images here, or click to browse
              </p>
              <p style={{ margin: 0, color: "var(--muted)", fontSize: "0.82rem" }}>
                PNG, JPG, WEBP &nbsp;·&nbsp; Max 4 MB per image &nbsp;·&nbsp; Up to {MAX_FILES} images
              </p>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/jpg,image/webp"
              multiple
              style={{ display: "none" }}
              onChange={handleFileInput}
            />

            {/* Preview thumbnails */}
            {files.length > 0 && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: "12px", marginBottom: "24px" }}>
                {files.map(({ file, preview }, i) => (
                  <div key={i} style={{ position: "relative" }}>
                    <img
                      src={preview}
                      alt={file.name}
                      title={file.name}
                      style={{ width: "88px", height: "88px", objectFit: "cover", borderRadius: "10px", border: "1px solid var(--line)", display: "block" }}
                    />
                    {!analyzing && (
                      <button
                        onClick={() => removeFile(i)}
                        style={{
                          position: "absolute", top: "-7px", right: "-7px",
                          width: "22px", height: "22px", borderRadius: "50%",
                          background: "#ef4444", border: "2px solid #fff",
                          color: "#fff", cursor: "pointer", display: "flex",
                          alignItems: "center", justifyContent: "center", padding: 0,
                        }}
                      >
                        <X size={11} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Analyze button */}
            <button
              onClick={handleAnalyze}
              disabled={!files.length || analyzing}
              style={{
                background: files.length && !analyzing ? "var(--teal)" : "#d1d5db",
                color: "#fff",
                border: "none",
                borderRadius: "10px",
                padding: "12px 28px",
                fontSize: "0.95rem",
                fontWeight: 600,
                cursor: files.length && !analyzing ? "pointer" : "not-allowed",
                display: "flex",
                alignItems: "center",
                gap: "8px",
                transition: "background 0.2s ease",
              }}
            >
              {analyzing ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  Analyzing {files.length} image{files.length !== 1 ? "s" : ""}…
                </>
              ) : (
                <>
                  <Brain size={18} />
                  Analyze {files.length > 0 ? `${files.length} Image${files.length !== 1 ? "s" : ""}` : "Images"}
                </>
              )}
            </button>

            {status === "error" && (
              <p style={{ color: "#ef4444", fontSize: "0.88rem", marginTop: "12px", marginBottom: 0 }}>
                {errorMsg}
              </p>
            )}
          </div>
        )}

        {/* Results */}
        {status === "done" && (
          <div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "20px" }}>
              <h2 style={{ fontSize: "1.25rem", fontWeight: 700, color: "var(--teal-dark)", margin: 0 }}>
                Results — {results.length} image{results.length !== 1 ? "s" : ""}
              </h2>
              <button
                onClick={handleReset}
                style={{
                  background: "transparent",
                  border: "1px solid var(--teal)",
                  color: "var(--teal)",
                  borderRadius: "8px",
                  padding: "8px 16px",
                  fontSize: "0.88rem",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Analyze New Images
              </button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              {results.map((r, i) => <ResultCard key={i} result={r} />)}
            </div>

            {/* Persistent disclaimer at bottom of results */}
            <div style={{
              display: "flex",
              alignItems: "flex-start",
              gap: "10px",
              background: "#fffbeb",
              border: "1px solid #fcd34d",
              borderRadius: "10px",
              padding: "12px 16px",
              marginTop: "24px",
            }}>
              <AlertTriangle size={16} style={{ color: "#d97706", flexShrink: 0, marginTop: "1px" }} />
              <p style={{ margin: 0, fontSize: "0.82rem", color: "#92400e" }}>
                These results are generated by a research CNN model and are not a clinical diagnosis. Verify findings with a qualified clinician.
              </p>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

function Thumbnail({ src }) {
  return (
    <img
      src={src}
      alt="MRI scan"
      style={{
        width: "100px",
        height: "100px",
        objectFit: "cover",
        borderRadius: "10px",
        border: "1px solid var(--line)",
        flexShrink: 0,
        alignSelf: "flex-start",
      }}
    />
  );
}

const cardStyle = {
  background: "#fff",
  border: "1px solid var(--line)",
  borderRadius: "14px",
  padding: "24px",
  boxShadow: "var(--shadow)",
  display: "flex",
  gap: "20px",
  alignItems: "flex-start",
};
