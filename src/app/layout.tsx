import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ShareScreen Privado",
  description: "Discord Activity Privada para o grupo",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body className="antialiased bg-black m-0 p-0 overflow-hidden">
        {children}
      </body>
    </html>
  );
}
