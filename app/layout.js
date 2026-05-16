import "./globals.css";

export const metadata = {
  title: "TASH Screening",
  description: "Multilingual cognitive screening capture workflow",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
