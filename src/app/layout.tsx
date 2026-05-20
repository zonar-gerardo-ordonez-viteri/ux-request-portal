import type { Metadata } from "next";
import { AuthProvider } from "@/lib/auth-context";
import { TopbarWrapper } from "@/components/topbar-wrapper";
import "./globals.css";

export const metadata: Metadata = {
  title: "UX Request Portal",
  description: "Centralized UX request management for the design team",
  icons: {
    icon: "/zonar-icon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-full flex flex-col" style={{ fontFamily: "'Roboto', system-ui, sans-serif" }}>
        <AuthProvider>
          <TopbarWrapper />
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
