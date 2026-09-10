import { createFileRoute } from "@tanstack/react-router";
import { PatientPortal } from "@/components/patient-portal";

export const Route = createFileRoute("/patient")({
  head: () => ({
    meta: [
      { title: "CareCast AI — Patient Portal" },
      { name: "description", content: "Report emergencies and track your case status." },
    ],
    links: [
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" },
    ],
  }),
  component: () => <PatientPortal />,
});
