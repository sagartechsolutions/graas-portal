"use client";

import QRCode from "qrcode";
import { useEffect, useState } from "react";

/** A real, scannable QR code for a link, drawn in the GRAAS navy. */
export default function Qr({ value, size = 120, className = "" }: { value: string; size?: number; className?: string }) {
  const [src, setSrc] = useState("");
  useEffect(() => {
    let live = true;
    QRCode.toDataURL(value, { margin: 1, width: size * 3, color: { dark: "#000e21", light: "#ffffff" } })
      .then((d) => live && setSrc(d))
      .catch(() => {});
    return () => {
      live = false;
    };
  }, [value, size]);
  // eslint-disable-next-line @next/next/no-img-element
  return src ? <img src={src} width={size} height={size} alt="QR code to check this membership" className={className} /> : <span style={{ width: size, height: size }} className={`inline-block bg-mist ${className}`} />;
}
