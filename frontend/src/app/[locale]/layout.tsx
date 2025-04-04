import { Inter } from "next/font/google";
import type { Metadata } from "next";
import "./calendar.css";
import "./globals.css";

// i18n
import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";

const inter = Inter({ subsets: ["latin"], display: "swap" }); // inter is variable font so no "weight" needed, recommended

export const metadata: Metadata = {
  title: "Nulla Pay | Crypto payments with 0% fees",
  description:
    "With a true peer-2-peer payments design, Nulla Pay is an easy-to-use and near-zero cost platform to help small businesses set up crypto payments. Set up in 1 minute.",
  keywords: ["crypto payments", "blockchain payments", "stablecoin payments", "cryptocurrency payments"],
  metadataBase: new URL("https://www.nullapay.com"),
  alternates: {
    canonical: "/",
    languages: {
      en: "/en",
      "zh-TW": "/zh-TW",
    },
  },
  openGraph: {
    url: "https://www.nullapay.com",
    title: "Nulla Pay | Crypto payments with 0% fees",
    description:
      "With a true peer-2-peer payments design, Nulla Pay is an easy-to-use and near-zero cost platform to help small businesses set up crypto payments. Set up in 1 minute.",
    images: [
      {
        url: "/logoOG.png",
        width: 1030,
        height: 451,
        alt: "Nulla Pay",
      },
    ],
    type: "website",
  },
  applicationName: "Nulla Pay",
};

// inter.className to inter.variable
export default async function RootLayout({ children, params }: { children: React.ReactNode; params: { locale: string } }) {
  console.log("/layout.tsx");
  const messages = await getMessages();
  const { locale } = params;

  return (
    <html suppressHydrationWarning lang={locale} className={inter.className} style={{ fontSize: locale == "zh-TW" ? "18px" : "16px" }}>
      <body className="antialiased">
        <NextIntlClientProvider messages={messages}>{children}</NextIntlClientProvider>
      </body>
    </html>
  );
}
