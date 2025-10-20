import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { dark, neobrutalism } from "@clerk/themes";
import { Geist, Geist_Mono } from "next/font/google";

import "./globals.css";

export const dynamic = "force-dynamic";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Tasky · Modern Kanban for high-performing teams",
  description:
    "Tasky is a production-ready, Trello-inspired Kanban board that combines Clerk authentication, Prisma, and Next.js 15 to keep teams aligned and shipping fast.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <ClerkProvider
      appearance={{
        baseTheme: [dark, neobrutalism],
        variables: {
          colorPrimary: "hsl(217 91% 60%)",
        },
      }}
    >
      <html lang="en">
        <body className={`${geistSans.variable} ${geistMono.variable} bg-background text-foreground antialiased`}>
          {children}
        </body>
      </html>
    </ClerkProvider>
  );
}
