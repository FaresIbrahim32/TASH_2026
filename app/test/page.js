"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Play, Globe, ClipboardList, BookOpen } from "lucide-react";

export default function TestPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // Setup configuration state
  const [testType, setTestType] = useState("mini-cog"); // "mini-cog" | "mmse"
  const [secondaryLanguage, setSecondaryLanguage] = useState(""); // "" (None), "es", "zh-TW", "ar"
  const [started, setStarted] = useState(false);

  useEffect(() => {
    async function checkAuth() {
      try {
        const res = await fetch("/api/auth/me");
        if (res.ok) {
          const data = await res.json();
          setUser(data.user);
        } else {
          router.push("/login");
        }
      } catch (err) {
        console.error("Auth check failed:", err);
        router.push("/login");
      } finally {
        setLoading(false);
      }
    }
    checkAuth();
  }, [router]);

  if (loading) {
    return (
      <div style={{ display: "flex", height: "100vh", alignItems: "center", justifyContent: "center", background: "#f6f7f4" }}>
        <p style={{ color: "var(--teal)", fontWeight: "bold" }}>Loading setup...</p>
      </div>
    );
  }

  if (!user) return null;

  if (started) {
    // We will render the test wizard component here in Steps 6 & 7
    return (
      <div style={{ display: "flex", height: "100vh", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "#f6f7f4", padding: "20px" }}>
        <div style={{ background: "#ffffff", padding: "32px", borderRadius: "12px", border: "1px solid var(--line)", boxShadow: "var(--shadow)", maxWidth: "500px", width: "100%", textAlign: "center" }}>
          <h2 style={{ color: "var(--teal-dark)", marginBottom: "16px" }}>Assessment Loading</h2>
          <p style={{ color: "var(--muted)", marginBottom: "24px" }}>
            Test Type: <strong style={{ color: "var(--ink)" }}>{testType.toUpperCase()}</strong><br />
            Language: <strong style={{ color: "var(--ink)" }}>{secondaryLanguage ? secondaryLanguage.toUpperCase() : "ENGLISH ONLY"}</strong>
          </p>
          <p style={{ fontSize: "0.9rem", color: "var(--muted)", marginBottom: "24px" }}>
            The guided test wizard will be implemented in the next steps of this phase.
          </p>
          <button
            onClick={() => setStarted(false)}
            style={{
              background: "transparent",
              border: "1px solid var(--teal)",
              color: "var(--teal)",
              borderRadius: "8px",
              padding: "10px 20px",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Modify Setup
          </button>
        </div>
      </div>
    );
  }

  return (
    <main className="appShell" style={{ display: "flex", flexDirection: "column", minHeight: "100vh", background: "#f6f7f4" }}>
      {/* Header */}
      <header className="topBar" style={{ background: "#10251f", color: "#fff", padding: "20px clamp(18px, 4vw, 44px)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <button
            onClick={() => router.push("/")}
            style={{
              background: "transparent",
              border: "none",
              color: "#c9ddd8",
              cursor: "pointer",
              padding: "4px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <ArrowLeft size={20} />
          </button>
          <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
            <span className="eyebrow" style={{ color: "#91d6cd", fontWeight: "800", fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "1px" }}>
              Assessment Setup
            </span>
            <h1 style={{ margin: 0, fontSize: "1.45rem", fontWeight: 700 }}>
              Configure Assessment
            </h1>
          </div>
        </div>
      </header>

      {/* Setup Form Container */}
      <div style={{ flex: 1, padding: "40px 18px", maxWidth: "800px", width: "100%", margin: "0 auto" }}>
        <div className="demographicsPanel" style={{ padding: "32px", gap: "28px", boxShadow: "var(--shadow)", background: "#ffffff", borderRadius: "12px", border: "1px solid var(--line)" }}>
          
          {/* Section 1: Choose Test */}
          <div>
            <div className="sectionTitle" style={{ marginBottom: "16px", display: "flex", alignItems: "center", gap: "8px", color: "var(--teal-dark)" }}>
              <ClipboardList size={22} />
              <h2 style={{ fontSize: "1.2rem", fontWeight: 700, margin: 0 }}>Select Cognitive Test</h2>
            </div>
            
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "16px" }}>
              {/* Option A: Mini-Cog */}
              <div
                onClick={() => setTestType("mini-cog")}
                style={{
                  border: testType === "mini-cog" ? "2px solid var(--teal)" : "1px solid var(--line)",
                  background: testType === "mini-cog" ? "rgba(15, 118, 110, 0.04)" : "#ffffff",
                  borderRadius: "12px",
                  padding: "20px",
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                  <strong style={{ fontSize: "1.05rem", color: testType === "mini-cog" ? "var(--teal-dark)" : "var(--ink)" }}>
                    Mini-Cog Screen
                  </strong>
                  <input
                    type="radio"
                    checked={testType === "mini-cog"}
                    onChange={() => setTestType("mini-cog")}
                    style={{ accentColor: "var(--teal)" }}
                  />
                </div>
                <p style={{ color: "var(--muted)", fontSize: "0.85rem", lineHeight: 1.4 }}>
                  A quick, 3-step screening focusing on word recall and clock-drawing. (Takes 3-5 minutes).
                </p>
              </div>

              {/* Option B: MMSE */}
              <div
                onClick={() => setTestType("mmse")}
                style={{
                  border: testType === "mmse" ? "2px solid var(--teal)" : "1px solid var(--line)",
                  background: testType === "mmse" ? "rgba(15, 118, 110, 0.04)" : "#ffffff",
                  borderRadius: "12px",
                  padding: "20px",
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                  <strong style={{ fontSize: "1.05rem", color: testType === "mmse" ? "var(--teal-dark)" : "var(--ink)" }}>
                    MMSE Evaluation
                  </strong>
                  <input
                    type="radio"
                    checked={testType === "mmse"}
                    onChange={() => setTestType("mmse")}
                    style={{ accentColor: "var(--teal)" }}
                  />
                </div>
                <p style={{ color: "var(--muted)", fontSize: "0.85rem", lineHeight: 1.4 }}>
                  A comprehensive, 30-point evaluation covering orientation, memory, math, and language. (Takes 10-15 minutes).
                </p>
              </div>
            </div>
          </div>

          {/* Section 2: Choose Language */}
          <div>
            <div className="sectionTitle" style={{ marginBottom: "16px", display: "flex", alignItems: "center", gap: "8px", color: "var(--teal-dark)" }}>
              <Globe size={22} />
              <h2 style={{ fontSize: "1.2rem", fontWeight: 700, margin: 0 }}>Secondary Language Comfort</h2>
            </div>
            
            <label style={{ color: "var(--ink)", fontWeight: 500, fontSize: "0.92rem", marginBottom: "12px" }}>
              Are you more comfortable in a language other than English?
            </label>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: "12px" }}>
              {[
                { code: "", label: "English Only" },
                { code: "es", label: "Español (Spanish)" },
                { code: "zh-TW", label: "中文 (Chinese)" },
                { code: "ar", label: "العربية (Arabic)" },
              ].map((lang) => (
                <div
                  key={lang.code}
                  onClick={() => setSecondaryLanguage(lang.code)}
                  style={{
                    border: secondaryLanguage === lang.code ? "2px solid var(--teal)" : "1px solid var(--line)",
                    background: secondaryLanguage === lang.code ? "rgba(15, 118, 110, 0.04)" : "#ffffff",
                    borderRadius: "8px",
                    padding: "14px 10px",
                    textAlign: "center",
                    cursor: "pointer",
                    transition: "all 0.2s ease",
                    fontWeight: 600,
                    fontSize: "0.88rem",
                    color: secondaryLanguage === lang.code ? "var(--teal-dark)" : "var(--muted)",
                  }}
                >
                  {lang.label}
                </div>
              ))}
            </div>
          </div>

          {/* Section 3: Dual-Assessment Notice */}
          <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "8px", padding: "18px", display: "flex", gap: "12px", alignItems: "flex-start" }}>
            <BookOpen size={20} style={{ color: "var(--teal)", marginTop: "2px", flexShrink: 0 }} />
            <div style={{ fontSize: "0.86rem", color: "var(--muted)", lineHeight: 1.5 }}>
              <strong style={{ display: "block", color: "var(--teal-dark)", marginBottom: "4px" }}>
                Assessment Procedure
              </strong>
              {secondaryLanguage ? (
                <span>
                  To ensure accuracy and isolate language barriers, you will take the entire {testType === "mini-cog" ? "Mini-Cog" : "MMSE"} test **first in English**, and then repeat the exact same test **in your selected language**.
                </span>
              ) : (
                <span>
                  You will take the entire {testType === "mini-cog" ? "Mini-Cog" : "MMSE"} test in English. The test contains multiple stages, including memory recall and drawing tasks.
                </span>
              )}
            </div>
          </div>

          {/* Submit Button */}
          <button
            onClick={() => setStarted(true)}
            style={{
              background: "linear-gradient(135deg, #0f766e 0%, #0d5d58 100%)",
              color: "#ffffff",
              border: "none",
              borderRadius: "8px",
              padding: "16px 24px",
              fontWeight: 700,
              fontSize: "1rem",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
              boxShadow: "0 4px 12px rgba(15, 118, 110, 0.15)",
              transition: "transform 0.15s ease",
            }}
            onMouseDown={(e) => e.currentTarget.style.transform = "scale(0.98)"}
            onMouseUp={(e) => e.currentTarget.style.transform = "scale(1)"}
          >
            <Play size={16} fill="#ffffff" />
            Start Assessment
          </button>

        </div>
      </div>
    </main>
  );
}
