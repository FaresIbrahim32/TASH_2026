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
} from "lucide-react";

export default function Dashboard({ user }) {
  const router = useRouter();
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(false);
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
          <span className="eyebrow" style={{ color: "#91d6cd", fontWeight: "800", fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "1px" }}>
            Patient Portal
          </span>
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
                  const screeningFlag = sub.answers?.screeningFlag || "incomplete";
                  let badgeBg = "#f3f4f6";
                  let badgeColor = "#4b5563";
                  let statusLabel = "Incomplete";
                  let StatusIcon = FileText;

                  if (screeningFlag === "negative-screen") {
                    badgeBg = "#ecfdf5";
                    badgeColor = "#047857";
                    statusLabel = "Negative (Normal)";
                    StatusIcon = CheckCircle;
                  } else if (screeningFlag === "positive-screen") {
                    badgeBg = "#fff1f2";
                    badgeColor = "#e11d48";
                    statusLabel = "Positive (Review Recommended)";
                    StatusIcon = AlertTriangle;
                  }

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
                            Mini-Cog Screening
                          </h4>
                          <span
                            style={{
                              background: badgeBg,
                              color: badgeColor,
                              fontSize: "0.78rem",
                              fontWeight: 700,
                              padding: "4px 10px",
                              borderRadius: "20px",
                              display: "flex",
                              alignItems: "center",
                              gap: "4px",
                            }}
                          >
                            <StatusIcon size={13} />
                            {statusLabel}
                          </span>
                        </div>

                        <div style={{ display: "flex", flexWrap: "wrap", gap: "16px", color: "var(--muted)", fontSize: "0.85rem" }}>
                          <span style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                            <Calendar size={14} />
                            {formatDate(sub.createdAt)}
                          </span>
                          <span style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                            <Languages size={14} />
                            Languages: {sub.testsRendered?.map(l => l.toUpperCase()).join(", ") || "EN"}
                          </span>
                        </div>
                      </div>

                      {/* Scores Breakdown */}
                      <div style={{ display: "flex", gap: "20px" }}>
                        <div style={{ textAlign: "center", background: "#f8faf9", padding: "8px 16px", borderRadius: "8px", border: "1px solid var(--line)" }}>
                          <span style={{ display: "block", fontSize: "0.72rem", color: "var(--muted)", textTransform: "uppercase", fontWeight: 700 }}>
                            Word Recall
                          </span>
                          <strong style={{ fontSize: "1.2rem", color: "var(--teal-dark)" }}>
                            {sub.answers?.recallScore !== undefined && sub.answers?.recallScore !== null ? `${sub.answers.recallScore}/3` : "--"}
                          </strong>
                        </div>

                        <div style={{ textAlign: "center", background: "#f8faf9", padding: "8px 16px", borderRadius: "8px", border: "1px solid var(--line)" }}>
                          <span style={{ display: "block", fontSize: "0.72rem", color: "var(--muted)", textTransform: "uppercase", fontWeight: 700 }}>
                            Clock Draw
                          </span>
                          <strong style={{ fontSize: "1.2rem", color: "var(--teal-dark)" }}>
                            {sub.answers?.clockScore !== undefined && sub.answers?.clockScore !== null ? `${sub.answers.clockScore}/2` : "--"}
                          </strong>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
