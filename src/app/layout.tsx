import type { Metadata } from "next";
import { Geist, Shippori_Mincho } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const mincho = Shippori_Mincho({
  variable: "--font-mincho",
  weight: ["400", "600"],
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "flavono123 puzzles",
  description: "Vercel puzzle POCs. First: Sozu, a shishi-odoshi piping garden.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="ko"
      className={`${geistSans.variable} ${mincho.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-[#efe6d2] text-[#3a3530]">
        {children}
      </body>
    </html>
  );
}
