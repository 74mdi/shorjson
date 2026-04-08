import LandingPage from "@/components/LandingPage";
import ShortenerHome from "@/components/ShortenerHome";
import { getOptionalSession } from "@/lib/auth";
import { createPageMetadata } from "@/lib/metadata";

export const dynamic = "force-dynamic";

export const metadata = createPageMetadata({
  title: "Shor",
  description: "A minimal workspace for short links, bio pages, and private notes.",
  path: "/",
  eyebrow: "Shor",
  badge: "Links + notes",
});

export default async function HomePage() {
  const session = await getOptionalSession();

  if (!session) {
    return <LandingPage />;
  }

  return <ShortenerHome username={session.username} />;
}
