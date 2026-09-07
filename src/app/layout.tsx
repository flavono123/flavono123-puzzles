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
  title: "flavono123 퍼즐",
  description: "작은 퍼즐들. 첫 정원은 시시오도시.",
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
