import type { Metadata } from "next";
import ForgotApp from "@/components/member/ForgotApp";

export const metadata: Metadata = { title: "Reset your password", description: "Get a code by email or WhatsApp and choose a new password for your GRAAS account." };

export default function Page() {
  return <ForgotApp />;
}
