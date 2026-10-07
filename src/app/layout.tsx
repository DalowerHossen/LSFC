import type { Metadata, Viewport } from "next";
import "@fontsource-variable/noto-sans-bengali";
import { ServiceWorkerRegistration } from "@/components/pwa/ServiceWorkerRegistration";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "ভূমিসেবা সহায়তা কেন্দ্র",
    template: "%s | ভূমিসেবা সহায়তা কেন্দ্র",
  },
  description:
    "ভূমিসেবা সহায়তা কেন্দ্রের কার্যক্রম পরিচালনার জন্য নিরাপদ ও সমন্বিত ডিজিটাল প্ল্যাটফর্ম।",
};

export const viewport: Viewport = {
  themeColor: "#006a4e",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="bn" className="antialiased">
      <body>
        <a href="#main-content" className="skip-link">মূল বিষয়বস্তুতে যান</a>
        <ServiceWorkerRegistration />
        <div id="main-content" tabIndex={-1}>{children}</div>
      </body>
    </html>
  );
}
