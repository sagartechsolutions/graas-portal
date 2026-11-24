import type { Metadata } from "next";
import SignInForm from "@/components/member/SignInForm";

export const metadata: Metadata = { title: "Sign in", description: "Sign in to your GRAAS member account." };

export default function Page() {
  return <SignInForm />;
}
