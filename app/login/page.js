"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { KeyRound, Mail, AlertCircle, ArrowRight } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function handleChange(event) {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Something went wrong.");
      }

      // Successful login, refresh router to update middleware session state and redirect to dashboard
      router.push("/");
      router.refresh();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="appShell" style={{ display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
      <header className="topBar">
        <div>
          <h1>Cognitive Assessment Portal</h1>
        </div>
      </header>

      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "40px 18px" }}>
        <div className="demographicsPanel" style={{ width: "100%", maxWidth: "440px", padding: "28px", gap: "20px", gridColumn: "auto" }}>
          <div className="sectionTitle" style={{ marginBottom: "10px" }}>
            <KeyRound size={22} />
            <h2>Sign In</h2>
          </div>

          {error && (
            <div className="notice" style={{ background: "#fff1ef", color: "#b42318", border: "1px solid #fda29b" }}>
              <AlertCircle size={18} />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
            <label>
              Email Address
              <div style={{ position: "relative" }}>
                <input
                  type="email"
                  name="email"
                  required
                  value={form.email}
                  onChange={handleChange}
                  placeholder="name@example.com"
                  style={{ width: "100%", paddingLeft: "36px" }}
                />
                <Mail size={16} style={{ position: "absolute", left: "12px", top: "13px", color: "var(--muted)" }} />
              </div>
            </label>

            <label>
              Password
              <div style={{ position: "relative" }}>
                <input
                  type="password"
                  name="password"
                  required
                  value={form.password}
                  onChange={handleChange}
                  placeholder="••••••••"
                  style={{ width: "100%", paddingLeft: "36px" }}
                />
                <KeyRound size={16} style={{ position: "absolute", left: "12px", top: "13px", color: "var(--muted)" }} />
              </div>
            </label>

            <button type="submit" disabled={loading} style={{ width: "100%", justifyContent: "center", marginTop: "8px" }}>
              {loading ? "Signing in..." : "Sign In"}
              {!loading && <ArrowRight size={16} />}
            </button>
          </form>

          <div style={{ textAlign: "center", marginTop: "10px", fontSize: "0.88rem", color: "var(--muted)" }}>
            Don't have an account?{" "}
            <Link href="/signup" style={{ color: "var(--teal)", fontWeight: "bold", textDecoration: "none" }}>
              Register here
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
