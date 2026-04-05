import LandingPage from "@/components/LandingPage";
import ShortenerHome from "@/components/ShortenerHome";
import { getOptionalSession } from "@/lib/auth";

export default async function HomePage() {
  const session = await getOptionalSession();

  if (!session) {
    return <LandingPage />;
  }

  return <ShortenerHome username={session.username} />;
}
