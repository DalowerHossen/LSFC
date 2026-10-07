import type { Metadata } from "next";
import { TrackingPageView } from "@/components/tracking/TrackingPageView";

export const metadata: Metadata = {
  title: "আবেদন ট্র্যাকিং",
  description: "ট্র্যাকিং আইডি ও মোবাইল নম্বর দিয়ে ভূমিসেবা আবেদনের অবস্থা জানুন",
};

export default function TrackingPage() {
  return <TrackingPageView />;
}
