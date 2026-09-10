import { useEffect, useState } from "react";

export function IntroSplash({ onDone }: { onDone: () => void }) {
  const [phase, setPhase] = useState<"enter" | "hold" | "exit">("enter");

  useEffect(() => {
    // enter → hold after 600ms
    const t1 = setTimeout(() => setPhase("hold"), 600);
    // hold → exit after 2400ms
    const t2 = setTimeout(() => setPhase("exit"), 2400);
    // unmount after exit animation (400ms)
    const t3 = setTimeout(() => onDone(), 2800);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [onDone]);

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
        transition: "opacity 400ms ease",
        opacity: phase === "exit" ? 0 : 1,
        pointerEvents: phase === "exit" ? "none" : "all",
      }}
    >
      {/* Subtle top accent line */}
      <div style={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        height: "3px",
        background: "linear-gradient(90deg, #0ea5e9 0%, #06b6d4 50%, #0ea5e9 100%)",
      }} />

      {/* Content */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "0px",
          transform: phase === "enter" ? "translateY(12px)" : "translateY(0)",
          opacity: phase === "enter" ? 0 : 1,
          transition: "transform 600ms cubic-bezier(0.22,1,0.36,1), opacity 600ms ease",
        }}
      >
        {/* Logo */}
        <img
          src="/care.png"
          alt="CareCast AI"
          style={{
            width: "clamp(80px, 18vw, 140px)",
            height: "auto",
            objectFit: "contain",
            display: "block",
          }}
          draggable={false}
        />

        {/* Brand name */}
        <div style={{
          marginTop: "20px",
          display: "flex",
          alignItems: "baseline",
          gap: "6px",
          fontFamily: "'Inter', system-ui, sans-serif",
        }}>
          <span style={{
            fontSize: "clamp(26px, 5vw, 38px)",
            fontWeight: 800,
            letterSpacing: "0.12em",
            color: "#0f172a",
          }}>
            CARECAST
          </span>
          <span style={{
            fontSize: "clamp(26px, 5vw, 38px)",
            fontWeight: 800,
            letterSpacing: "0.12em",
            color: "#0ea5e9",
          }}>
            AI
          </span>
        </div>

        {/* Tagline */}
        <div style={{
          marginTop: "10px",
          fontFamily: "'Inter', system-ui, sans-serif",
          fontSize: "clamp(11px, 2vw, 14px)",
          fontWeight: 600,
          letterSpacing: "0.22em",
          color: "#64748b",
          textTransform: "uppercase",
          textAlign: "center",
        }}>
          Faster Care · Safer Lives
        </div>

        {/* Divider */}
        <div style={{
          marginTop: "28px",
          width: "clamp(48px, 8vw, 64px)",
          height: "2px",
          borderRadius: "2px",
          background: "linear-gradient(90deg, #0ea5e9, #06b6d4)",
        }} />

        {/* Sub-tagline */}
        <div style={{
          marginTop: "20px",
          fontFamily: "'Inter', system-ui, sans-serif",
          fontSize: "clamp(12px, 1.8vw, 15px)",
          fontWeight: 400,
          color: "#94a3b8",
          letterSpacing: "0.04em",
          textAlign: "center",
          maxWidth: "340px",
          lineHeight: 1.6,
          padding: "0 16px",
        }}>
          Intelligent Hospital Capacity Intelligence &amp; Forecasting
        </div>

        {/* Loading dots */}
        <div style={{
          marginTop: "36px",
          display: "flex",
          gap: "7px",
          alignItems: "center",
        }}>
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              style={{
                width: "6px",
                height: "6px",
                borderRadius: "50%",
                backgroundColor: "#0ea5e9",
                animation: `splashDot 1.2s ease-in-out ${i * 0.2}s infinite`,
              }}
            />
          ))}
        </div>
      </div>

      {/* Bottom credit */}
      <div style={{
        position: "absolute",
        bottom: "24px",
        fontFamily: "'Inter', system-ui, sans-serif",
        fontSize: "11px",
        color: "#cbd5e1",
        letterSpacing: "0.08em",
      }}>
        PREDICT · PREPARE · PREVENT
      </div>

      <style>{`
        @keyframes splashDot {
          0%, 80%, 100% { opacity: 0.25; transform: scale(0.85); }
          40% { opacity: 1; transform: scale(1.15); }
        }
      `}</style>
    </div>
  );
}
