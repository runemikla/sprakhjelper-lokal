import type { Metadata } from "next";
import localFont from "next/font/local";
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

// VLFK profile fonts: Roboto for text, Roboto Slab for page and section titles.
const roboto = localFont({
  src: [
    { path: "./fonts/Roboto.woff2", weight: "100 900", style: "normal" },
    { path: "./fonts/Roboto-Italic.woff2", weight: "100 900", style: "italic" },
  ],
  variable: "--font-roboto",
  display: "swap",
});

const robotoSlab = localFont({
  src: "./fonts/RobotoSlab.woff2",
  weight: "100 900",
  variable: "--font-roboto-slab",
  display: "swap",
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
      <body className={`${roboto.variable} ${robotoSlab.variable} font-sans antialiased`}>
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

