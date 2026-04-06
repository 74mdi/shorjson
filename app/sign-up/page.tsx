import type { Metadata } from "next";
import AuthForm from "@/components/AuthForm";
import { redirectAuthenticatedUser } from "@/lib/auth";
import { createPageMetadata } from "@/lib/metadata";

export const metadata: Metadata = createPageMetadata({
  title: "Sign Up - Shor",
  description: "Create a private Shor account for links, notes, and your public bio page.",
  path: "/sign-up",
  eyebrow: "Create account",
  badge: "Sign up",
});

export default async function SignUpPage() {
  await redirectAuthenticatedUser();
  return <AuthForm mode="sign-up" />;
}
