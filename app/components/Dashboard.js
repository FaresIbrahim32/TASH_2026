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
  RefreshCw,
} from "lucide-react";

const ALLOW_DELETION = process.env.NEXT_PUBLIC_ALLOW_RECORD_DELETION === "true";

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

  // Poll every 5 seconds while any submission is still pending grading
  useEffect(() => {
    if (activeView !== "history") return;

    const hasPending = submissions.some((sub) => {
      const referenceTime = sub.answers?.regradeRequestedAt || sub.createdAt;
      const elapsedMs = new Date().getTime() - new Date(referenceTime).getTime();
      return !sub.answers?.screeningFlag && elapsedMs <= 8 * 60 * 1000;
    });

    if (!hasPending) return;

    const interval = setInterval(async () => {
      try {
        const res = await fetch("/api/submissions");
        if (res.ok) {
          const data = await res.json();
          setSubmissions(data.submissions || []);
        }
      } catch (err) {
        console.error("Grading status poll failed:", err);
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [activeView, submissions]);

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
    if (!ALLOW_DELETION) {
      alert("Record deletion is disabled.");
      return;
    }
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
                  const referenceTime = sub.answers?.regradeRequestedAt || sub.createdAt;
                  const elapsedMs = new Date().getTime() - new Date(referenceTime).getTime();
                  const isTimedOut = !sub.answers?.screeningFlag && elapsedMs > 8 * 60 * 1000;

                  const isPending = !sub.answers?.screeningFlag && !isTimedOut;
                  const isError = sub.answers?.screeningFlag === "error" || isTimedOut;

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
                          {isPending && !isError && (
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
                          {isError && (
                            <span
                              style={{
                                background: "#fef2f2",
                                color: "#b91c1c",
                                border: "1px solid #fecaca",
                                fontSize: "0.78rem",
                                fontWeight: 700,
                                padding: "4px 10px",
                                borderRadius: "20px",
                                display: "flex",
                                alignItems: "center",
                                gap: "4px",
                              }}
                            >
                              <AlertTriangle size={13} />
                              Grading Failed
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
                        {ALLOW_DELETION && (
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
                        )}
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
          onRegradeSuccess={fetchHistory}
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

function SubmissionDetailsModal({ submission, onClose, onRegradeSuccess }) {
  const answers = submission.answers || {};
  const secLang = submission.secondaryLanguage || "none";
  const testType = submission.testType || "mini-cog";
  
  // Tab state: default to secondary language if bilingual, otherwise English
  const [activeLangTab, setActiveLangTab] = useState(secLang !== "none" ? secLang : "en");
  const [regrading, setRegrading] = useState(false);
  
  const referenceTime = answers.regradeRequestedAt || submission.createdAt;
  const elapsedMs = new Date().getTime() - new Date(referenceTime).getTime();
  const isTimedOut = !answers.screeningFlag && elapsedMs > 8 * 60 * 1000;

  const isPending = !answers.screeningFlag && !isTimedOut;
  const isError = answers.screeningFlag === "error" || (answers.gradingResults && answers.gradingResults[activeLangTab]?.screeningFlag === "error") || isTimedOut;
  const gradingResults = answers.gradingResults || {};
  const activeResults = gradingResults[activeLangTab] || answers;

  const handleRegrade = async () => {
    if (regrading) return;
    setRegrading(true);
    try {
      const res = await fetch("/api/submissions/regrade", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ SK: submission.SK }),
      });
      if (res.ok) {
        if (onRegradeSuccess) {
          await onRegradeSuccess();
        }
        onClose();
      } else {
        const errData = await res.json();
        alert(`Failed to trigger regrade: ${errData.message || "Unknown error"}`);
      }
    } catch (error) {
      console.error("Error regrading:", error);
      alert("Network error occurred while trying to regrade.");
    } finally {
      setRegrading(false);
    }
  };

  const totalScore = activeResults.totalScore;
  const maxScore = activeResults.maxScore;
  const flag = activeResults.screeningFlag;

  // Calculate Temporal Ground Truth Target
  const createdDate = new Date(submission.createdAt || new Date().toISOString());
  const tz = submission.clientTimeZone || "UTC";
  const formatPart = (options) => createdDate.toLocaleString("en-US", { ...options, timeZone: tz });

  function getSeasonForTimeZone(date, timeZone) {
    const monthStr = date.toLocaleString("en-US", { month: "numeric", timeZone: timeZone || "UTC" });
    const month = Number(monthStr); // 1-12
    if (month >= 3 && month <= 5) return "Spring";
    if (month >= 6 && month <= 9) return "Summer";
    if (month >= 10 && month <= 11) return "Autumn (or Fall)";
    return "Winter";
  }

  const targetTemporal = {
    year: formatPart({ year: "numeric" }),
    month: formatPart({ month: "long" }),
    date: formatPart({ day: "numeric" }),
    day: formatPart({ weekday: "long" }),
    season: getSeasonForTimeZone(createdDate, tz)
  };

  const REPETITION_PHRASES = {
    en: "No ifs, ands, or buts",
    es: "Es un día agradable y soleado, pero hace demasiado calor.",
    ar: "أن ، لن ، إذن ، كي",
    "zh-TW": "沒有如果、並且、或但是"
  };
  const targetPhrase = REPETITION_PHRASES[activeLangTab] || REPETITION_PHRASES.en;

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
          {/* Language Selector Tabs */}
          {secLang !== "none" && !isPending && (
            <div style={{
              display: "flex",
              background: "#f1f5f9",
              padding: "4px",
              borderRadius: "8px",
              alignSelf: "flex-start",
              gap: "4px",
              marginBottom: "-8px"
            }}>
              <button
                onClick={() => setActiveLangTab("en")}
                style={{
                  background: activeLangTab === "en" ? "#ffffff" : "transparent",
                  color: activeLangTab === "en" ? "var(--teal)" : "var(--muted)",
                  border: "none",
                  borderRadius: "6px",
                  padding: "6px 16px",
                  fontSize: "0.85rem",
                  fontWeight: 600,
                  cursor: "pointer",
                  boxShadow: activeLangTab === "en" ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
                  transition: "all 0.2s"
                }}
              >
                English (EN)
              </button>
              <button
                onClick={() => setActiveLangTab(secLang)}
                style={{
                  background: activeLangTab === secLang ? "#ffffff" : "transparent",
                  color: activeLangTab === secLang ? "var(--teal)" : "var(--muted)",
                  border: "none",
                  borderRadius: "6px",
                  padding: "6px 16px",
                  fontSize: "0.85rem",
                  fontWeight: 600,
                  cursor: "pointer",
                  boxShadow: activeLangTab === secLang ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
                  transition: "all 0.2s"
                }}
              >
                {secLang === "es" ? "Spanish (ES)" : secLang === "zh-TW" ? "Chinese (ZH-TW)" : secLang === "ar" ? "Arabic (AR)" : secLang.toUpperCase()}
              </button>
            </div>
          )}

          {/* Status Badge & General Score Card */}
          <div style={{
            display: "flex",
            flexDirection: "column",
            gap: "16px"
          }}>
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
            ) : isError ? (
              <div style={{
                background: "#fff5f5",
                border: "1px solid #fee2e2",
                borderRadius: "10px",
                padding: "16px",
                display: "flex",
                flexDirection: "column",
                gap: "12px",
                color: "#991b1b"
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <AlertTriangle size={22} style={{ flexShrink: 0 }} />
                  <strong style={{ fontSize: "0.95rem" }}>Grading Failed</strong>
                </div>
                <p style={{ margin: 0, fontSize: "0.85rem", lineHeight: 1.45 }}>
                  An error occurred while automatically grading this assessment. Please try again.
                </p>
                <button
                  onClick={handleRegrade}
                  disabled={regrading}
                  style={{
                    alignSelf: "flex-start",
                    background: "#b91c1c",
                    color: "#ffffff",
                    border: "none",
                    borderRadius: "6px",
                    padding: "8px 16px",
                    fontSize: "0.85rem",
                    fontWeight: 600,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
                    transition: "all 0.2s"
                  }}
                  onMouseOver={(e) => e.currentTarget.style.background = "#991b1b"}
                  onMouseOut={(e) => e.currentTarget.style.background = "#b91c1c"}
                >
                  {regrading ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
                  Regrade Test
                </button>
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
            {!isPending && !isError && (
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
                    {activeResults.gradingExplanation || "No grading details provided by the evaluator."}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Itemized Questions & Responses Breakdown */}
          <div>
            <h4 style={{ margin: "0 0 16px", fontSize: "1.1rem", fontWeight: 700, color: "var(--teal-dark)", borderBottom: "2px solid var(--teal)", paddingBottom: "6px", display: "inline-block" }}>
              Detailed Test Breakdown ({activeLangTab.toUpperCase()})
            </h4>
            
            <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
              {testType === "mini-cog" ? (
                /* --- MINI-COG DETAILS --- */
                <>
                  {/* Clock Drawing */}
                  <DetailSection
                    title="1. Clock Drawing Test"
                    score={activeResults.clockScore || activeResults.itemizedGrading?.clockDrawing?.score}
                    maxScore={2}
                    question="Draw a clock face, place all numbers in the correct positions, and set the hands to show 10 minutes past 11."
                    responseContent={
                      getAnswerValue(answers, "clockDrawing", activeLangTab) ? (
                        <img
                          src={getAnswerValue(answers, "clockDrawing", activeLangTab)}
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
                    rationale={activeResults.itemizedGrading?.clockDrawing?.rationale}
                  />

                  {/* Word Recall */}
                  <DetailSection
                    title="2. Three-Word Recall"
                    score={activeResults.recallScore || activeResults.itemizedGrading?.wordRecall?.score}
                    maxScore={3}
                    question={`Recall the three target words memorized at the start: ${(activeLangTab === "en" ? submission.targetWordsEnglish : (submission.targetWordsSecondary || submission.targetWordsEnglish))?.join(", ") || "Captain, Garden, Picture"}.`}
                    responseContent={
                      getAnswerValue(answers, "recallAudio", activeLangTab) ? (
                        <audio src={getAnswerValue(answers, "recallAudio", activeLangTab)} controls style={{ width: "100%", maxWidth: "360px" }} />
                      ) : (
                        <span style={{ color: "var(--red)", fontSize: "0.85rem" }}>No voice recording provided.</span>
                      )
                    }
                    transcript={activeResults.itemizedGrading?.wordRecall?.transcript}
                    rationale={activeResults.itemizedGrading?.wordRecall?.rationale}
                  />
                </>
              ) : (
                /* --- MMSE DETAILS --- */
                <>
                  {/* 1. Temporal Orientation */}
                  <DetailSection
                    title="1. Temporal Orientation"
                    score={activeResults.itemizedGrading?.temporalOrientation?.score}
                    maxScore={5}
                    question="State the year, season, month, date, and day of the week."
                    groundTruth={`Year: ${targetTemporal.year}, Season: ${targetTemporal.season}, Month: ${targetTemporal.month}, Date: ${targetTemporal.date}, Day: ${targetTemporal.day}`}
                    responseContent={
                      getAnswerValue(answers, "temporalAudio", activeLangTab) ? (
                        <audio src={getAnswerValue(answers, "temporalAudio", activeLangTab)} controls style={{ width: "100%", maxWidth: "360px" }} />
                      ) : (
                        <span style={{ color: "var(--red)", fontSize: "0.85rem" }}>No recording.</span>
                      )
                    }
                    transcript={activeResults.itemizedGrading?.temporalOrientation?.transcript}
                    rationale={activeResults.itemizedGrading?.temporalOrientation?.rationale}
                  />

                  {/* 2. Spatial Orientation */}
                  <DetailSection
                    title="2. Spatial Orientation"
                    score={activeResults.itemizedGrading?.spatialOrientation?.score}
                    maxScore={3}
                    question="State the current state/region, county/district, and city/town."
                    groundTruth={`Town: ${submission.locationGroundTruth?.town || "N/A"}, County: ${submission.locationGroundTruth?.county || "N/A"}, State: ${submission.locationGroundTruth?.state || "N/A"}`}
                    responseContent={
                      getAnswerValue(answers, "spatialAudio", activeLangTab) ? (
                        <audio src={getAnswerValue(answers, "spatialAudio", activeLangTab)} controls style={{ width: "100%", maxWidth: "360px" }} />
                      ) : (
                        <span style={{ color: "var(--red)", fontSize: "0.85rem" }}>No recording.</span>
                      )
                    }
                    transcript={activeResults.itemizedGrading?.spatialOrientation?.transcript}
                    rationale={activeResults.itemizedGrading?.spatialOrientation?.rationale}
                  />

                  {/* 3. Registration */}
                  <DetailSection
                    title="3. Registration (Word Repetition)"
                    score={activeResults.itemizedGrading?.registration?.score}
                    maxScore={3}
                    question={`Listen carefully to and repeat the three words immediately: ${(activeLangTab === "en" ? submission.targetWordsEnglish : (submission.targetWordsSecondary || submission.targetWordsEnglish))?.join(", ") || "Apple, Table, Penny"}.`}
                    responseContent={
                      getAnswerValue(answers, "registrationAudio", activeLangTab) ? (
                        <audio src={getAnswerValue(answers, "registrationAudio", activeLangTab)} controls style={{ width: "100%", maxWidth: "360px" }} />
                      ) : (
                        <span style={{ color: "var(--red)", fontSize: "0.85rem" }}>No recording.</span>
                      )
                    }
                    transcript={activeResults.itemizedGrading?.registration?.transcript}
                    rationale={activeResults.itemizedGrading?.registration?.rationale}
                  />

                  {/* 4. Attention & Calculation */}
                  <DetailSection
                    title="4. Attention & Calculation (Serial 7s)"
                    score={activeResults.itemizedGrading?.attentionCalculation?.score}
                    maxScore={5}
                    question="Subtract 7 from 100, then subtract 7 from the result, and repeat 5 times (93, 86, 79, 72, 65)."
                    responseContent={
                      getAnswerValue(answers, "attentionAudio", activeLangTab) ? (
                        <audio src={getAnswerValue(answers, "attentionAudio", activeLangTab)} controls style={{ width: "100%", maxWidth: "360px" }} />
                      ) : (
                        <span style={{ color: "var(--red)", fontSize: "0.85rem" }}>No recording.</span>
                      )
                    }
                    transcript={activeResults.itemizedGrading?.attentionCalculation?.transcript}
                    rationale={activeResults.itemizedGrading?.attentionCalculation?.rationale}
                  />

                  {/* 5. Recall */}
                  <DetailSection
                    title="5. Three-Word Recall"
                    score={activeResults.itemizedGrading?.wordRecall?.score}
                    maxScore={3}
                    question={`Recall the three words memorized in step 3: ${(activeLangTab === "en" ? submission.targetWordsEnglish : (submission.targetWordsSecondary || submission.targetWordsEnglish))?.join(", ") || "Apple, Table, Penny"}.`}
                    responseContent={
                      getAnswerValue(answers, "recallAudio", activeLangTab) ? (
                        <audio src={getAnswerValue(answers, "recallAudio", activeLangTab)} controls style={{ width: "100%", maxWidth: "360px" }} />
                      ) : (
                        <span style={{ color: "var(--red)", fontSize: "0.85rem" }}>No recording.</span>
                      )
                    }
                    transcript={activeResults.itemizedGrading?.wordRecall?.transcript}
                    rationale={activeResults.itemizedGrading?.wordRecall?.rationale}
                  />

                  {/* 6. Naming */}
                  <DetailSection
                    title="6. Object Naming"
                    score={activeResults.itemizedGrading?.naming?.score}
                    maxScore={2}
                    question="Name the two objects shown to you (a pencil and a wristwatch)."
                    responseContent={
                      <div style={{ display: "flex", flexDirection: "column", gap: "4px", fontSize: "0.85rem", color: "var(--ink)" }}>
                        <div>Object 1 (Pencil): <strong>"{activeResults.itemizedGrading?.naming?.namingObject1 || answers[`naming_object1_${activeLangTab}`] || "No response"}"</strong></div>
                        <div>Object 2 (Watch): <strong>"{activeResults.itemizedGrading?.naming?.namingObject2 || answers[`naming_object2_${activeLangTab}`] || "No response"}"</strong></div>
                      </div>
                    }
                  />

                  {/* 7. Repetition */}
                  <DetailSection
                    title="7. Phrase Repetition"
                    score={activeResults.itemizedGrading?.repetition?.score}
                    maxScore={1}
                    question={`Repeat the exact phrase: "${targetPhrase}".`}
                    responseContent={
                      getAnswerValue(answers, "repetitionAudio", activeLangTab) ? (
                        <audio src={getAnswerValue(answers, "repetitionAudio", activeLangTab)} controls style={{ width: "100%", maxWidth: "360px" }} />
                      ) : (
                        <span style={{ color: "var(--red)", fontSize: "0.85rem" }}>No recording.</span>
                      )
                    }
                    transcript={activeResults.itemizedGrading?.repetition?.transcript}
                    rationale={activeResults.itemizedGrading?.repetition?.rationale}
                  />

                  {/* 8. Command */}
                  <DetailSection
                    title="8. Three-Stage Command"
                    score={activeResults.itemizedGrading?.command?.score}
                    maxScore={3}
                    question="Follow the on-screen instructions in order: (1) Touch the green circle, (2) Touch the red square, (3) Touch the yellow triangle."
                    responseContent={
                      <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "0.85rem" }}>
                          <input type="checkbox" checked={activeResults.itemizedGrading?.command?.step1 === true || answers[`command_step1_${activeLangTab}`] === true} readOnly style={{ accentColor: "var(--teal)" }} />
                          <span>Step 1: Touched the green circle</span>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "0.85rem" }}>
                          <input type="checkbox" checked={activeResults.itemizedGrading?.command?.step2 === true || answers[`command_step2_${activeLangTab}`] === true} readOnly style={{ accentColor: "var(--teal)" }} />
                          <span>Step 2: Touched the red square</span>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "0.85rem" }}>
                          <input type="checkbox" checked={activeResults.itemizedGrading?.command?.step3 === true || answers[`command_step3_${activeLangTab}`] === true} readOnly style={{ accentColor: "var(--teal)" }} />
                          <span>Step 3: Touched the yellow triangle</span>
                        </div>
                      </div>
                    }
                  />

                  {/* 9. Reading */}
                  <DetailSection
                    title="9. Reading & Obedience"
                    score={activeResults.itemizedGrading?.reading?.score !== undefined ? activeResults.itemizedGrading?.reading?.score : (answers[`readingObeyed_${activeLangTab}`] === true ? 1 : 0)}
                    maxScore={1}
                    question="Read the bold on-screen command 'TAP THE ORANGE STAR' and tap the correct shape."
                    responseContent={
                      <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "0.85rem" }}>
                        <input type="checkbox" checked={activeResults.itemizedGrading?.reading?.score === 1 || answers[`readingObeyed_${activeLangTab}`] === true} readOnly style={{ accentColor: "var(--teal)" }} />
                        <span>Obeyed instruction (Tapped orange star)</span>
                      </div>
                    }
                  />

                  {/* 10. Writing */}
                  <DetailSection
                    title="10. Sentence Writing"
                    score={activeResults.itemizedGrading?.writing?.score}
                    maxScore={1}
                    question="Write a complete sentence containing a subject and a verb that makes sense."
                    responseContent={
                      <div style={{ padding: "8px 12px", background: "#f8fafc", border: "1px dashed #cbd5e1", borderRadius: "6px", fontSize: "0.9rem", color: "var(--ink)", fontWeight: 500 }}>
                        "{getAnswerValue(answers, "writingSentence", activeLangTab) || "No sentence written."}"
                      </div>
                    }
                    rationale={activeResults.itemizedGrading?.writing?.rationale}
                  />

                  {/* 11. Drawing */}
                  <DetailSection
                    title="11. Design Copy (Intersecting Pentagons)"
                    score={activeResults.itemizedGrading?.drawing?.score}
                    maxScore={1}
                    question="Copy the drawing of the two intersecting pentagons. They must have five sides each and overlap to form a four-sided intersection."
                    responseContent={
                      getAnswerValue(answers, "pentagonDrawing", activeLangTab) ? (
                        <img
                          src={getAnswerValue(answers, "pentagonDrawing", activeLangTab)}
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
                    rationale={activeResults.itemizedGrading?.drawing?.rationale}
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
