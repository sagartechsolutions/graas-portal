import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { publicClient } from "@/lib/data";

const str = (v: unknown, max: number) => (typeof v === "string" ? v.slice(0, max) : "");

/** Pre-registration and contact messages. All validation and rate limiting live in the database function. */
export async function POST(req: Request) {
  let b: Record<string, unknown>;
  try {
    b = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "That request could not be read." }, { status: 400 });
  }
  // Honeypot: real visitors never see or fill this field.
  if (str(b.website, 200).trim() !== "") return NextResponse.json({ ok: true, serial: 0, code: "", existing: false });

  const ip = req.headers.get("x-nf-client-connection-ip") ?? req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "";
  const ipHash = ip ? createHash("sha256").update(`${process.env.IP_SALT ?? ""}:${ip}`).digest("hex").slice(0, 32) : null;

  const data = {
    kind: str(b.kind, 20),
    full_name: str(b.full_name, 80),
    phone: str(b.phone, 20),
    email: str(b.email, 160),
    organisation: str(b.organisation, 120),
    city: str(b.city, 80),
    message: str(b.message, 1000),
    interests: Array.isArray(b.interests) ? b.interests.filter((x) => typeof x === "string").slice(0, 12) : [],
    is_adult: b.is_adult === true,
    consent_contact: b.consent_contact === true,
    source: str(b.source, 120),
    ref: str(b.ref, 12),
    utm: b.utm && typeof b.utm === "object" && !Array.isArray(b.utm) ? b.utm : null,
  };

  const { data: out, error } = await publicClient().rpc("submit_lead", {
    p_token: process.env.LEAD_TOKEN ?? "",
    p_data: data,
    p_ip_hash: ipHash,
    p_user_agent: req.headers.get("user-agent") ?? "",
  });
  if (error) {
    console.error("submit_lead failed", error.code, error.message);
    return NextResponse.json({ ok: false, error: "We could not save that just now. Please try again in a minute." }, { status: 502 });
  }
  return NextResponse.json(out, { status: out?.ok ? 200 : 422 });
}
