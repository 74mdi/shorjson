import LinksDashboard from "@/components/LinksDashboard";
import { requirePageSession } from "@/lib/auth";

export default async function HomePage() {
  const session = await requirePageSession();

  return (
    <LinksDashboard
      csrfToken={session.csrfToken}
      username={session.username}
    />
  );
}
