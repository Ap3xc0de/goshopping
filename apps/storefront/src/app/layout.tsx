import type { Metadata } from "next";
import {
  Inter,
  Playfair_Display,
  Space_Grotesk,
  Cormorant_Garamond,
  Lora,
  Bebas_Neue,
  DM_Sans,
  Nunito,
  Nunito_Sans,
} from "next/font/google";
import { ThemeProvider } from "next-themes";
import "@/app/globals.css";
import "@/styles/theme.css";

// ── Google Fonts — cada una expone una CSS variable ──────────────────────
const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

// Minimal
const playfairDisplay = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-playfair-display",
  weight: ["400", "500", "600", "700"],
});

// Vibrant
const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space-grotesk",
});

// Elegant
const cormorantGaramond = Cormorant_Garamond({
  subsets: ["latin"],
  variable: "--font-cormorant-garamond",
  weight: ["300", "400", "500", "600", "700"],
});
const lora = Lora({ subsets: ["latin"], variable: "--font-lora" });

// Urban
const bebasNeue = Bebas_Neue({
  subsets: ["latin"],
  variable: "--font-bebas-neue",
  weight: ["400"],
});
const dmSans = DM_Sans({ subsets: ["latin"], variable: "--font-dm-sans" });

// Fresh
const nunito = Nunito({ subsets: ["latin"], variable: "--font-nunito" });
const nunitoSans = Nunito_Sans({
  subsets: ["latin"],
  variable: "--font-nunito-sans",
});

export const metadata: Metadata = {
  title: "Storefront — Go Shopping",
  description: "Motor de tiendas Go Shopping",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const fontVariables = [
    inter.variable,
    playfairDisplay.variable,
    spaceGrotesk.variable,
    cormorantGaramond.variable,
    lora.variable,
    bebasNeue.variable,
    dmSans.variable,
    nunito.variable,
    nunitoSans.variable,
  ].join(" ");

  return (
    <html lang="es" suppressHydrationWarning>
      <body className={`${fontVariables} font-sans`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem
          disableTransitionOnChange
        >
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
