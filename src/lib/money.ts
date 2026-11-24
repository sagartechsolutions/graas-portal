/** ₹ amounts from paise, in Indian digit grouping. Whole rupees show without decimals. */
export function inr(paise: number | null | undefined) {
  const n = (paise ?? 0) / 100;
  return "₹" + new Intl.NumberFormat("en-IN", { minimumFractionDigits: Number.isInteger(n) ? 0 : 2, maximumFractionDigits: 2 }).format(n);
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** "24 Nov 2026" from a date or timestamp string. Timestamps are shown in Indian time. */
export function shortDate(v: string | null | undefined) {
  if (!v) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(v)) {
    const [y, m, d] = v.split("-").map(Number);
    return `${d} ${MONTHS[m - 1]} ${y}`;
  }
  const t = new Date(new Date(v).getTime() + 5.5 * 3600 * 1000);
  return `${t.getUTCDate()} ${MONTHS[t.getUTCMonth()]} ${t.getUTCFullYear()}`;
}

export const STATUS_LABEL: Record<string, string> = {
  pending_approval: "Awaiting verification",
  pending_payment: "Awaiting payment",
  active: "Active",
  expired: "Expired",
  suspended: "Suspended",
  rejected: "Not approved",
  cancelled: "Closed",
};

/** A stored "active" membership whose end date has passed is shown as expired. */
export function effectiveStatus(m: { status: string; ends_on: string | null } | null | undefined, today: string) {
  if (!m) return "none";
  return m.status === "active" && m.ends_on && m.ends_on < today ? "expired" : m.status;
}

export const INDIAN_STATES = [
  "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh", "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka", "Kerala",
  "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana", "Tripura",
  "Uttar Pradesh", "Uttarakhand", "West Bengal", "Andaman and Nicobar Islands", "Chandigarh", "Dadra and Nagar Haveli and Daman and Diu", "Delhi", "Jammu and Kashmir",
  "Ladakh", "Lakshadweep", "Puducherry",
];
