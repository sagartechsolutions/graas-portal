"use client";

import { useState } from "react";
import { isOwnDevice, markActive, setOwnDevice } from "@/lib/browser";

/** Account → "This device": stay signed in here, or be signed out after 30 minutes without activity. */
export default function DeviceSetting({ userId }: { userId: string }) {
  const [own, setOwn] = useState(() => isOwnDevice(userId));
  const change = (v: boolean) => {
    setOwnDevice(v ? userId : null);
    markActive();
    setOwn(v);
  };
  return (
    <div className="card mb-5 flex flex-wrap items-center justify-between gap-4 p-5 sm:p-6">
      <div className="min-w-0">
        <p className="font-semibold">This device</p>
        <p className="text-sm text-ink2">
          {own
            ? "You stay signed in on this browser. Turn this off if other people use this computer."
            : "You are signed out after 30 minutes without activity. Turn this on only if this is your own device."}
        </p>
      </div>
      <label className="inline-flex cursor-pointer items-center gap-3 font-medium">
        <span>{own ? "My own device" : "Shared device"}</span>
        <input type="checkbox" role="switch" className="peer sr-only" checked={own} onChange={(e) => change(e.target.checked)} aria-label="This is my own device: keep me signed in" />
        <span aria-hidden="true" className="relative h-7 w-12 rounded-full bg-line transition-colors peer-checked:bg-go peer-focus-visible:ring-2 peer-focus-visible:ring-ink after:absolute after:left-1 after:top-1 after:h-5 after:w-5 after:rounded-full after:bg-white after:transition-transform peer-checked:after:translate-x-5" />
      </label>
    </div>
  );
}
