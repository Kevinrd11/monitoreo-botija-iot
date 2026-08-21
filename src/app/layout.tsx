import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({ variable: "--font-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Botija | Prevención de Desabastecimiento de Agua",
  description:
    "Sistema IoT que vigila la reserva de agua de la Finca Agroturística Botija y avisa antes de que la finca se quede sin suministro. Dos sensores digitales sobre ESP8266.",
  applicationName: "Botija - Prevención de Desabastecimiento",
  openGraph: {
    title: "Botija | Prevención de Desabastecimiento de Agua",
    description:
      "Sistema IoT que avisa antes de que la Finca Agroturística Botija se quede sin agua.",
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
