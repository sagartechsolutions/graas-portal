"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */
import type { Session } from "@supabase/supabase-js";
import { useCallback, useEffect, useMemo, useState } from "react";
import { portal } from "@/lib/browser";
import { inr, shortDate } from "@/lib/money";
import { Badge, Msg, Stat, type Tone, downloadCsv, lbl, refreshSite, sb, small } from "./shared";

const ORDER_TONE: Record<string, Tone> = { paid: "good", created: "plain", failed: "bad", refunded: "plain", cancelled: "plain" };
const ORDER_LABEL: Record<string, string> = { paid: "Paid", created: "Started, not paid", failed: "Failed", refunded: "Refunded", cancelled: "Replaced" };
const WEBHOOK_URL = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/razorpay-webhook`;

/* ---------- Payments and refunds ---------- */

export function Payments({ role }: { role: string }) {
  const [orders, setOrders] = useState<any[]>([]);
  const [refunds, setRefunds] = useState<any[]>([]);
  const [status, setStatus] = useState("paid");
  const [q, setQ] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [msg, setMsg] = useState<{ tone: Tone; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const canRefund = role === "super_admin" || role === "finance";

  const load = useCallback(async () => {
    const [o, r] = await Promise.all([
      sb().from("orders").select("*").order("created_at", { ascending: false }).limit(3000),
      sb().from("refunds").select("*, order:orders(payer_name,receipt_no,total_paise)").order("created_at", { ascending: false }).limit(500),
    ]);
    setOrders(o.data ?? []);
    setRefunds(r.data ?? []);
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  const shown = useMemo(() => {
    const s = q.trim().toLowerCase();
    return orders.filter((o) => (status === "all" || (status === "review" ? o.needs_review : o.status === status)) && (!s || [o.payer_name, o.payer_email, o.payer_phone, o.receipt_no, o.rzp_order_id, o.rzp_payment_id].some((v) => String(v ?? "").toLowerCase().includes(s))));
  }, [orders, status, q]);
  const paid = orders.filter((o) => o.status === "paid" || o.status === "refunded");
  const collected = paid.reduce((n, o) => n + o.total_paise - o.refunded_paise, 0);
  const waiting = refunds.filter((r) => r.status === "requested");

  async function call(action: string, body: Record<string, unknown>, ok: string) {
    setBusy(true);
    setMsg(null);
    const r = await portal(action, body);
    setBusy(false);
    setMsg(r.ok ? { tone: "good", text: r.waiting ? "Refund recorded. A super admin, or another finance user, now has to send it." : action === "sync_order" && !r.paid ? "Razorpay shows no completed payment for this order." : ok } : { tone: "bad", text: r.error ?? "That did not work." });
    load();
  }
  async function reject(id: string) {
    const { data } = await sb().rpc("staff_reject_refund", { p_refund: id, p_note: "Rejected by staff" });
    setMsg(data?.ok ? { tone: "good", text: "Refund request rejected." } : { tone: "bad", text: data?.error ?? "That did not work." });
    load();
  }

  return (
    <div className="grid gap-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Collected, after refunds" value={inr(collected)} />
        <Stat label="Paid orders" value={paid.length} />
        <Stat label="Refunds waiting" value={waiting.length} note={waiting.length ? "Needs a decision" : undefined} tone="warn" />
        <Stat label="Payments to check" value={orders.filter((o) => o.needs_review).length} note={orders.some((o) => o.needs_review) ? "Paid, membership not activated" : undefined} tone="warn" />
      </div>
      {msg && <Msg tone={msg.tone}>{msg.text}</Msg>}

      {waiting.length > 0 && (
        <div className="plate p-5">
          <h3 className="font-semibold">Refunds waiting to be sent</h3>
          <ul className="mt-3 grid gap-2">
            {waiting.map((r) => (
              <li key={r.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line px-4 py-3 text-[0.95rem]">
                <span>
                  <span className="font-semibold">{inr(r.amount_paise)}</span> to {r.order?.payer_name} ({r.order?.receipt_no}). Reason: {r.reason}
                </span>
                {canRefund && (
                  <span className="flex gap-2">
                    <button type="button" className={small} disabled={busy} onClick={() => call("refund", { refund_id: r.id }, "Refund sent through Razorpay.")}>
                      Send refund
                    </button>
                    <button type="button" className={small} onClick={() => reject(r.id)}>
                      Reject
                    </button>
                  </span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div>
        <div className="flex flex-wrap items-end gap-3">
          <label className={`${lbl} min-w-56 flex-1`}>
            Search
            <input className="field !min-h-10" placeholder="Name, email, mobile, receipt or Razorpay reference" value={q} onChange={(e) => setQ(e.target.value)} />
          </label>
          <label className={lbl}>
            Show
            <select className="field !min-h-10" value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="paid">Paid</option>
              <option value="review">To check</option>
              <option value="created">Started, not paid</option>
              <option value="failed">Failed</option>
              <option value="refunded">Refunded</option>
              <option value="all">Everything</option>
            </select>
          </label>
          <button
            type="button"
            className="btn btn-quiet !min-h-10 !py-2"
            onClick={() =>
              downloadCsv("graas-payments", [
                ["Receipt", "Date", "Name", "Email", "Mobile", "Plan", "Kind", "Fee", "Discount", "GST", "Total", "Refunded", "Status", "Method", "Razorpay order", "Razorpay payment", "Coupon"],
                ...shown.map((o) => [o.receipt_no, shortDate(o.paid_at ?? o.created_at), o.payer_name, o.payer_email, o.payer_phone, o.plan_name, o.kind, o.base_paise / 100, o.discount_paise / 100, o.gst_paise / 100, o.total_paise / 100, o.refunded_paise / 100, o.status, o.method, o.rzp_order_id, o.rzp_payment_id, o.coupon_code]),
              ])
            }
          >
            Download CSV
          </button>
        </div>
        <ul className="mt-4 grid gap-2">
          {shown.map((o) => (
            <li key={o.id} className="plate-soft">
              <button type="button" className="flex w-full flex-wrap items-center justify-between gap-3 px-4 py-3 text-left" onClick={() => (setOpenId(openId === o.id ? null : o.id), setAmount(String((o.total_paise - o.refunded_paise) / 100)), setReason(""))} aria-expanded={openId === o.id}>
                <span>
                  <span className="font-semibold">{o.payer_name ?? "Deleted account"}</span>
                  <span className="block text-sm text-ink2">
                    {o.plan_name} ({o.kind}), {shortDate(o.paid_at ?? o.created_at)}
                    {o.receipt_no ? `, ${o.receipt_no}` : ""}
                  </span>
                </span>
                <span className="flex items-center gap-3">
                  {o.needs_review && <Badge tone="warn">Check</Badge>}
                  <span className="readout font-medium">{inr(o.total_paise)}</span>
                  <Badge tone={ORDER_TONE[o.status]}>{ORDER_LABEL[o.status]}</Badge>
                </span>
              </button>
              {openId === o.id && (
                <div className="grid gap-4 border-t border-line p-4">
                  <dl className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2 xl:grid-cols-4">
                    {[
                      ["Fee", inr(o.base_paise)],
                      ["Discount", o.discount_paise ? `${inr(o.discount_paise)} (${o.coupon_code})` : "None"],
                      [`GST at ${Number(o.gst_percent)}%`, inr(o.gst_paise)],
                      ["Refunded so far", inr(o.refunded_paise)],
                      ["Email", o.payer_email],
                      ["Mobile", o.payer_phone],
                      ["Method", o.method],
                      ["Razorpay order", o.rzp_order_id],
                      ["Razorpay payment", o.rzp_payment_id],
                      ["Failure reason", o.failure_reason],
                    ].map(([k, v]) => (
                      <div key={k}>
                        <dt className="text-xs text-ink2">{k}</dt>
                        <dd className="break-all font-medium">{v || "—"}</dd>
                      </div>
                    ))}
                  </dl>
                  {o.review_note && <Msg tone="warn">{o.review_note}</Msg>}
                  {["created", "failed", "cancelled"].includes(o.status) && o.rzp_order_id && (
                    <button type="button" className={`${small} justify-self-start`} disabled={busy} onClick={() => call("sync_order", { order_id: o.id }, "Payment found at Razorpay and matched. The membership is now active.")}>
                      Check with Razorpay
                    </button>
                  )}
                  {o.status === "paid" && o.rzp_payment_id && canRefund && (
                    <div className="grid gap-3 rounded-2xl bg-cobalt-soft p-4 sm:grid-cols-[8rem_1fr_auto] sm:items-end">
                      <label className={lbl}>
                        Refund, in ₹
                        <input className="field !min-h-10" type="number" min={1} step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} />
                      </label>
                      <label className={lbl}>
                        Reason (kept on record)
                        <input className="field !min-h-10" value={reason} maxLength={300} onChange={(e) => setReason(e.target.value)} />
                      </label>
                      <button type="button" className="btn btn-go !min-h-10 !py-2" disabled={busy} onClick={() => call("refund", { order_id: o.id, amount_inr: Number(amount), reason }, "Refund sent through Razorpay. A full refund also closes the membership.")}>
                        Refund
                      </button>
                    </div>
                  )}
                </div>
              )}
            </li>
          ))}
          {shown.length === 0 && <li className="plate-soft px-4 py-10 text-center text-ink2">No payments match.</li>}
        </ul>
      </div>
    </div>
  );
}

/* ---------- Coupons ---------- */

export function Coupons({ role, session }: { role: string; session: Session }) {
  const [rows, setRows] = useState<any[]>([]);
  const [kind, setKind] = useState("percent");
  const [msg, setMsg] = useState("");
  const [ask, setAsk] = useState<string | null>(null);
  const canEdit = role === "super_admin" || role === "finance";
  const load = useCallback(async () => {
    setRows((await sb().from("coupons").select("*").order("created_at", { ascending: false })).data ?? []);
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  async function add(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const f = new FormData(form);
    const value = Number(f.get("value"));
    const { error } = await sb()
      .from("coupons")
      .insert({
        code: String(f.get("code")).trim().toUpperCase(),
        description: String(f.get("description")).trim() || null,
        percent_off: kind === "percent" ? value : null,
        flat_off_inr: kind === "flat" ? value : null,
        max_uses: f.get("max_uses") ? Number(f.get("max_uses")) : null,
        valid_until: f.get("valid_until") || null,
        audience: f.get("audience") || null,
        created_by: session.user.id,
      });
    if (error) return setMsg(error.code === "23505" ? "That code already exists." : "Check the code (3 to 20 letters or digits) and the value.");
    setMsg("");
    form.reset();
    load();
  }
  async function patch(code: string, p: Record<string, unknown>) {
    await sb().from("coupons").update(p).eq("code", code);
    load();
  }
  async function remove(code: string) {
    await sb().from("coupons").delete().eq("code", code);
    setAsk(null);
    load();
  }

  return (
    <div className="grid gap-6">
      <p className="max-w-2xl text-ink2">A coupon reduces the membership fee at payment. GST, if any, is charged on the reduced fee. A 100% coupon activates a membership without a payment.</p>
      {canEdit && (
        <form onSubmit={add} className="plate grid gap-3 p-5 sm:grid-cols-2 xl:grid-cols-4">
          <label className={lbl}>
            Code
            <input name="code" className="field readout !min-h-10 uppercase" placeholder="CHAPTER10" maxLength={20} required />
          </label>
          <label className={lbl}>
            Discount type
            <select className="field !min-h-10" value={kind} onChange={(e) => setKind(e.target.value)}>
              <option value="percent">Percent off</option>
              <option value="flat">Rupees off</option>
            </select>
          </label>
          <label className={lbl}>
            {kind === "percent" ? "Percent" : "Rupees"}
            <input name="value" className="field !min-h-10" type="number" min={1} max={kind === "percent" ? 100 : undefined} step="0.01" required />
          </label>
          <label className={lbl}>
            For
            <select name="audience" className="field !min-h-10">
              <option value="">All plans</option>
              <option value="student">Student plans</option>
              <option value="professional">Professional plans</option>
              <option value="institution">Institution plans</option>
              <option value="industry">Industry plans</option>
            </select>
          </label>
          <label className={lbl}>
            Most uses (empty for no limit)
            <input name="max_uses" className="field !min-h-10" type="number" min={1} />
          </label>
          <label className={lbl}>
            Last valid day (empty for no end)
            <input name="valid_until" className="field !min-h-10" type="date" />
          </label>
          <label className={`${lbl} sm:col-span-2 xl:col-span-1`}>
            Note for staff
            <input name="description" className="field !min-h-10" maxLength={120} placeholder="For example, launch offer for chapters" />
          </label>
          <div className="flex items-end">
            <button className="btn btn-go !min-h-10 !py-2">Create coupon</button>
          </div>
          {msg && <p role="alert" className="font-semibold text-[#8f1a11] sm:col-span-2 xl:col-span-4">{msg}</p>}
        </form>
      )}
      <ul className="grid gap-2">
        {rows.map((c) => (
          <li key={c.code} className="plate-soft flex flex-wrap items-center justify-between gap-3 px-4 py-3">
            <span>
              <span className="readout font-semibold">{c.code}</span>{" "}
              <span className="text-[0.95rem]">
                {c.percent_off ? `${Number(c.percent_off)}% off` : `₹${Number(c.flat_off_inr)} off`}
                {c.audience ? `, ${c.audience} plans` : ""}
              </span>
              <span className="block text-sm text-ink2">
                Used {c.used_count}
                {c.max_uses ? ` of ${c.max_uses}` : ""} times{c.valid_until ? `, valid until ${shortDate(c.valid_until)}` : ""}
                {c.description ? `. ${c.description}` : ""}
              </span>
            </span>
            <span className="flex items-center gap-2">
              <Badge tone={c.is_active ? "good" : "plain"}>{c.is_active ? "On" : "Off"}</Badge>
              {canEdit &&
                (ask === c.code ? (
                  <>
                    <button type="button" className={small} onClick={() => remove(c.code)}>
                      Yes, delete
                    </button>
                    <button type="button" className={small} onClick={() => setAsk(null)}>
                      Keep
                    </button>
                  </>
                ) : (
                  <>
                    <button type="button" className={small} onClick={() => patch(c.code, { is_active: !c.is_active })}>
                      {c.is_active ? "Switch off" : "Switch on"}
                    </button>
                    <button type="button" className={small} onClick={() => setAsk(c.code)}>
                      Delete
                    </button>
                  </>
                ))}
            </span>
          </li>
        ))}
        {rows.length === 0 && <li className="plate-soft px-4 py-8 text-center text-ink2">No coupons yet.</li>}
      </ul>
    </div>
  );
}

/* ---------- Razorpay ---------- */

export function Gateway({ session }: { session: Session }) {
  const [g, setG] = useState<any>(null);
  const [enabled, setEnabled] = useState(false);
  const [msg, setMsg] = useState<{ tone: Tone; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [askClear, setAskClear] = useState(false);
  const [copied, setCopied] = useState(false);

  const load = useCallback(async () => {
    const { data } = await sb().from("site_settings").select("value").eq("key", "gateway").maybeSingle();
    setG(data?.value ?? {});
    setEnabled(!!data?.value?.enabled);
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  async function save(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const f = new FormData(form);
    setBusy(true);
    setMsg(null);
    const { data, error } = await sb().rpc("staff_set_gateway", { p_key_id: String(f.get("key_id") ?? ""), p_key_secret: String(f.get("key_secret") ?? ""), p_webhook_secret: String(f.get("webhook_secret") ?? ""), p_enabled: enabled });
    setBusy(false);
    if (error || !data?.ok) return setMsg({ tone: "bad", text: data?.error ?? error?.message ?? "Could not save." });
    form.reset();
    await refreshSite(session);
    setMsg({ tone: "good", text: "Saved. Use Test connection to confirm that Razorpay accepts the keys." });
    load();
  }
  async function test() {
    setBusy(true);
    const r = await portal("gateway_test");
    setBusy(false);
    setMsg(r.ok ? { tone: "good", text: `Razorpay accepted the keys (${r.mode} mode).` } : { tone: "bad", text: r.error ?? "Test failed." });
  }
  async function clear() {
    const { data } = await sb().rpc("staff_set_gateway", { p_key_id: null, p_key_secret: null, p_webhook_secret: null, p_enabled: false, p_clear: true });
    setAskClear(false);
    setMsg(data?.ok ? { tone: "good", text: "Keys removed and online payment switched off." } : { tone: "bad", text: data?.error ?? "Could not remove the keys." });
    load();
  }

  if (!g) return <p className="text-ink2">Loading…</p>;
  const live = g.enabled && g.has_secret && g.key_id;
  return (
    <div className="grid max-w-5xl gap-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Online payment" value={live ? "On" : "Off"} note={live ? "Members can pay" : "Members cannot pay yet"} tone={live ? "good" : "warn"} />
        <Stat label="Mode" value={g.mode === "live" ? "Live" : g.mode === "test" ? "Test" : "—"} note={g.mode === "test" ? "No real money moves" : g.mode === "live" ? "Real payments" : undefined} tone={g.mode === "live" ? "good" : "warn"} />
        <Stat label="Key ID" value={<span className="text-xl">{g.key_id ? `…${String(g.key_id).slice(-6)}` : "Not set"}</span>} note={g.has_secret ? "Secret saved" : "Secret not saved"} tone={g.has_secret ? "good" : "warn"} />
        <Stat label="Webhook secret" value={g.has_webhook_secret ? "Saved" : "Not set"} note={g.has_webhook_secret ? "Notices are verified" : "Add for missed payments"} tone={g.has_webhook_secret ? "good" : "warn"} />
      </div>
      {msg && <Msg tone={msg.tone}>{msg.text}</Msg>}

      <form onSubmit={save} className="plate grid gap-4 p-5 sm:p-6" autoComplete="off">
        <h3 className="text-xl font-semibold">Razorpay keys</h3>
        <p className="text-sm text-ink2">Paste these yourself from the Razorpay dashboard (Account and Settings, API Keys). They are stored where the website and staff screens cannot read them back; only the payment server uses them. Leave a box empty to keep what is already saved.</p>
        <div className="grid gap-4 md:grid-cols-2">
          <label className={lbl}>
            Key ID
            <input name="key_id" className="field readout" placeholder={g.key_id ? `Saved: …${String(g.key_id).slice(-6)}` : "rzp_test_… or rzp_live_…"} autoComplete="off" />
          </label>
          <label className={lbl}>
            Key Secret
            <input name="key_secret" type="password" className="field" placeholder={g.has_secret ? "Saved. Type to replace" : "Paste the Key Secret"} autoComplete="new-password" />
          </label>
          <label className={`${lbl} md:col-span-2`}>
            Webhook secret (you choose this text when adding the webhook in Razorpay, then type the same text here)
            <input name="webhook_secret" type="password" className="field" placeholder={g.has_webhook_secret ? "Saved. Type to replace" : "The secret you set on the webhook"} autoComplete="new-password" />
          </label>
        </div>
        <label className="flex items-center gap-2.5 font-semibold">
          <input type="checkbox" className="h-5 w-5 accent-[#067a2e]" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} />
          Online payment switched on
        </label>
        <div className="flex flex-wrap gap-3">
          <button className="btn btn-go !min-h-10 !py-2" disabled={busy}>
            Save
          </button>
          <button type="button" className="btn btn-quiet !min-h-10 !py-2" onClick={test} disabled={busy}>
            Test connection
          </button>
          {askClear ? (
            <span className="flex flex-wrap items-center gap-2 text-sm font-semibold">
              Remove the saved keys and switch payment off?
              <button type="button" className={small} onClick={clear}>
                Yes, remove
              </button>
              <button type="button" className={small} onClick={() => setAskClear(false)}>
                Keep
              </button>
            </span>
          ) : (
            <button type="button" className="btn btn-quiet !min-h-10 !py-2" onClick={() => setAskClear(true)}>
              Remove keys
            </button>
          )}
        </div>
      </form>

      <div className="plate grid gap-3 p-5 sm:p-6">
        <h3 className="text-xl font-semibold">Webhook: so no payment is ever missed</h3>
        <p className="text-sm text-ink2">If a member pays and then loses the connection, Razorpay tells this address and the membership still activates. In the Razorpay dashboard open Account and Settings, Webhooks, Add new webhook, and enter:</p>
        <div className="flex flex-wrap items-center gap-3">
          <code className="readout break-all rounded-xl bg-cobalt-soft px-4 py-2.5 text-sm">{WEBHOOK_URL}</code>
          <button type="button" className={small} onClick={() => navigator.clipboard?.writeText(WEBHOOK_URL).then(() => setCopied(true))}>
            {copied ? "Copied" : "Copy address"}
          </button>
        </div>
        <p className="text-sm text-ink2">
          Tick these events: <span className="readout">payment.captured</span>, <span className="readout">payment.failed</span>, <span className="readout">order.paid</span>, <span className="readout">refund.processed</span>. Set a secret of your choice there, then save the same secret above.
        </p>
      </div>

      <div className="plate grid gap-2 p-5 sm:p-6">
        <h3 className="text-xl font-semibold">Going live, in order</h3>
        <ol className="grid list-decimal gap-1.5 pl-5 text-[0.95rem] text-ink2">
          <li>Save the test keys (they start with rzp_test_) and press Test connection.</li>
          <li>Set a small fee on one plan, join as a test member and pay with a Razorpay test card or test UPI. Check that the membership becomes active and a receipt appears.</li>
          <li>Refund that test payment from the Payments screen.</li>
          <li>When Razorpay has approved the account for live payments, replace the keys with the live pair (rzp_live_), add the webhook in live mode, and set the real fees.</li>
        </ol>
      </div>
    </div>
  );
}
