import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({ variable: "--font-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Botija | Monitoreo de Tanque",
  description:
    "Dashboard de monitoreo en tiempo real del tanque de agua de la Finca Agroturística Botija, con sensores digitales LOW y HIGH sobre ESP8266.",
  applicationName: "Botija - Monitoreo de Tanque",
  openGraph: {
    title: "Botija | Monitoreo de Tanque",
    description:
      "Monitoreo en tiempo real del tanque de agua de la Finca Agroturística Botija.",
    images: ["/botija-logo.png"],
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f5f7fa" },
    { media: "(prefers-color-scheme: dark)", color: "#12161f" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="es"
      className={`dark ${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
