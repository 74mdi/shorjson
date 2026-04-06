import type { Metadata } from "next";
import AuthForm from "@/components/AuthForm";
import { redirectAuthenticatedUser } from "@/lib/auth";
import { createPageMetadata } from "@/lib/metadata";

export const metadata: Metadata = createPageMetadata({
  title: "Sign In - Shor",
  description: "Sign in to manage your private links, bio page, and notes.",
  path: "/sign-in",
  eyebrow: "Welcome back",
  badge: "Sign in",
});

export default async function SignInPage() {
  await redirectAuthenticatedUser();
  return <AuthForm mode="sign-in" />;
}
