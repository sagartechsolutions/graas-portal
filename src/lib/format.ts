const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

/** "24 November 2026", in Indian time, without depending on the server's locale data. */
export function longDate(iso: string) {
  const d = new Date(new Date(iso).getTime() + 5.5 * 3600 * 1000);
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}
