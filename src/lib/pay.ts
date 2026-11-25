"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */
import { portal } from "./browser";

function loadRazorpay(): Promise<boolean> {
  return new Promise((res) => {
    if ((window as any).Razorpay) return res(true);
    const s = document.createElement("script");
    s.src = "https://checkout.razorpay.com/v1/checkout.js";
    s.onload = () => res(true);
    s.onerror = () => res(false);
    document.body.appendChild(s);
  });
}

/** Starts a Razorpay payment for an order the server prices (event ticket, listing fee…) and confirms it. */
export async function payOnline(body: Record<string, unknown>, onMsg: (m: string) => void): Promise<{ ok: boolean; error?: string; free?: boolean }> {
  const o = await portal("create_order", body);
  if (!o.ok) return { ok: false, error: o.error ?? "The payment could not be started." };
  if (o.free) return { ok: true, free: true };
  if (!(await loadRazorpay())) return { ok: false, error: "The payment window could not load. Check your internet and try again." };
  return new Promise((resolve) => {
    const rz = new (window as any).Razorpay({
      key: o.key_id,
      order_id: o.rzp_order_id,
      amount: o.amount,
      currency: "INR",
      name: "GRAAS",
      description: String(o.description ?? "GRAAS"),
      prefill: o.prefill,
      theme: { color: "#000e21" },
      modal: { ondismiss: () => resolve({ ok: false, error: "" }) },
      handler: async (r: any) => {
        onMsg("Confirming your payment…");
        const v = await portal("verify_payment", { rzp_order_id: r.razorpay_order_id, rzp_payment_id: r.razorpay_payment_id, signature: r.razorpay_signature });
        resolve(v.ok ? { ok: true } : { ok: false, error: v.error ?? "The payment is being confirmed. Check again in a few minutes." });
      },
    });
    rz.on("payment.failed", () => onMsg("The payment did not go through. Nothing was charged, or it will be reversed by your bank. You can try again."));
    rz.open();
  });
}
