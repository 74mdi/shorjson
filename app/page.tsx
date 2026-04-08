import LandingPage from "@/components/LandingPage";
import ShortenerHome from "@/components/ShortenerHome";
import { getOptionalSession } from "@/lib/auth";
import { createPageMetadata, SITE_NAME } from "@/lib/metadata";

export const dynamic = "force-dynamic";

export const metadata = createPageMetadata({
  title: SITE_NAME,
  description: "A minimal workspace for short links, bio pages, and private notes.",
  path: "/",
  eyebrow: SITE_NAME,
  badge: "Links + notes",
});

export default async function HomePage() {
  const session = await getOptionalSession();

  if (!session) {
    return <LandingPage />;
  }

  return <ShortenerHome username={session.username} />;
}
