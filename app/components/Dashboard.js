"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Play,
  History,
  LogOut,
  Calendar,
  Languages,
  FileText,
  CheckCircle,
  AlertTriangle,
  User,
  ArrowLeft,
  Loader2,
  FileCheck,
  Trash2,
  X,
} from "lucide-react";

export default function Dashboard({ user }) {
  const router = useRouter();
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [selectedSubmission, setSelectedSubmission] = useState(null);
  const [activeView, setActiveView] = useState("home"); // "home" | "history"

  useEffect(() => {
    if (activeView === "history") {
      fetchHistory();
    }
  }, [activeView]);

  async function fetchHistory() {
    setLoading(true);
    try {
      const res = await fetch("/api/submissions");
      if (res.ok) {
        const data = await res.json();
        setSubmissions(data.submissions || []);
      }
    } catch (err) {
      console.error("Failed to fetch past assessments:", err);
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(sk) {
    const confirmDelete = window.confirm("Are you sure you want to delete this assessment record? This action cannot be undone.");
    if (!confirmDelete) return;

    setDeletingId(sk);
    try {
      const res = await fetch("/api/submissions", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ SK: sk }),
      });

      if (res.ok) {
        setSubmissions((prev) => prev.filter((sub) => sub.SK !== sk));
      } else {
        const errData = await res.json();
        alert(errData.message || "Failed to delete assessment.");
      }
    } catch (err) {
      console.error("Error deleting assessment:", err);
      alert("A network error occurred. Please try again.");
    } finally {
      setDeletingId(null);
    }
  }

  async function handleLogout() {
    try {
      const res = await fetch("/api/auth/logout", { method: "POST" });
      if (res.ok) {
        router.push("/login");
        router.refresh();
      }
    } catch (err) {
      console.error("Failed to log out:", err);
    }
  }

  function formatDate(dateString) {
    if (!dateString) return "";
    const date = new Date(dateString);
    return date.toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  return (
    <main className="appShell" style={{ display: "flex", flexDirection: "column", minHeight: "100vh", background: "#f6f7f4" }}>
      {/* Top Header */}
      <header className="topBar" style={{ background: "#10251f", color: "#fff", padding: "20px clamp(18px, 4vw, 44px)" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
          <h1 style={{ margin: 0, fontSize: "clamp(1.4rem, 2.2vw, 2rem)", fontWeight: 700 }}>
            Cognitive Assessment Portal
          </h1>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", background: "rgba(255, 255, 255, 0.08)", padding: "6px 12px", borderRadius: "8px", border: "1px solid rgba(255, 255, 255, 0.1)" }}>
            <User size={16} style={{ color: "#91d6cd" }} />
            <span style={{ fontSize: "0.88rem", fontWeight: 500 }}>
              {user.firstName} {user.lastName}
            </span>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            style={{
              background: "transparent",
              color: "#fda29b",
              border: "1px solid #fda29b",
              borderRadius: "8px",
              fontSize: "0.85rem",
              padding: "6px 12px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "6px",
              transition: "all 0.2s ease",
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.background = "rgba(253, 162, 155, 0.1)";
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.background = "transparent";
            }}
          >
            <LogOut size={15} />
            Log Out
          </button>
        </div>
      </header>

      {/* Main Container */}
      <div style={{ flex: 1, padding: "40px clamp(18px, 4vw, 44px)", maxWidth: "1200px", width: "100%", margin: "0 auto" }}>
        
        {activeView === "home" ? (
          <div>
            {/* Welcome Banner */}
            <div style={{ marginBottom: "36px" }}>
              <h2 style={{ fontSize: "1.75rem", fontWeight: 700, color: "var(--teal-dark)", marginBottom: "8px" }}>
                Welcome back, {user.firstName}!
              </h2>
              <p style={{ color: "var(--muted)", fontSize: "1rem" }}>
                Select an option below to start your cognitive assessment or view past results.
              </p>
            </div>

            {/* Dashboard Cards Grid */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "24px" }}>
              
              {/* Card 1: Take Assessment */}
              <div
                onClick={() => router.push("/test")}
                style={{
                  background: "linear-gradient(135deg, #0f766e 0%, #0d5d58 100%)",
                  borderRadius: "16px",
                  padding: "32px",
                  color: "#ffffff",
                  boxShadow: "0 10px 25px rgba(15, 118, 110, 0.25)",
                  cursor: "pointer",
                  transition: "transform 0.25s ease, box-shadow 0.25s ease",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  minHeight: "260px",
                  position: "relative",
                  overflow: "hidden",
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.transform = "translateY(-5px)";
                  e.currentTarget.style.boxShadow = "0 15px 35px rgba(15, 118, 110, 0.35)";
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.boxShadow = "0 10px 25px rgba(15, 118, 110, 0.25)";
                }}
              >
                {/* Decorative pulsing circles */}
                <div style={{
                  position: "absolute",
                  right: "-20px",
                  top: "-20px",
                  width: "120px",
                  height: "120px",
                  borderRadius: "50%",
                  background: "rgba(255, 255, 255, 0.05)",
                }} />
                
                <div>
                  <div style={{
                    width: "48px",
                    height: "48px",
                    borderRadius: "12px",
                    background: "rgba(255, 255, 255, 0.15)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    marginBottom: "24px",
                  }}>
                    <Play size={24} fill="#ffffff" style={{ marginLeft: "2px" }} />
                  </div>
                  <h3 style={{ fontSize: "1.35rem", fontWeight: 700, marginBottom: "8px" }}>
                    Take an Assessment
                  </h3>
                  <p style={{ color: "rgba(255, 255, 255, 0.8)", fontSize: "0.92rem", lineHeight: 1.5 }}>
                    Start a guided, interactive cognitive test. It takes about 5 to 10 minutes.
                  </p>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: "6px", fontWeight: "bold", fontSize: "0.9rem", marginTop: "24px" }}>
                  Start Assessment &rarr;
                </div>
              </div>

              {/* Card 2: View History */}
              <div
                onClick={() => setActiveView("history")}
                style={{
                  background: "#ffffff",
                  border: "1px solid var(--line)",
                  borderRadius: "16px",
                  padding: "32px",
                  color: "var(--ink)",
                  boxShadow: "var(--shadow)",
                  cursor: "pointer",
                  transition: "transform 0.25s ease, box-shadow 0.25s ease",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  minHeight: "260px",
                  position: "relative",
                  overflow: "hidden",
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.transform = "translateY(-5px)";
                  e.currentTarget.style.boxShadow = "0 15px 35px rgba(26, 43, 36, 0.15)";
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.boxShadow = "var(--shadow)";
                }}
              >
                <div>
                  <div style={{
                    width: "48px",
                    height: "48px",
                    borderRadius: "12px",
                    background: "rgba(15, 118, 110, 0.1)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    marginBottom: "24px",
                  }}>
                    <History size={24} style={{ color: "var(--teal)" }} />
                  </div>
                  <h3 style={{ fontSize: "1.35rem", fontWeight: 700, marginBottom: "8px", color: "var(--teal-dark)" }}>
                    View Past Assessments
                  </h3>
                  <p style={{ color: "var(--muted)", fontSize: "0.92rem", lineHeight: 1.5 }}>
                    Review your completed assessments.
                  </p>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: "6px", fontWeight: "bold", fontSize: "0.9rem", color: "var(--teal)", marginTop: "24px" }}>
                  View History &rarr;
                </div>
              </div>

            </div>
          </div>
        ) : (
          /* History View */
          <div>
            {/* Header Navigation */}
            <button
              onClick={() => setActiveView("home")}
              style={{
                background: "transparent",
                border: "none",
                color: "var(--teal)",
                fontSize: "0.95rem",
                fontWeight: 600,
                display: "flex",
                alignItems: "center",
                gap: "8px",
                cursor: "pointer",
                padding: "8px 0",
                marginBottom: "24px",
              }}
            >
              <ArrowLeft size={18} />
              Back to Dashboard
            </button>

            <div style={{ marginBottom: "28px" }}>
              <h2 style={{ fontSize: "1.65rem", fontWeight: 700, color: "var(--teal-dark)" }}>
                Assessment History
              </h2>
              <p style={{ color: "var(--muted)", fontSize: "0.92rem", marginTop: "4px" }}>
                A list of your submitted cognitive tests and screening statuses.
              </p>
            </div>

            {loading ? (
              <div style={{ display: "flex", flexDirection: "column", gap: "12px", alignItems: "center", justifyContent: "center", padding: "60px 0" }}>
                <Loader2 className="animate-spin" size={32} style={{ color: "var(--teal)" }} />
                <p style={{ color: "var(--muted)", fontSize: "0.92rem" }}>Loading history...</p>
              </div>
            ) : submissions.length === 0 ? (
              <div style={{
                background: "#ffffff",
                border: "1px solid var(--line)",
                borderRadius: "12px",
                padding: "48px 24px",
                textAlign: "center",
                boxShadow: "var(--shadow)",
              }}>
                <FileCheck size={40} style={{ color: "var(--muted)", margin: "0 auto 16px" }} />
                <h3 style={{ fontSize: "1.1rem", fontWeight: 600, color: "var(--ink)", marginBottom: "6px" }}>
                  No assessments yet
                </h3>
                <p style={{ color: "var(--muted)", fontSize: "0.9rem", maxWidth: "380px", margin: "0 auto 20px" }}>
                  You haven't submitted any assessments. Click "Take an Assessment" to start your first test.
                </p>
                <button
                  onClick={() => router.push("/test")}
                  style={{
                    background: "var(--teal)",
                    color: "#ffffff",
                    border: "none",
                    borderRadius: "8px",
                    padding: "10px 20px",
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  Start Assessment
                </button>
              </div>
            ) : (
              /* Submissions List */
              <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                {submissions.map((sub) => {
                  const isPending = !sub.answers?.screeningFlag;

                  return (
                    <div
                      key={sub._id || sub.createdAt}
                      style={{
                        background: "#ffffff",
                        border: "1px solid var(--line)",
                        borderRadius: "12px",
                        padding: "24px",
                        boxShadow: "var(--shadow)",
                        display: "flex",
                        flexWrap: "wrap",
                        justifyContent: "space-between",
                        alignItems: "center",
                        gap: "20px",
                      }}
                    >
                      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                          <h4 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 700, color: "var(--teal-dark)" }}>
                            {sub.testType === "mmse" ? "MMSE" : "Mini-Cog Screening"}
                          </h4>
                          {isPending && (
                            <span
                              style={{
                                background: "#fef3c7",
                                color: "#92400e",
                                fontSize: "0.78rem",
                                fontWeight: 700,
                                padding: "4px 10px",
                                borderRadius: "20px",
                                display: "flex",
                                alignItems: "center",
                                gap: "4px",
                              }}
                            >
                              <Loader2 size={13} className="animate-spin" />
                              Scoring Pending
                            </span>
                          )}
                        </div>

                        <div style={{ display: "flex", flexWrap: "wrap", gap: "16px", color: "var(--muted)", fontSize: "0.85rem" }}>
                          <span style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                            <Calendar size={14} />
                            {formatDate(sub.createdAt)}
                          </span>
                          <span style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                            <Languages size={14} />
                            Languages: EN{sub.secondaryLanguage && sub.secondaryLanguage !== "none" ? `, ${sub.secondaryLanguage.toUpperCase()}` : ""}
                          </span>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        {/* View Details Button */}
                        <button
                          type="button"
                          onClick={() => setSelectedSubmission(sub)}
                          style={{
                            background: "transparent",
                            color: "var(--teal)",
                            border: "1px solid var(--teal)",
                            borderRadius: "8px",
                            padding: "8px 14px",
                            fontSize: "0.85rem",
                            fontWeight: 600,
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            gap: "6px",
                            transition: "all 0.2s ease",
                          }}
                          onMouseOver={(e) => {
                            e.currentTarget.style.background = "rgba(15, 118, 110, 0.05)";
                          }}
                          onMouseOut={(e) => {
                            e.currentTarget.style.background = "transparent";
                          }}
                        >
                          <FileText size={14} />
                          View Results
                        </button>

                        {/* Delete Button */}
                        <button
                          type="button"
                          onClick={() => handleDelete(sub.SK)}
                          disabled={deletingId === sub.SK}
                          style={{
                            background: "transparent",
                            color: "#d92d20",
                            border: "1px solid #fda29b",
                            borderRadius: "8px",
                            padding: "8px 14px",
                            fontSize: "0.85rem",
                            fontWeight: 600,
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            gap: "6px",
                            transition: "all 0.2s ease",
                          }}
                          onMouseOver={(e) => {
                            e.currentTarget.style.background = "#fef3f2";
                          }}
                          onMouseOut={(e) => {
                            e.currentTarget.style.background = "transparent";
                          }}
                        >
                          {deletingId === sub.SK ? (
                            <Loader2 size={14} className="animate-spin" />
                          ) : (
                            <Trash2 size={14} />
                          )}
                          Delete
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {selectedSubmission && (
        <SubmissionDetailsModal
          submission={selectedSubmission}
          onClose={() => setSelectedSubmission(null)}
        />
      )}
    </main>
  );
}

function getAnswerValue(answers, prefix, lang) {
  const keyWithLang = `${prefix}_${lang}`;
  if (answers && keyWithLang in answers) {
    return answers[keyWithLang];
  }
  const keyEn = `${prefix}_en`;
  if (answers && keyEn in answers) {
    return answers[keyEn];
  }
  return null;
}

function DetailSection({ title, score, maxScore, question, responseContent, transcript, rationale, groundTruth }) {
  return (
    <div style={{
      border: "1px solid var(--line)",
      borderRadius: "12px",
      padding: "20px",
      background: "#fafbfa",
      display: "flex",
      flexDirection: "column",
      gap: "14px",
      boxShadow: "0 2px 4px rgba(0,0,0,0.01)"
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid rgba(0,0,0,0.05)", paddingBottom: "10px" }}>
        <h5 style={{ margin: 0, fontSize: "1rem", fontWeight: 700, color: "var(--teal-dark)" }}>{title}</h5>
        {score !== undefined && score !== null && (
          <span style={{
            fontSize: "0.85rem",
            fontWeight: 700,
            background: "rgba(15, 118, 110, 0.08)",
            color: "var(--teal)",
            padding: "4px 10px",
            borderRadius: "6px"
          }}>
            Score: {score} / {maxScore}
          </span>
        )}
      </div>
      
      <p style={{ margin: 0, fontSize: "0.85rem", color: "var(--muted)", fontStyle: "italic" }}>
        <strong>Question/Instruction:</strong> {question}
      </p>

      {groundTruth && (
        <p style={{ margin: 0, fontSize: "0.85rem", color: "var(--teal)", fontWeight: 500 }}>
          <strong>Target/Ground Truth:</strong> {groundTruth}
        </p>
      )}
      
      {responseContent && (
        <div style={{ margin: "4px 0" }}>
          <strong style={{ fontSize: "0.85rem", color: "var(--ink)" }}>Patient Response:</strong>
          <div style={{ marginTop: "6px" }}>{responseContent}</div>
        </div>
      )}

      {transcript && (
        <div style={{
          fontSize: "0.85rem",
          background: "#f1f5f9",
          padding: "10px 14px",
          borderRadius: "8px",
          borderLeft: "3px solid #cbd5e1",
          color: "var(--ink)"
        }}>
          <strong>AI Transcript:</strong> "{transcript}"
        </div>
      )}

      {rationale && (
        <p style={{ margin: 0, fontSize: "0.85rem", color: "var(--ink)", lineHeight: 1.5 }}>
          <strong>AI Rationale:</strong> {rationale}
        </p>
      )}
    </div>
  );
}

function SubmissionDetailsModal({ submission, onClose }) {
  const answers = submission.answers || {};
  const secLang = submission.secondaryLanguage || "none";
  const lang = secLang !== "none" ? secLang : "en";
  const testType = submission.testType || "mini-cog";
  
  const isPending = !answers.screeningFlag;
  const totalScore = answers.totalScore;
  const maxScore = answers.maxScore;
  const flag = answers.screeningFlag;

  // Calculate Temporal Ground Truth Target
  const createdDate = new Date(submission.createdAt || new Date().toISOString());
  const localDateStr = createdDate.toLocaleString("en-US", { timeZone: submission.clientTimeZone || "UTC" });
  const localDate = new Date(localDateStr);
  
  function getSeason(date) {
    const month = date.getMonth(); // 0-11
    if (month >= 2 && month <= 4) return "Spring";
    if (month >= 5 && month <= 8) return "Summer";
    if (month >= 9 && month <= 10) return "Autumn (or Fall)";
    return "Winter";
  }

  const targetTemporal = {
    year: localDate.getFullYear().toString(),
    month: localDate.toLocaleString("en-US", { month: "long" }),
    date: localDate.getDate().toString(),
    day: localDate.toLocaleString("en-US", { weekday: "long" }),
    season: getSeason(localDate)
  };

  const REPETITION_PHRASES = {
    en: "No ifs, ands, or buts",
    es: "Ni síes, ni noes, ni peros",
    ar: "لا إف ولا أند ولا بوت",
    "zh-TW": "沒有如果、但是、或可是"
  };
  const targetPhrase = REPETITION_PHRASES[lang] || REPETITION_PHRASES.en;

  function formatDate(dateString) {
    if (!dateString) return "";
    const date = new Date(dateString);
    return date.toLocaleDateString(undefined, {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  return (
    <div style={{
      position: "fixed",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: "rgba(16, 37, 31, 0.45)",
      backdropFilter: "blur(6px)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      zIndex: 1000,
      padding: "20px",
    }}>
      <div style={{
        background: "#ffffff",
        borderRadius: "16px",
        width: "100%",
        maxWidth: "800px",
        maxHeight: "90vh",
        display: "flex",
        flexDirection: "column",
        boxShadow: "0 20px 50px rgba(10, 25, 20, 0.25)",
        border: "1px solid var(--line)",
        overflow: "hidden",
        animation: "modalFadeIn 0.3s ease"
      }}>
        {/* Header */}
        <div style={{
          background: "#10251f",
          color: "#ffffff",
          padding: "20px 24px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center"
        }}>
          <div>
            <h3 style={{ margin: 0, fontSize: "1.25rem", fontWeight: 700 }}>
              {testType === "mmse" ? "MMSE Cognitive Screening Report" : "Mini-Cog Cognitive Screening Report"}
            </h3>
            <span style={{ fontSize: "0.8rem", color: "var(--teal-light)", opacity: 0.85 }}>
              Taken on {formatDate(submission.createdAt)}
            </span>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "transparent",
              border: "none",
              color: "#ffffff",
              cursor: "pointer",
              padding: "4px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              opacity: 0.8,
              transition: "opacity 0.2s"
            }}
            onMouseOver={(e) => e.currentTarget.style.opacity = 1}
            onMouseOut={(e) => e.currentTarget.style.opacity = 0.8}
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Scrollable Content */}
        <div style={{
          padding: "24px",
          overflowY: "auto",
          display: "flex",
          flexDirection: "column",
          gap: "24px",
          flex: 1
        }}>
          {/* Status Badge & General Score Card */}
          <div style={{
            display: "flex",
            flexDirection: "column",
            gap: "16px"
          }}>
            {/* Screening Status Badge */}
            {isPending ? (
              <div style={{
                background: "#fef3c7",
                border: "1px solid #fde68a",
                borderRadius: "10px",
                padding: "16px",
                display: "flex",
                alignItems: "center",
                gap: "12px",
                color: "#92400e"
              }}>
                <Loader2 className="animate-spin" size={20} />
                <div>
                  <strong style={{ fontSize: "0.95rem" }}>Scoring is Pending</strong>
                  <p style={{ margin: "2px 0 0", fontSize: "0.82rem" }}>The AI Grader is currently analyzing your speech recordings and clock drawing. Refresh the page in a moment to see results.</p>
                </div>
              </div>
            ) : flag === "negative-screen" ? (
              <div style={{
                background: "#ecfdf5",
                border: "1px solid #a7f3d0",
                borderRadius: "10px",
                padding: "16px",
                display: "flex",
                alignItems: "center",
                gap: "12px",
                color: "#065f46"
              }}>
                <CheckCircle size={22} style={{ flexShrink: 0 }} />
                <div>
                  <strong style={{ fontSize: "0.95rem" }}>Normal Cognitive Screening (Negative Screen)</strong>
                  <p style={{ margin: "2px 0 0", fontSize: "0.82rem" }}>The patient's score indicates a low likelihood of cognitive impairment.</p>
                </div>
              </div>
            ) : (
              <div style={{
                background: "#fff5f5",
                border: "1px solid #fee2e2",
                borderRadius: "10px",
                padding: "16px",
                display: "flex",
                alignItems: "center",
                gap: "12px",
                color: "#991b1b"
              }}>
                <AlertTriangle size={22} style={{ flexShrink: 0 }} />
                <div>
                  <strong style={{ fontSize: "0.95rem" }}>Cognitive Impairment Detected (Positive Screen)</strong>
                  <p style={{ margin: "2px 0 0", fontSize: "0.82rem" }}>The screening indicates signs of cognitive decline. Further clinical evaluation by a medical professional is recommended.</p>
                </div>
              </div>
            )}

            {/* Scoreboard Overview */}
            {!isPending && (
              <div style={{
                background: "linear-gradient(135deg, #10251f 0%, #0d1e1a 100%)",
                color: "#ffffff",
                borderRadius: "12px",
                padding: "24px",
                display: "flex",
                alignItems: "center",
                gap: "24px",
                boxShadow: "0 4px 10px rgba(16, 37, 31, 0.15)"
              }}>
                <div style={{
                  minWidth: "80px",
                  height: "80px",
                  borderRadius: "50%",
                  background: "rgba(255, 255, 255, 0.08)",
                  border: "2px solid #91d6cd",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0
                }}>
                  <span style={{ fontSize: "1.75rem", fontWeight: 800 }}>{totalScore}</span>
                  <span style={{ fontSize: "0.7rem", opacity: 0.7, marginTop: "-4px" }}>/ {maxScore}</span>
                </div>
                <div>
                  <h4 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 700, color: "#91d6cd" }}>Clinical Evaluation Summary</h4>
                  <p style={{ margin: "6px 0 0", fontSize: "0.88rem", opacity: 0.9, lineHeight: 1.45 }}>
                    {submission.answers?.gradingExplanation || "No grading details provided by the evaluator."}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Itemized Questions & Responses Breakdown */}
          <div>
            <h4 style={{ margin: "0 0 16px", fontSize: "1.1rem", fontWeight: 700, color: "var(--teal-dark)", borderBottom: "2px solid var(--teal)", paddingBottom: "6px", display: "inline-block" }}>
              Detailed Test Breakdown
            </h4>
            
            <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
              {testType === "mini-cog" ? (
                /* --- MINI-COG DETAILS --- */
                <>
                  {/* Clock Drawing */}
                  <DetailSection
                    title="1. Clock Drawing Test"
                    score={answers.clockScore}
                    maxScore={2}
                    question="Draw a clock face, place all numbers in the correct positions, and set the hands to show 10 minutes past 11."
                    responseContent={
                      getAnswerValue(answers, "clockDrawing", secLang) ? (
                        <img
                          src={getAnswerValue(answers, "clockDrawing", secLang)}
                          alt="Patient Clock Drawing"
                          style={{
                            maxWidth: "100%",
                            width: "280px",
                            height: "auto",
                            objectFit: "contain",
                            borderRadius: "10px",
                            border: "1px solid var(--line)",
                          }}
                        />
                      ) : (
                        <span style={{ color: "var(--red)", fontSize: "0.85rem" }}>No image captured.</span>
                      )
                    }
                    rationale={answers.itemizedGrading?.clockDrawing?.rationale}
                  />

                  {/* Word Recall */}
                  <DetailSection
                    title="2. Three-Word Recall"
                    score={answers.recallScore}
                    maxScore={3}
                    question={`Recall the three target words memorized at the start: ${submission.targetWordsSecondary?.join(", ") || submission.targetWordsEnglish?.join(", ") || "Captain, Garden, Picture"}.`}
                    responseContent={
                      getAnswerValue(answers, "recallAudio", secLang) ? (
                        <audio src={getAnswerValue(answers, "recallAudio", secLang)} controls style={{ width: "100%", maxWidth: "360px" }} />
                      ) : (
                        <span style={{ color: "var(--red)", fontSize: "0.85rem" }}>No voice recording provided.</span>
                      )
                    }
                    transcript={answers.itemizedGrading?.wordRecall?.transcript}
                    rationale={answers.itemizedGrading?.wordRecall?.rationale}
                  />
                </>
              ) : (
                /* --- MMSE DETAILS --- */
                <>
                  {/* 1. Temporal Orientation */}
                  <DetailSection
                    title="1. Temporal Orientation"
                    score={answers.itemizedGrading?.temporalOrientation?.score}
                    maxScore={5}
                    question="State the year, season, month, date, and day of the week."
                    groundTruth={`Year: ${targetTemporal.year}, Season: ${targetTemporal.season}, Month: ${targetTemporal.month}, Date: ${targetTemporal.date}, Day: ${targetTemporal.day}`}
                    responseContent={
                      getAnswerValue(answers, "temporalAudio", lang) ? (
                        <audio src={getAnswerValue(answers, "temporalAudio", lang)} controls style={{ width: "100%", maxWidth: "360px" }} />
                      ) : (
                        <span style={{ color: "var(--red)", fontSize: "0.85rem" }}>No recording.</span>
                      )
                    }
                    transcript={answers.itemizedGrading?.temporalOrientation?.transcript}
                    rationale={answers.itemizedGrading?.temporalOrientation?.rationale}
                  />

                  {/* 2. Spatial Orientation */}
                  <DetailSection
                    title="2. Spatial Orientation"
                    score={answers.itemizedGrading?.spatialOrientation?.score}
                    maxScore={5}
                    question="State the current country, state, town/city, hospital/building, and floor."
                    groundTruth={`Town: ${submission.locationGroundTruth?.town || "N/A"}, County: ${submission.locationGroundTruth?.county || "N/A"}, State: ${submission.locationGroundTruth?.state || "N/A"}`}
                    responseContent={
                      getAnswerValue(answers, "spatialAudio", lang) ? (
                        <audio src={getAnswerValue(answers, "spatialAudio", lang)} controls style={{ width: "100%", maxWidth: "360px" }} />
                      ) : (
                        <span style={{ color: "var(--red)", fontSize: "0.85rem" }}>No recording.</span>
                      )
                    }
                    transcript={answers.itemizedGrading?.spatialOrientation?.transcript}
                    rationale={answers.itemizedGrading?.spatialOrientation?.rationale}
                  />

                  {/* 3. Registration */}
                  <DetailSection
                    title="3. Registration (Word Repetition)"
                    score={answers.itemizedGrading?.registration?.score}
                    maxScore={3}
                    question={`Listen carefully to and repeat the three words immediately: ${submission.targetWordsSecondary?.join(", ") || submission.targetWordsEnglish?.join(", ") || "Apple, Table, Penny"}.`}
                    responseContent={
                      getAnswerValue(answers, "registrationAudio", lang) ? (
                        <audio src={getAnswerValue(answers, "registrationAudio", lang)} controls style={{ width: "100%", maxWidth: "360px" }} />
                      ) : (
                        <span style={{ color: "var(--red)", fontSize: "0.85rem" }}>No recording.</span>
                      )
                    }
                    transcript={answers.itemizedGrading?.registration?.transcript}
                    rationale={answers.itemizedGrading?.registration?.rationale}
                  />

                  {/* 4. Attention & Calculation */}
                  <DetailSection
                    title="4. Attention & Calculation (Serial 7s)"
                    score={answers.itemizedGrading?.attentionCalculation?.score}
                    maxScore={5}
                    question="Subtract 7 from 100, then subtract 7 from the result, and repeat 5 times (93, 86, 79, 72, 65)."
                    responseContent={
                      getAnswerValue(answers, "attentionAudio", lang) ? (
                        <audio src={getAnswerValue(answers, "attentionAudio", lang)} controls style={{ width: "100%", maxWidth: "360px" }} />
                      ) : (
                        <span style={{ color: "var(--red)", fontSize: "0.85rem" }}>No recording.</span>
                      )
                    }
                    transcript={answers.itemizedGrading?.attentionCalculation?.transcript}
                    rationale={answers.itemizedGrading?.attentionCalculation?.rationale}
                  />

                  {/* 5. Recall */}
                  <DetailSection
                    title="5. Three-Word Recall"
                    score={answers.itemizedGrading?.wordRecall?.score}
                    maxScore={3}
                    question={`Recall the three words memorized in step 3: ${submission.targetWordsSecondary?.join(", ") || submission.targetWordsEnglish?.join(", ") || "Apple, Table, Penny"}.`}
                    responseContent={
                      getAnswerValue(answers, "recallAudio", lang) ? (
                        <audio src={getAnswerValue(answers, "recallAudio", lang)} controls style={{ width: "100%", maxWidth: "360px" }} />
                      ) : (
                        <span style={{ color: "var(--red)", fontSize: "0.85rem" }}>No recording.</span>
                      )
                    }
                    transcript={answers.itemizedGrading?.wordRecall?.transcript}
                    rationale={answers.itemizedGrading?.wordRecall?.rationale}
                  />

                  {/* 6. Naming */}
                  <DetailSection
                    title="6. Object Naming"
                    score={answers.itemizedGrading?.naming?.score}
                    maxScore={2}
                    question="Name the two objects shown to you (a pencil and a wristwatch)."
                    responseContent={
                      <div style={{ display: "flex", flexDirection: "column", gap: "4px", fontSize: "0.85rem", color: "var(--ink)" }}>
                        <div>Object 1 (Pencil): <strong>"{answers.itemizedGrading?.naming?.namingObject1 || answers[`naming_object1_${lang}`] || "No response"}"</strong></div>
                        <div>Object 2 (Watch): <strong>"{answers.itemizedGrading?.naming?.namingObject2 || answers[`naming_object2_${lang}`] || "No response"}"</strong></div>
                      </div>
                    }
                  />

                  {/* 7. Repetition */}
                  <DetailSection
                    title="7. Phrase Repetition"
                    score={answers.itemizedGrading?.repetition?.score}
                    maxScore={1}
                    question={`Repeat the exact phrase: "${targetPhrase}".`}
                    responseContent={
                      getAnswerValue(answers, "repetitionAudio", lang) ? (
                        <audio src={getAnswerValue(answers, "repetitionAudio", lang)} controls style={{ width: "100%", maxWidth: "360px" }} />
                      ) : (
                        <span style={{ color: "var(--red)", fontSize: "0.85rem" }}>No recording.</span>
                      )
                    }
                    transcript={answers.itemizedGrading?.repetition?.transcript}
                    rationale={answers.itemizedGrading?.repetition?.rationale}
                  />

                  {/* 8. Command */}
                  <DetailSection
                    title="8. Three-Stage Command"
                    score={answers.itemizedGrading?.command?.score}
                    maxScore={3}
                    question="Take this paper in your right hand, fold it in half, and put it on the floor."
                    responseContent={
                      <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "0.85rem" }}>
                          <input type="checkbox" checked={answers.itemizedGrading?.command?.step1 === true || answers[`command_step1_${lang}`] === true} readOnly style={{ accentColor: "var(--teal)" }} />
                          <span>Step 1: Took paper in right hand</span>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "0.85rem" }}>
                          <input type="checkbox" checked={answers.itemizedGrading?.command?.step2 === true || answers[`command_step2_${lang}`] === true} readOnly style={{ accentColor: "var(--teal)" }} />
                          <span>Step 2: Folded paper in half</span>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "0.85rem" }}>
                          <input type="checkbox" checked={answers.itemizedGrading?.command?.step3 === true || answers[`command_step3_${lang}`] === true} readOnly style={{ accentColor: "var(--teal)" }} />
                          <span>Step 3: Placed paper on floor</span>
                        </div>
                      </div>
                    }
                  />

                  {/* 9. Reading */}
                  <DetailSection
                    title="9. Reading & Obedience"
                    score={answers.itemizedGrading?.reading?.score !== undefined ? answers.itemizedGrading?.reading?.score : (answers[`readingObeyed_${lang}`] === true ? 1 : 0)}
                    maxScore={1}
                    question="Read the instruction 'Close your eyes' and obey what it says."
                    responseContent={
                      <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "0.85rem" }}>
                        <input type="checkbox" checked={answers.itemizedGrading?.reading?.score === 1 || answers[`readingObeyed_${lang}`] === true} readOnly style={{ accentColor: "var(--teal)" }} />
                        <span>Obeyed instruction (Closed eyes)</span>
                      </div>
                    }
                  />

                  {/* 10. Writing */}
                  <DetailSection
                    title="10. Sentence Writing"
                    score={answers.itemizedGrading?.writing?.score}
                    maxScore={1}
                    question="Write a complete sentence containing a subject and a verb that makes sense."
                    responseContent={
                      <div style={{ padding: "8px 12px", background: "#f8fafc", border: "1px dashed #cbd5e1", borderRadius: "6px", fontSize: "0.9rem", color: "var(--ink)", fontWeight: 500 }}>
                        "{getAnswerValue(answers, "writingSentence", lang) || "No sentence written."}"
                      </div>
                    }
                    rationale={answers.itemizedGrading?.writing?.rationale}
                  />

                  {/* 11. Drawing */}
                  <DetailSection
                    title="11. Design Copy (Intersecting Pentagons)"
                    score={answers.itemizedGrading?.drawing?.score}
                    maxScore={1}
                    question="Copy the drawing of the two intersecting pentagons. They must have five sides each and overlap to form a four-sided intersection."
                    responseContent={
                      getAnswerValue(answers, "pentagonDrawing", lang) ? (
                        <img
                          src={getAnswerValue(answers, "pentagonDrawing", lang)}
                          alt="Patient Pentagon Copy"
                          style={{
                            maxWidth: "100%",
                            width: "280px",
                            height: "auto",
                            objectFit: "contain",
                            borderRadius: "10px",
                            border: "1px solid var(--line)",
                          }}
                        />
                      ) : (
                        <span style={{ color: "var(--red)", fontSize: "0.85rem" }}>No design copy captured.</span>
                      )
                    }
                    rationale={answers.itemizedGrading?.drawing?.rationale}
                  />
                </>
              )}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div style={{
          background: "#f8faf9",
          padding: "16px 24px",
          borderTop: "1px solid var(--line)",
          display: "flex",
          justifyContent: "flex-end"
        }}>
          <button
            onClick={onClose}
            style={{
              background: "linear-gradient(135deg, #0f766e 0%, #0d5d58 100%)",
              color: "#ffffff",
              border: "none",
              borderRadius: "8px",
              padding: "10px 20px",
              fontSize: "0.9rem",
              fontWeight: 700,
              cursor: "pointer",
              boxShadow: "0 4px 12px rgba(15, 118, 110, 0.15)"
            }}
          >
            Close Report
          </button>
        </div>
      </div>

      <style jsx>{`
        @keyframes modalFadeIn {
          from {
            opacity: 0;
            transform: translateY(20px) scale(0.95);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
      `}</style>
    </div>
  );
}
