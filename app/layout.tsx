import type { Metadata } from "next";
import { Roboto, Roboto_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "sonner";
import { AuthProvider } from "@/lib/auth-context";
import { ProfileInitializer } from "@/components/profile-initializer";
import { QuickActionButton } from "@/components/quick-action-button";
import { PDFProvider } from "@/contexts/pdf-context";

const roboto = Roboto({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  weight: ["300", "400", "500", "700"],
});

const robotoMono = Roboto_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  weight: ["400", "700"],
});

export const metadata: Metadata = {
  title: "Create Next App",
  description: "Generated by create next app",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${roboto.variable} ${robotoMono.variable} antialiased`}
      >
        <PDFProvider>
          <AuthProvider>
            <ProfileInitializer>
              {children}
            </ProfileInitializer>
            <Toaster position="top-right" />
            <QuickActionButton />
          </AuthProvider>
        </PDFProvider>
      </body>
    </html>
  );
}
