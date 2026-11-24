import { redirect } from "next/navigation";

/** The industry page moved to /industries. */
export default function Page() {
  redirect("/industries");
}
