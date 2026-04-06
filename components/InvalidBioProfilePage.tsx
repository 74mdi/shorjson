import Link from "next/link";

export default function InvalidBioProfilePage({
  username,
}: {
  username: string;
}) {
  return (
    <main className="min-h-dvh px-5 pb-16 pt-20 sm:pt-24">
      <div
        className="mx-auto max-w-xl rounded-[32px] border p-6 text-center sm:p-8"
        style={{
          borderColor: "var(--border)",
          background:
            "linear-gradient(145deg, color-mix(in srgb, var(--surface) 86%, transparent), color-mix(in srgb, var(--accent) 5%, var(--bg)))",
        }}
      >
        <div
          className="mx-auto inline-flex items-center rounded-full border px-3 py-1 text-[11px] uppercase tracking-[0.18em]"
          style={{
            borderColor: "var(--border)",
            background: "var(--surface)",
            color: "var(--text-muted)",
          }}
        >
          Invalid profile
        </div>

        <h1
          className="pt-5 text-3xl font-semibold tracking-tight sm:text-4xl"
          style={{ color: "var(--text)" }}
        >
          This user is not valid.
        </h1>

        <p
          className="pt-3 text-sm leading-7 sm:text-base"
          style={{ color: "var(--text-muted)" }}
        >
          The profile <span style={{ color: "var(--text)" }}>@{username}</span>{" "}
          does not exist, has not been published yet, or may have been changed.
        </p>

        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <Link
            href="/"
            className="rounded-2xl px-5 py-3 text-sm font-medium transition-all duration-200 hover:-translate-y-px hover:opacity-95"
            style={{
              background: "var(--accent)",
              color: "var(--bg)",
            }}
          >
            Go home
          </Link>

          <Link
            href="/sign-up"
            className="rounded-2xl border px-5 py-3 text-sm font-medium transition-all duration-200 hover:-translate-y-px hover:border-[var(--border2)] hover:bg-[var(--surface-raised)]"
            style={{
              borderColor: "var(--border)",
              background: "var(--surface)",
              color: "var(--text)",
            }}
          >
            Create your page
          </Link>
        </div>
      </div>
    </main>
  );
}
