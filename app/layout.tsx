import type { Metadata } from "next";
import { Geist } from "next/font/google";
import { ThemeProvider } from "next-themes";
import { Toaster } from "sonner";
import "./globals.css";
import { UserRolesProvider } from "@/components/auth/user-roles-provider";
import { getPageUser } from "@/lib/auth/page-user";

const defaultUrl = process.env.VERCEL_URL
  ? `https://${process.env.VERCEL_URL}`
  : "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(defaultUrl),
  title: "Språkhjelp - Lær norsk",
  description: "En AI-drevet språkassistent for å lære norsk",
};

const geistSans = Geist({
  variable: "--font-geist-sans",
  display: "swap",
  subsets: ["latin"],
});

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { user, isAdmin, isTeacher, isStudent } = await getPageUser();
  const roles = { loggedIn: Boolean(user), isAdmin, isTeacher, isStudent };
  return (
    <html lang="no" suppressHydrationWarning>
      <body className={`${geistSans.className} antialiased`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <UserRolesProvider roles={roles}>{children}</UserRolesProvider>
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}

