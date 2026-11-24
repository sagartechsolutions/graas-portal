"use client";

import { useEffect, useRef } from "react";

// Colours come from the GRAAS logo: navy, its three greys, and the green dot.
const INK = "#000e21";
const SLATE7 = "#5a616b";
const SLATE5 = "#8e919a";
const SLATE3 = "#b7babf";
const GO = "#02ae3e";
const LINE = "#e2e4e9";
const MIST = "#f5f6f8";
const WHITE = "#ffffff";
// One tone per block, in the order of the logo bars.
const TONES = [SLATE3, SLATE5, SLATE7, INK];

type Pt = { x: number; y: number };
type Block = { idx: number; x: number; y: number; alpha: number };

const deg = (r: number) => {
  let d = (r * 180) / Math.PI;
  while (d > 180) d -= 360;
  while (d <= -180) d += 360;
  return d;
};
const fmt = (n: number, w: number) => (n < 0 ? "-" : "+") + Math.abs(n).toFixed(1).padStart(w, "0");

/**
 * A three-joint pick-and-place arm drawn on a 2D canvas.
 * It runs its own cycle (pick a word block, set it on the outfeed belt) and hands control to the visitor
 * as soon as they move a pointer over the cell. Joint angles in the readout come from the same inverse
 * kinematics that draws the arm.
 */
export default function ArmStage({ words, onPlace }: { words: string[]; onPlace: (index: number) => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const modeRef = useRef<HTMLSpanElement>(null);
  const cycleRef = useRef<HTMLSpanElement>(null);
  const jRef = useRef<HTMLSpanElement>(null);
  const tcpRef = useRef<HTMLSpanElement>(null);
  const placeRef = useRef(onPlace);
  useEffect(() => {
    placeRef.current = onPlace;
  }, [onPlace]);

  useEffect(() => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let W = 0, H = 0, dpr = 1;
    let L1 = 0, L2 = 0, L3 = 0, floorY = 0, beltY = 0, beltEnd = 0, bw = 92;
    const bh = 34;
    let B: Pt = { x: 0, y: 0 }, feeder: Pt = { x: 0, y: 0 }, place: Pt = { x: 0, y: 0 };

    let cur: Pt = { x: 0, y: 0 }, des: Pt = { x: 0, y: 0 };
    let grip = 0;
    let manual = false, lastInput = -1e9, pointer: Pt | null = null;
    let pendingPick = false, pendingDrop = false;
    let holding: Block | null = null;
    let feederBlock: Block | null = null;
    const belt: Block[] = [];
    let nextWord = 0, step = 0, stepT = 0, cycles = 0, beltPhase = 0;
    let raf = 0, last = 0, running = false, visible = true, frame = 0, started = false;

    const feederTop = (): Pt => ({ x: feeder.x, y: feeder.y - bh / 2 - 2 });
    const placeTop = (): Pt => ({ x: place.x, y: place.y - bh / 2 - 2 });

    function layout() {
      const r = canvas.getBoundingClientRect();
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = r.width;
      H = r.height;
      canvas.width = Math.round(W * dpr);
      canvas.height = Math.round(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      floorY = H - 34;
      const unit = Math.min(W * 0.45, H * 0.42);
      L1 = unit;
      L2 = unit * 0.86;
      L3 = unit * 0.3;
      bw = Math.max(78, Math.min(104, W * 0.2));
      B = { x: W * 0.74, y: floorY - 54 };
      beltY = floorY - 30;
      beltEnd = W * 0.36;
      feeder = { x: B.x - L1 * 0.66, y: floorY - 7 - bh / 2 };
      place = { x: Math.max(bw / 2 + 14, W * 0.17), y: beltY - bh / 2 };
      if (!started) {
        cur = { x: B.x - L1 * 0.7, y: B.y - L1 * 0.95 };
        des = { ...cur };
        feederBlock = { idx: nextWord, x: feeder.x, y: feeder.y, alpha: 1 };
        started = true;
      } else if (feederBlock) {
        feederBlock.x = feeder.x;
        feederBlock.y = feeder.y;
      }
    }

    function clampTarget(p: Pt): Pt {
      let x = Math.max(10, Math.min(p.x, B.x + L1 * 0.22));
      let y = Math.max(L3 + 12, Math.min(p.y, floorY - 4));
      const dx = x - B.x, dy = y - L3 - B.y;
      const d = Math.hypot(dx, dy);
      const max = L1 + L2 - 6, min = Math.abs(L1 - L2) + 18;
      if (d > max) {
        x = B.x + (dx / d) * max;
        y = B.y + (dy / d) * max + L3;
      } else if (d < min) {
        const ux = d < 0.001 ? -1 : dx / d, uy = d < 0.001 ? 0 : dy / d;
        x = B.x + ux * min;
        y = B.y + uy * min + L3;
      }
      return { x, y };
    }

    // Tool always points straight down, like a palletising arm. Two-link solution for the wrist, elbow up.
    function solve(T: Pt) {
      const Wr = { x: T.x, y: T.y - L3 };
      const dx = Wr.x - B.x, dy = Wr.y - B.y;
      const d = Math.max(1, Math.hypot(dx, dy));
      const a = Math.atan2(dy, dx);
      const alpha = Math.acos(Math.max(-1, Math.min(1, (L1 * L1 + d * d - L2 * L2) / (2 * L1 * d))));
      const t1 = a + alpha;
      const E = { x: B.x + L1 * Math.cos(t1), y: B.y + L1 * Math.sin(t1) };
      const t2 = Math.atan2(Wr.y - E.y, Wr.x - E.x);
      return { E, Wr, t1, t2 };
    }

    function spawnFeeder() {
      nextWord = (nextWord + 1) % words.length;
      feederBlock = { idx: nextWord, x: feeder.x + 54, y: feeder.y, alpha: 0 };
    }

    function release() {
      if (!holding) return;
      const overBelt = cur.x < beltEnd - bw / 2 + 12 && Math.abs(cur.y - placeTop().y) < 40;
      if (overBelt) {
        belt.push({ idx: holding.idx, x: cur.x, y: place.y, alpha: 1 });
        placeRef.current(holding.idx);
        cycles += 1;
        holding = null;
        if (!feederBlock) spawnFeeder();
      } else {
        // not over the belt: the block goes back to the feeder
        nextWord = holding.idx;
        feederBlock = { idx: holding.idx, x: feeder.x + 54, y: feeder.y, alpha: 0 };
        holding = null;
      }
    }

    function pick() {
      if (holding || !feederBlock || feederBlock.alpha < 0.9) return;
      holding = feederBlock;
      feederBlock = null;
    }

    function autoStep(dt: number) {
      stepT += dt;
      const ft = feederTop(), pt = placeTop();
      const targets: Pt[] = [
        { x: ft.x, y: ft.y - 64 }, ft, ft, { x: ft.x, y: ft.y - 78 },
        { x: pt.x, y: pt.y - 84 }, pt, pt, { x: pt.x, y: pt.y - 70 },
      ];
      const hold = [0.15, 0.05, 0.28, 0.05, 0.1, 0.05, 0.3, 0.45];
      des = clampTarget(targets[step]);
      const arrived = Math.hypot(cur.x - des.x, cur.y - des.y) < 3.2;
      if (step === 0 && !feederBlock && !holding) return; // wait for the next block
      if (arrived && stepT > hold[step]) {
        if (step === 2) pick();
        if (step === 6) release();
        step = (step + 1) % 8;
        stepT = 0;
        if (step === 0 && holding) step = 4;
      }
    }

    function update(dt: number, now: number) {
      beltPhase = (beltPhase + dt * 46) % 22;
      if (manual && now - lastInput > 2400) {
        manual = false;
        pendingPick = pendingDrop = false;
        step = holding ? 4 : 0;
        stepT = 0;
      }
      if (manual) {
        if (pointer && !pendingPick) des = clampTarget(pointer);
        if (pendingPick && Math.hypot(cur.x - des.x, cur.y - des.y) < 5) {
          pick();
          pendingPick = false;
        }
        if (pendingDrop && Math.hypot(cur.x - des.x, cur.y - des.y) < 6) {
          release();
          pendingDrop = false;
        }
      } else {
        autoStep(dt);
      }
      const k = 1 - Math.exp(-dt * (manual ? 9 : 4.4));
      cur.x += (des.x - cur.x) * k;
      cur.y += (des.y - cur.y) * k;
      const gripDes = holding || (!manual && (step === 2 || step === 3)) ? 1 : 0;
      grip += (gripDes - grip) * (1 - Math.exp(-dt * 14));

      for (const b of belt) {
        b.x -= dt * 46;
        if (b.x < bw * 0.2) b.alpha = Math.max(0, b.alpha - dt * 2.4);
      }
      while (belt.length && belt[0].alpha <= 0) belt.shift();
      if (feederBlock) {
        feederBlock.x += (feeder.x - feederBlock.x) * (1 - Math.exp(-dt * 7));
        feederBlock.alpha = Math.min(1, feederBlock.alpha + dt * 3);
      }
    }

    function capsule(a: Pt, b: Pt, w: number, fill: string) {
      const len = Math.hypot(b.x - a.x, b.y - a.y);
      ctx.save();
      ctx.translate(a.x, a.y);
      ctx.rotate(Math.atan2(b.y - a.y, b.x - a.x));
      ctx.beginPath();
      ctx.roundRect(-w / 2, -w / 2, len + w, w, w / 2);
      ctx.shadowColor = "rgba(0,14,33,0.16)";
      ctx.shadowBlur = 14;
      ctx.shadowOffsetY = 5;
      ctx.fillStyle = fill;
      ctx.fill();
      ctx.shadowColor = "transparent";
      ctx.lineWidth = 1.25;
      ctx.strokeStyle = fill === WHITE ? SLATE3 : INK;
      ctx.stroke();
      if (len > w * 1.6 && fill === WHITE) {
        ctx.beginPath();
        ctx.moveTo(w * 0.7, 0);
        ctx.lineTo(len - w * 0.7, 0);
        ctx.strokeStyle = LINE;
        ctx.lineWidth = 2;
        ctx.stroke();
      }
      ctx.restore();
    }

    function joint(p: Pt, r: number) {
      ctx.beginPath();
      ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
      ctx.fillStyle = INK;
      ctx.fill();
      ctx.beginPath();
      ctx.arc(p.x, p.y, r * 0.34, 0, Math.PI * 2);
      ctx.fillStyle = GO;
      ctx.fill();
    }

    function drawBlock(b: Block, cx: number, cy: number) {
      ctx.save();
      ctx.globalAlpha = b.alpha;
      ctx.beginPath();
      ctx.roundRect(cx - bw / 2, cy - bh / 2, bw, bh, 9);
      ctx.fillStyle = TONES[b.idx % TONES.length];
      ctx.fill();
      ctx.fillStyle = b.idx % TONES.length === 0 ? INK : WHITE;
      ctx.font = `600 ${bw < 90 ? 13 : 15}px "IBM Plex Sans Variable", system-ui, sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(words[b.idx], cx, cy + 1);
      ctx.restore();
    }

    function draw() {
      ctx.clearRect(0, 0, W, H);
      const { E, Wr, t1, t2 } = solve(cur);

      // reach envelope
      ctx.save();
      ctx.setLineDash([5, 7]);
      ctx.strokeStyle = "rgba(0,14,33,0.2)";
      ctx.lineWidth = 1.25;
      ctx.beginPath();
      ctx.arc(B.x, B.y, L1 + L2, Math.PI * 0.98, Math.PI * 1.62);
      ctx.stroke();
      ctx.restore();

      // floor
      ctx.strokeStyle = SLATE3;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(0, floorY);
      ctx.lineTo(W, floorY);
      ctx.stroke();

      // outfeed belt
      ctx.fillStyle = WHITE;
      ctx.strokeStyle = SLATE3;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.roundRect(-12, beltY, beltEnd + 12, 14, 7);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = SLATE5;
      for (let x = beltEnd - 9 - beltPhase; x > -6; x -= 22) {
        ctx.beginPath();
        ctx.arc(x, beltY + 7, 2.5, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = SLATE3;
      ctx.fillRect(beltEnd - 30, beltY + 14, 3, floorY - beltY - 14);
      ctx.fillRect(beltEnd * 0.35, beltY + 14, 3, floorY - beltY - 14);

      // feeder pallet
      ctx.fillStyle = MIST;
      ctx.strokeStyle = SLATE3;
      ctx.beginPath();
      ctx.roundRect(feeder.x - bw / 2 - 6, floorY - 7, bw + 12, 7, 2);
      ctx.fill();
      ctx.stroke();

      for (const b of belt) drawBlock(b, b.x, b.y);
      if (feederBlock) drawBlock(feederBlock, feederBlock.x, feederBlock.y);

      // pedestal
      ctx.fillStyle = INK;
      ctx.beginPath();
      ctx.moveTo(B.x - 36, floorY);
      ctx.lineTo(B.x + 36, floorY);
      ctx.lineTo(B.x + 20, B.y + 4);
      ctx.lineTo(B.x - 20, B.y + 4);
      ctx.closePath();
      ctx.fill();

      // links, back to front
      capsule(B, E, Math.max(18, L1 * 0.13), WHITE);
      capsule(E, Wr, Math.max(14, L1 * 0.1), WHITE);
      const tip = { x: cur.x, y: cur.y - 8 };
      capsule(Wr, tip, 10, INK);
      // gripper
      const open = 7 + (1 - grip) * 11;
      ctx.fillStyle = INK;
      ctx.fillRect(cur.x - open - 5, cur.y - 10, 5, 14);
      ctx.fillRect(cur.x + open, cur.y - 10, 5, 14);
      ctx.fillRect(cur.x - open - 5, cur.y - 12, open * 2 + 10, 4);
      joint(B, Math.max(11, L1 * 0.075));
      joint(E, Math.max(9, L1 * 0.06));
      joint(Wr, 7);

      if (holding) drawBlock(holding, cur.x, cur.y + bh / 2 + 2);

      // pointer crosshair in manual mode
      if (manual && pointer) {
        const p = clampTarget(pointer);
        ctx.strokeStyle = GO;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(p.x - 12, p.y);
        ctx.lineTo(p.x + 12, p.y);
        ctx.moveTo(p.x, p.y - 12);
        ctx.lineTo(p.x, p.y + 12);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(p.x, p.y, 5, 0, Math.PI * 2);
        ctx.stroke();
      }

      // readout: updated a few times a second, not every frame
      if (frame % 6 === 0) {
        const scale = 900 / (L1 + L2 + L3);
        if (modeRef.current) modeRef.current.textContent = manual ? "Manual" : "Auto";
        if (cycleRef.current) cycleRef.current.textContent = String(cycles).padStart(3, "0");
        if (jRef.current)
          jRef.current.textContent = `J1 ${fmt(deg(-t1), 5)}°  J2 ${fmt(deg(t1 - t2), 5)}°  J3 ${fmt(deg(t2 - Math.PI / 2), 5)}°`;
        if (tcpRef.current)
          tcpRef.current.textContent = `X ${fmt((cur.x - B.x) * scale, 5)}  Y ${fmt((B.y - cur.y) * scale, 5)} mm`;
      }
    }

    function tick(now: number) {
      raf = 0;
      const dt = Math.min(0.05, (now - last) / 1000 || 0.016);
      last = now;
      frame += 1;
      update(dt, now);
      draw();
      if (running) raf = requestAnimationFrame(tick);
    }
    function setRunning(on: boolean) {
      const should = on && visible && !document.hidden && !reduce;
      if (should && !running) {
        running = true;
        last = performance.now();
        raf = requestAnimationFrame(tick);
      } else if (!should && running) {
        running = false;
        if (raf) cancelAnimationFrame(raf);
      }
    }

    const toLocal = (e: PointerEvent): Pt => {
      const r = canvas.getBoundingClientRect();
      return { x: e.clientX - r.left, y: e.clientY - r.top };
    };
    function onMove(e: PointerEvent) {
      if (reduce) return;
      pointer = toLocal(e);
      manual = true;
      lastInput = performance.now();
    }
    function onDown(e: PointerEvent) {
      if (reduce) return;
      onMove(e);
      const p = pointer!;
      if (holding) {
        des = clampTarget(p);
        pendingDrop = true;
      } else if (feederBlock && Math.hypot(p.x - feeder.x, p.y - feeder.y) < 52) {
        des = clampTarget(feederTop());
        pendingPick = true;
      }
    }
    function onLeave() {
      pointer = null;
    }

    layout();
    draw();
    const ro = new ResizeObserver(() => {
      layout();
      draw();
    });
    ro.observe(canvas);
    const io = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      setRunning(true);
    });
    io.observe(canvas);
    const onVis = () => setRunning(true);
    document.addEventListener("visibilitychange", onVis);
    canvas.addEventListener("pointermove", onMove);
    canvas.addEventListener("pointerdown", onDown);
    canvas.addEventListener("pointerleave", onLeave);
    document.fonts?.ready.then(() => draw());
    setRunning(true);

    return () => {
      running = false;
      if (raf) cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
      document.removeEventListener("visibilitychange", onVis);
      canvas.removeEventListener("pointermove", onMove);
      canvas.removeEventListener("pointerdown", onDown);
      canvas.removeEventListener("pointerleave", onLeave);
    };
  }, [words]);

  return (
    <div className="relative h-full w-full select-none">
      <canvas
        ref={canvasRef}
        className="block h-full w-full cursor-crosshair"
        style={{ touchAction: "pan-y" }}
        role="img"
        aria-label="A robot arm picking word blocks from a feeder and placing them on a conveyor belt. Move a pointer over it to control the arm."
      />
      <div
        aria-hidden="true"
        className="readout pointer-events-none absolute left-3 top-3 rounded-xl border border-line bg-white/85 px-3 py-2 text-[11px] leading-[1.6] text-ink2 backdrop-blur-sm sm:left-4 sm:top-4 sm:text-xs"
      >
        <div>
          <span className="text-ink">Mode</span> <span ref={modeRef}>Auto</span>
          <span className="ml-3 text-ink">Cycle</span> <span ref={cycleRef}>000</span>
        </div>
        <div>
          <span ref={jRef}>J1 +000.0° J2 +000.0° J3 +000.0°</span>
        </div>
        <div>
          <span className="text-ink">Tool</span> <span ref={tcpRef}>X +000.0 Y +000.0 mm</span>
        </div>
      </div>
    </div>
  );
}
