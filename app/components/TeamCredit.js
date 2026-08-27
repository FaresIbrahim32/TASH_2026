"use client";

// Shown only on the main screens (login, signup, dashboard) — not on the
// individual feature pages (/test, /mri, /culture-connect, /card-recall), per
// design intent.
const TEAM = [
  { name: "Harshavardan Yuvaraj", url: "https://www.linkedin.com/in/harsha-yuvaraj/" },
  { name: "Fares Ibrahim", url: "https://www.linkedin.com/in/fares-ibrahim-shehata/" },
  { name: "Brandon Ugbesia", url: "https://www.linkedin.com/in/brandon-ugbesia/" },
];

const SUPERVISORS = [
  { name: "Chuanhai Cao", url: "https://health.usf.edu/pharmacy/labs/cao-lab/" },
  { name: "Yu Sun", url: "https://www.usf.edu/ai-cybersecurity-computing/people/faculty/sun-yu.aspx" },
];

const linkStyle = {
  color: "var(--teal)",
  fontWeight: 700,
  textDecoration: "none",
};

/** Renders linked names joined as "A", "A & B", or "A, B & C". */
function NameList({ people }) {
  return people.map((person, i) => (
    <span key={person.name}>
      <a href={person.url} target="_blank" rel="noopener noreferrer" style={linkStyle}>
        {person.name}
      </a>
      {i < people.length - 2 ? ", " : i === people.length - 2 ? " & " : ""}
    </span>
  ));
}

export default function TeamCredit() {
  return (
    <footer
      style={{
        padding: "14px clamp(18px, 4vw, 44px)",
        textAlign: "center",
        fontSize: "0.78rem",
        color: "var(--muted)",
        borderTop: "1px solid var(--line)",
        background: "#f6f7f4",
      }}
    >
      Built by <NameList people={TEAM} />
      {` — Supervising Professor${SUPERVISORS.length > 1 ? "s" : ""}: `}
      <NameList people={SUPERVISORS} />
    </footer>
  );
}
