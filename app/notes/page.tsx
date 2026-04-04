import NotesPage from "@/components/NotesPage";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Notes — Shor",
  description: "Save and manage notes locally.",
};

export default function Notes() {
  return <NotesPage />;
}
