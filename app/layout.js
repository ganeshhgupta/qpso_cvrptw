import "./globals.css";

export const metadata = {
  title: "QPSO CVRPTW",
  description: "Quantum-Inspired PSO for Capacitated Vehicle Routing with Time Windows",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
