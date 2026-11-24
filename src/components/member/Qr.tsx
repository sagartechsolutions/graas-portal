"use client";

import type { CSSProperties } from "react";
import QRCode from "qrcode";
import { useEffect, useState } from "react";

/** A real, scannable QR code for a link, drawn in the GRAAS navy. */
export default function Qr({ value, size = 120, className = "", style }: { value: string; size?: number; className?: string; style?: CSSProperties }) {
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
  return src ? <img src={src} width={size} height={size} alt="QR code to check this membership" className={className} style={style} /> : <span style={{ width: size, height: size, ...style }} className={`inline-block bg-mist ${className}`} />;
}
