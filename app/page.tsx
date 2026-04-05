import ShortenerHome from "@/components/ShortenerHome";
import { getOptionalSession } from "@/lib/auth";

export default async function HomePage() {
  const session = await getOptionalSession();

  return <ShortenerHome username={session?.username ?? null} />;
}
