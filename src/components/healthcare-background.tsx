import { memo } from "react";

export const HealthcareBackground = memo(function HealthcareBackground() {
  return (
    <div
      className="pointer-events-none absolute inset-0 overflow-hidden select-none z-0"
      aria-hidden="true"
    >
      {/* Subtle Ambient Medical Lighting */}
      <div className="absolute -top-[15%] -left-[10%] h-[550px] w-[550px] rounded-full bg-gradient-to-br from-command-cyan/10 via-command-teal/5 to-transparent blur-3xl" />
      <div className="absolute top-[30%] -right-[15%] h-[600px] w-[600px] rounded-full bg-gradient-to-bl from-command-teal/8 via-command-cyan/5 to-transparent blur-3xl" />
      <div className="absolute -bottom-[15%] left-[25%] h-[500px] w-[500px] rounded-full bg-gradient-to-t from-command-cyan/8 via-transparent to-transparent blur-3xl" />

      {/* Primary Subtle ECG Cardiac Wave */}
      <div className="absolute top-16 left-0 w-full opacity-20 dark:opacity-15 overflow-hidden">
        <svg
          viewBox="0 0 1440 100"
          fill="none"
          preserveAspectRatio="none"
          className="w-[200%] h-20 animate-ecg-scroll"
        >
          <path
            d="M0,50 L180,50 L195,50 L205,25 L215,85 L225,15 L235,90 L245,50 L260,50 L300,50 L480,50 L495,50 L505,25 L515,85 L525,15 L535,90 L545,50 L560,50 L600,50 L780,50 L795,50 L805,25 L815,85 L825,15 L835,90 L845,50 L860,50 L900,50 L1080,50 L1095,50 L1105,25 L1115,85 L1125,15 L1135,90 L1145,50 L1160,50 L1200,50 L1440,50"
            stroke="currentColor"
            strokeWidth="1.6"
            className="text-command-cyan/60"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>

      {/* Secondary Lower Telemetry Track */}
      <div className="absolute bottom-28 left-0 w-full opacity-15 dark:opacity-10 overflow-hidden">
        <svg
          viewBox="0 0 1440 80"
          fill="none"
          preserveAspectRatio="none"
          className="w-[200%] h-16 animate-ecg-scroll-slow"
        >
          <path
            d="M0,40 L220,40 L235,32 L245,48 L255,10 L265,70 L275,38 L285,42 L295,40 L520,40 L535,32 L545,48 L555,10 L565,70 L575,38 L585,42 L595,40 L820,40 L835,32 L845,48 L855,10 L865,70 L875,38 L885,42 L895,40 L1120,40 L1135,32 L1145,48 L1155,10 L1165,70 L1175,38 L1185,42 L1195,40 L1440,40"
            stroke="currentColor"
            strokeWidth="1.2"
            className="text-command-teal/50"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>

      {/* Subtle Clinical Ambient Accents */}
      <div className="absolute top-[22%] right-[10%] h-1.5 w-1.5 rounded-full bg-command-cyan/40 animate-ping [animation-duration:5s]" />
      <div className="absolute bottom-[35%] left-[8%] h-1.5 w-1.5 rounded-full bg-command-teal/30 animate-ping [animation-duration:6s] [animation-delay:2s]" />
    </div>
  );
});

