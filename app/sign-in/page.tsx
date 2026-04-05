import type { Metadata } from "next";
import AuthForm from "@/components/AuthForm";
import { redirectAuthenticatedUser } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Sign In - Shor",
  description: "Sign in to manage your private links and notes.",
};

export default async function SignInPage() {
  await redirectAuthenticatedUser();
  return <AuthForm mode="sign-in" />;
}
