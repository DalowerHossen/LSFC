import type { Metadata } from "next";
import { TrackingPageView } from "@/components/tracking/TrackingPageView";

export const metadata: Metadata = {
  title: "আবেদন ট্র্যাকিং",
  description: "ট্র্যাকিং আইডি ও মোবাইল নম্বর দিয়ে ভূমিসেবা আবেদনের অবস্থা জানুন",
};

export default async function TrackingByIdPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <TrackingPageView trackingId={id} />;
}
