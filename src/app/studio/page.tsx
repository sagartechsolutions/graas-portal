import type { Metadata } from "next";
import StudioApp from "./StudioApp";

export const metadata: Metadata = { title: "Expert studio", robots: { index: false } };

export default function Page() {
  return <StudioApp />;
}
