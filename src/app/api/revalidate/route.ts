import { createClient } from "@supabase/supabase-js";
import { revalidateTag } from "next/cache";
import { NextResponse } from "next/server";

/** Called by the admin panel after a save so the public pages show new prices and settings at once. Staff only. */
export async function POST(req: Request) {
  const token = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return NextResponse.json({ ok: false }, { status: 401 });
  const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  const { data: u } = await sb.auth.getUser(token);
  if (!u?.user) return NextResponse.json({ ok: false }, { status: 401 });
  const { data: staff } = await sb.from("staff_members").select("is_active").eq("user_id", u.user.id).maybeSingle();
  if (!staff?.is_active) return NextResponse.json({ ok: false }, { status: 403 });
  revalidateTag("plans", { expire: 0 });
  revalidateTag("settings", { expire: 0 });
  return NextResponse.json({ ok: true });
}
