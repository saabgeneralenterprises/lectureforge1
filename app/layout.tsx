import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "LectureForge – AI Lecture Note Generator",
  description: "Generate complete, structured lecture notes with AI diagrams and illustrations for any academic level. Built for Nigerian educators.",
  keywords: "lecture notes, AI, education, Nigeria, teachers, university",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
