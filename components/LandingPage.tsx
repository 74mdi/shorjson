"use client";

import Link from "next/link";

export default function LandingPage() {
  return (
    <main className="animate-page-fade min-h-dvh px-5 pb-16 pt-16 sm:pt-24">
      <section className="mx-auto flex w-full max-w-4xl flex-col gap-12">
        <div className="max-w-2xl animate-morph-in">
          <div
            className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[11px] uppercase tracking-[0.18em]"
            style={{
              borderColor: "var(--border)",
              background: "var(--surface)",
              color: "var(--text-muted)",
            }}
          >
            <span>Shor</span>
            <span>Private workspace</span>
          </div>
          <h1
            className="pt-6 text-4xl font-semibold tracking-tight sm:text-6xl"
            style={{ color: "var(--text)" }}
          >
            Short links, notes, and bio pages in one calm place.
          </h1>
          <p
            className="max-w-xl pt-4 text-sm leading-7 sm:text-base"
            style={{ color: "var(--text-muted)" }}
          >
            Sign in to keep your links private, publish a custom
            {" "}
            <span style={{ color: "var(--text)" }}>@username</span>
            {" "}
            page, and export only your own data.
          </p>

          <div className="flex flex-wrap gap-3 pt-8">
            <Link
              href="/sign-up"
              className="rounded-2xl px-5 py-3 text-sm font-medium transition-all duration-300"
              style={{
                background: "var(--accent)",
                color: "var(--bg)",
              }}
            >
              Create account
            </Link>
            <Link
              href="/sign-in"
              className="rounded-2xl border px-5 py-3 text-sm font-medium transition-all duration-300"
              style={{
                borderColor: "var(--border)",
                background: "var(--surface)",
                color: "var(--text)",
              }}
            >
              Sign in
            </Link>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          {[
            {
              title: "Private short links",
              text: "Only you can see your recent links, click caps, and dashboard history.",
            },
            {
              title: "Public bio page",
              text: "Customize buttons, colors, and motion before sharing your @username page.",
            },
            {
              title: "Personal notes",
              text: "Keep notes private and export only the data tied to your account.",
            },
          ].map((item, index) => (
            <div
              key={item.title}
              className={`animate-morph-in rounded-3xl border p-5 ${
                index === 1 ? "delay-100" : index === 2 ? "delay-150" : ""
              }`}
              style={{
                borderColor: "var(--border)",
                background: "var(--surface)",
              }}
            >
              <div className="text-sm font-medium" style={{ color: "var(--text)" }}>
                {item.title}
              </div>
              <p className="pt-2 text-sm leading-7" style={{ color: "var(--text-muted)" }}>
                {item.text}
              </p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
