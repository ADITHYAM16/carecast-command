import { useEffect, useState } from "react";

const CARECAST = "CARECAST".split("");
const AI = "AI".split("");

export function IntroSplash({ onDone }: { onDone: () => void }) {
  const [phase, setPhase] = useState<"enter" | "hold" | "exit">("enter");

  useEffect(() => {
    const t1 = setTimeout(() => setPhase("hold"), 200);
    const t2 = setTimeout(() => setPhase("exit"), 3200);
    const t3 = setTimeout(() => onDone(), 3700);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [onDone]);

  const exiting = phase === "exit";

  return (
    <div
      aria-hidden="true"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        backgroundColor: "#ffffff",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        transition: "opacity 500ms ease",
        opacity: exiting ? 0 : 1,
        pointerEvents: exiting ? "none" : "all",
      }}
    >
      {/* Top accent bar */}
      <div style={{
        position: "absolute", top: 0, left: 0, right: 0, height: "3px",
        background: "linear-gradient(90deg,#0ea5e9,#06b6d4,#0ea5e9)",
        animation: "accentSlide 2s ease forwards",
      }} />

      {/* Logo wrapper */}
      <div style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "center" }}>
        {/* Heartbeat ring */}
        <div style={{
          position: "absolute",
          width: "clamp(110px,22vw,180px)",
          height: "clamp(110px,22vw,180px)",
          borderRadius: "50%",
          border: "2px solid #0ea5e9",
          animation: "heartRing 1.6s ease-out 0.8s infinite",
          opacity: 0,
        }} />
        {/* Second ring */}
        <div style={{
          position: "absolute",
          width: "clamp(130px,26vw,210px)",
          height: "clamp(130px,26vw,210px)",
          borderRadius: "50%",
          border: "1.5px solid #06b6d4",
          animation: "heartRing 1.6s ease-out 1.1s infinite",
          opacity: 0,
        }} />

        {/* Logo image */}
        <img
          src="/care.png"
          alt="CareCast AI"
          style={{
            width: "clamp(80px,18vw,140px)",
            height: "auto",
            objectFit: "contain",
            display: "block",
            animation: "logoEntry 0.8s cubic-bezier(0.22,1,0.36,1) forwards, logoPulse 2.4s ease-in-out 1s infinite",
            opacity: 0,
          }}
          draggable={false}
        />
      </div>

      {/* Brand name — letter by letter */}
      <div style={{
        marginTop: "24px",
        display: "flex",
        alignItems: "baseline",
        gap: "4px",
        fontFamily: "'Inter', system-ui, sans-serif",
      }}>
        {CARECAST.map((ch, i) => (
          <span
            key={i}
            style={{
              fontSize: "clamp(26px,5vw,38px)",
              fontWeight: 800,
              letterSpacing: "0.08em",
              color: "#0f172a",
              display: "inline-block",
              animation: `letterDrop 0.5s cubic-bezier(0.22,1,0.36,1) ${0.5 + i * 0.07}s forwards`,
              opacity: 0,
              transform: "translateY(-18px)",
            }}
          >
            {ch}
          </span>
        ))}
        <span style={{ display: "inline-block", width: "6px" }} />
        {AI.map((ch, i) => (
          <span
            key={i}
            style={{
              fontSize: "clamp(26px,5vw,38px)",
              fontWeight: 800,
              letterSpacing: "0.08em",
              color: "#0ea5e9",
              display: "inline-block",
              animation: `letterDrop 0.5s cubic-bezier(0.22,1,0.36,1) ${0.5 + (CARECAST.length + i) * 0.07}s forwards, aiGlow 2s ease-in-out 1.8s infinite`,
              opacity: 0,
              transform: "translateY(-18px)",
            }}
          >
            {ch}
          </span>
        ))}
      </div>

      {/* Tagline */}
      <div style={{
        marginTop: "10px",
        fontFamily: "'Inter', system-ui, sans-serif",
        fontSize: "clamp(11px,2vw,14px)",
        fontWeight: 600,
        letterSpacing: "0.22em",
        color: "#64748b",
        textTransform: "uppercase",
        textAlign: "center",
        animation: "fadeUp 0.6s ease 1.4s forwards",
        opacity: 0,
      }}>
        Faster Care · Safer Lives
      </div>

      {/* Animated divider */}
      <div style={{
        marginTop: "28px",
        height: "2px",
        borderRadius: "2px",
        background: "linear-gradient(90deg,#0ea5e9,#06b6d4)",
        animation: "dividerGrow 0.6s ease 1.6s forwards",
        width: 0,
      }} />

      {/* Sub-tagline */}
      <div style={{
        marginTop: "20px",
        fontFamily: "'Inter', system-ui, sans-serif",
        fontSize: "clamp(12px,1.8vw,15px)",
        fontWeight: 400,
        color: "#94a3b8",
        letterSpacing: "0.04em",
        textAlign: "center",
        maxWidth: "340px",
        lineHeight: 1.6,
        padding: "0 16px",
        animation: "fadeUp 0.6s ease 1.9s forwards",
        opacity: 0,
      }}>
        Intelligent Hospital Capacity<br />Intelligence &amp; Forecasting
      </div>

      {/* Loading dots */}
      <div style={{ marginTop: "36px", display: "flex", gap: "7px", alignItems: "center" }}>
        {[0, 1, 2].map((i) => (
          <div key={i} style={{
            width: "6px", height: "6px", borderRadius: "50%",
            backgroundColor: i === 0 ? "#0ea5e9" : "#cbd5e1",
            animation: `splashDot 1.2s ease-in-out ${i * 0.2}s infinite`,
          }} />
        ))}
      </div>

      <style>{`
        @keyframes accentSlide {
          from { transform: scaleX(0); transform-origin: left; }
          to   { transform: scaleX(1); transform-origin: left; }
        }
        @keyframes logoEntry {
          from { opacity: 0; transform: scale(0.6) rotate(-15deg); }
          to   { opacity: 1; transform: scale(1) rotate(0deg); }
        }
        @keyframes logoPulse {
          0%,100% { transform: scale(1); }
          50%      { transform: scale(1.06); }
        }
        @keyframes heartRing {
          0%   { transform: scale(0.85); opacity: 0.7; }
          100% { transform: scale(1.5);  opacity: 0; }
        }
        @keyframes letterDrop {
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes aiGlow {
          0%,100% { text-shadow: none; }
          50%      { text-shadow: 0 0 12px #0ea5e9aa; }
        }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes dividerGrow {
          to { width: clamp(48px, 8vw, 64px); }
        }
        @keyframes splashDot {
          0%,80%,100% { opacity: 0.25; transform: scale(0.85); }
          40%          { opacity: 1;    transform: scale(1.15); }
        }
      `}</style>
    </div>
  );
}
