import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Hundepension Schmidt",
  description: "Internes CRM- und Buchungsverwaltungssystem",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="de">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
