import type { Metadata } from "next";
import PreRegister from "@/components/home/PreRegister";

export const metadata: Metadata = { title: "Contact", description: "Send a message to GRAAS." };

export default function Page() {
  return (
    <PreRegister
      contact
      title="Send GRAAS a message"
      intro="Questions about membership, chapters, partnerships or GRAASCON. Write to us here and we will reply on the number or email you give."
    />
  );
}
