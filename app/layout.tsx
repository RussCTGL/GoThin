import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Inter, Sora } from "next/font/google";
import { adminEmails, authEnabled, getUser } from "@/lib/auth/user";
import SiteNav from "./nav";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});
const sora = Sora({
  subsets: ["latin"],
  weight: ["600", "700", "800"],
  variable: "--font-sora",
  display: "swap",
});

export const metadata: Metadata = {
  title: "GoThin — AI Fitness Coach",
  description:
    "Log meals and weight in plain English. Get calorie estimates and direct, no-shame AI coaching.",
};

export default async function RootLayout({
  children,
}: {
  children: ReactNode;
}) {
  const showAuth = authEnabled();
  const user = showAuth ? await getUser() : null;
  const isAdminUser =
    !!user?.email && adminEmails().includes(user.email.toLowerCase());

  return (
    <html lang="en" className={`${inter.variable} ${sora.variable}`}>
      <body>
        <SiteNav
          showAuth={showAuth}
          isAdmin={isAdminUser}
          email={user?.email ?? null}
        />
        <main className="mx-auto w-full max-w-5xl px-5 pb-24 pt-8 md:pt-10">
          {children}
        </main>
      </body>
    </html>
  );
}
