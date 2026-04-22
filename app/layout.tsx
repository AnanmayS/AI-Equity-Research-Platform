import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

import { AuthProvider } from "@/components/auth/auth-provider";
import { Header } from "@/components/site/header";

export const metadata: Metadata = {
  title: "Stock Analyst AI",
  description: "AI-powered equity research reports grounded in verified financial data."
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          <Header />
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
