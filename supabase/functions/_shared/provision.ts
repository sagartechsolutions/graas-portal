// Creates GRAAS logins for chapter students that GRAAS has approved (or a chapter has paid for), and emails each
// student their login ID and a first password. The password is never stored or logged: the message log keeps "******".
// Used by `notify` (woken by the database, and every two minutes) and by `portal` right after approval or payment.
// deno-lint-ignore-file no-explicit-any
import { deliver, type Messaging, SITE } from "./messaging.ts";

const UPPER = "ABCDEFGHJKLMNPQRSTUVWXYZ";
const LOWER = "abcdefghijkmnpqrstuvwxyz";
const DIGIT = "23456789";

/** A first password that is easy to type from an email: Abcd-2345-Efg (letters and digits that cannot be confused). */
export function firstPassword() {
  const pick = (s: string) => s[crypto.getRandomValues(new Uint32Array(1))[0] % s.length];
  const run = (n: number, s: string) => Array.from({ length: n }, () => pick(s)).join("");
  return `${pick(UPPER)}${run(3, LOWER)}-${run(4, DIGIT)}-${pick(UPPER)}${run(2, LOWER)}`;
}

const first = (n: unknown) => String(n ?? "").trim().split(/\s+/)[0] || "there";

export function loginVars(r: { full_name: string; email: string; member_no: string; plan: string; chapter: string; pay?: boolean; amount?: string | null }, password: string) {
  return {
    name: first(r.full_name),
    chapter: r.chapter,
    plan: r.plan,
    member_no: r.member_no || "shown in your account",
    login: r.email,
    password,
    next_step: r.pay
      ? `Your chapter has asked you to pay your own fee of ${r.amount ?? "the Student fee"}. After you sign in, pay from your account and your membership becomes active at once.`
      : "Your membership is already active. There is nothing to pay.",
    link: `${SITE}/signin`,
  };
}

/** Sends the login email and records it in the message log with the password hidden. */
export async function sendLogin(admin: any, m: Messaging, userId: string, email: string, vars: Record<string, string>) {
  const sent = await deliver(m, "chapter_member_login", "email", email, vars);
  await admin.rpc("svc_log_message", {
    p_user: userId,
    p_event: "chapter_member_login",
    p_channel: "email",
    p_to: email,
    p_vars: { ...vars, password: "******" },
    p_ok: sent.ok,
    p_provider_id: sent.id ?? null,
    p_error: sent.ok ? null : sent.error ?? "Not sent.",
    p_subject: sent.subject ?? null,
    p_actor: null,
  });
  return sent;
}

/** Sets up waiting students, oldest first, until `deadline` (ms since epoch). Safe to run in parallel: rows are claimed. */
export async function provisionRows(admin: any, m: Messaging, opts: { chapter?: string | null; deadline: number; batch?: number }) {
  let made = 0;
  let failed = 0;
  let emailed = 0;
  while (Date.now() < opts.deadline) {
    const claimed: any[] = (await admin.rpc("svc_roster_claim", { p_chapter: opts.chapter ?? null, p_limit: opts.batch ?? 10 })).data ?? [];
    if (!claimed.length) break;
    for (const r of claimed) {
      if (Date.now() > opts.deadline + 15_000) break; // anything left is picked up again after ten minutes
      const password = firstPassword();
      const created = await admin.auth.admin.createUser({
        email: r.email,
        password,
        email_confirm: true,
        user_metadata: { full_name: r.full_name },
        app_metadata: { via: "chapter_roster" },
      });
      const id: string | undefined = created.data?.user?.id;
      if (created.error || !id) {
        const dup = /already|registered|exists/i.test(created.error?.message ?? "");
        await admin.rpc("svc_roster_failed", { p_row: r.id, p_error: dup ? "This email already has a GRAAS account." : "The account could not be created." });
        failed++;
        continue;
      }
      // A chapter login must never carry staff rights.
      const staff = (await admin.from("staff_members").select("user_id").eq("user_id", id).maybeSingle()).data;
      const act = staff ? null : await admin.rpc("svc_roster_activate", { p_row: r.id, p_user: id });
      if (!act || act.error || !act.data?.ok) {
        await admin.auth.admin.deleteUser(id);
        await admin.rpc("svc_roster_failed", { p_row: r.id, p_error: act?.data?.error ?? "The membership could not be set up." });
        failed++;
        continue;
      }
      made++;
      const vars = loginVars({ full_name: r.full_name, email: r.email, ...act.data }, password);
      const sent = await sendLogin(admin, m, id, r.email, vars);
      await admin.rpc("svc_roster_sent", { p_row: r.id, p_ok: sent.ok, p_error: sent.ok ? null : sent.error ?? "Not sent." });
      if (sent.ok) emailed++;
    }
  }
  return { made, failed, emailed };
}
