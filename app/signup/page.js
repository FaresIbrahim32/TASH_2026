"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { User, Mail, KeyRound, AlertCircle, ArrowRight, ClipboardList } from "lucide-react";

export default function SignupPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    gender: "",
    age: "",
    educationYears: "",
  });
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
      const response = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Registration failed.");
      }

      // Successful registration, refresh router to update session and redirect
      router.push("/");
      router.refresh();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="appShell" style={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
      <header className="topBar">
        <div>
          <h1>Cognitive Assessment Portal</h1>
          <p className="headerCopy">
            Create an account to start your cognitive screening tasks.
          </p>
        </div>
      </header>

      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "30px 18px" }}>
        <div className="demographicsPanel" style={{ width: "100%", maxWidth: "560px", padding: "28px", gap: "20px", gridColumn: "auto" }}>
          <div className="sectionTitle" style={{ marginBottom: "10px" }}>
            <ClipboardList size={22} />
            <h2>Register New Profile</h2>
          </div>

          {error && (
            <div className="notice" style={{ background: "#fff1ef", color: "#b42318", border: "1px solid #fda29b" }}>
              <AlertCircle size={18} />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
            <div className="twoCol">
              <label>
                First Name
                <input
                  type="text"
                  name="firstName"
                  required
                  value={form.firstName}
                  onChange={handleChange}
                  placeholder="First name"
                />
              </label>

              <label>
                Last Name
                <input
                  type="text"
                  name="lastName"
                  required
                  value={form.lastName}
                  onChange={handleChange}
                  placeholder="Last name"
                />
              </label>
            </div>

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
                  placeholder="Minimum 6 characters"
                  style={{ width: "100%", paddingLeft: "36px" }}
                />
                <KeyRound size={16} style={{ position: "absolute", left: "12px", top: "13px", color: "var(--muted)" }} />
              </div>
            </label>

            <div className="twoCol">
              <label>
                Age
                <input
                  type="number"
                  name="age"
                  required
                  min="1"
                  max="125"
                  value={form.age}
                  onChange={handleChange}
                  placeholder="Years"
                />
              </label>

              <label>
                Education Years
                <input
                  type="number"
                  name="educationYears"
                  required
                  min="0"
                  max="40"
                  value={form.educationYears}
                  onChange={handleChange}
                  placeholder="Years completed"
                />
              </label>
            </div>

            <label>
              Gender
              <select name="gender" required value={form.gender} onChange={handleChange}>
                <option value="">Select Gender</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </label>

            <button type="submit" disabled={loading} style={{ width: "100%", justifyContent: "center", marginTop: "8px" }}>
              {loading ? "Registering profile..." : "Register Profile"}
              {!loading && <ArrowRight size={16} />}
            </button>
          </form>

          <div style={{ textAlign: "center", marginTop: "10px", fontSize: "0.88rem", color: "var(--muted)" }}>
            Already have an account?{" "}
            <Link href="/login" style={{ color: "var(--teal)", fontWeight: "bold", textDecoration: "none" }}>
              Sign in here
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
