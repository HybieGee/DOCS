import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { WalletContextProvider } from "./contexts/WalletContext";
import { AuthProvider } from "./hooks/useAuth";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Droplets of Creation - $DOC",
  description: "An interactive, narrative-driven world where raindrops become characters. Mint, evolve, and shape the story.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-gradient-to-b from-sky-900 via-blue-900 to-indigo-900 min-h-screen`}
      >
        <WalletContextProvider>
          <AuthProvider>
            {children}
          </AuthProvider>
        </WalletContextProvider>
      </body>
    </html>
  );
}
