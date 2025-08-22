import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "디지털 서명 도구 - 간편한 블록체인 서명",
  description: "모바일에서 간편하게 사용할 수 있는 디지털 서명 도구입니다. MetaMask와 연동하여 메시지 서명과 검증을 쉽게 할 수 있습니다.",
  keywords: ["디지털서명", "블록체인", "MetaMask", "이더리움", "서명검증"],
  authors: [{ name: "Wallet App" }],
  viewport: {
    width: "device-width",
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
  },
  themeColor: "#3B82F6",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "디지털 서명 도구",
  },
  formatDetection: {
    telephone: false,
  },
  openGraph: {
    title: "디지털 서명 도구",
    description: "모바일에서 간편하게 사용할 수 있는 디지털 서명 도구",
    type: "website",
    locale: "ko_KR",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        suppressHydrationWarning={true}
      >
        {children}
      </body>
    </html>
  );
}
