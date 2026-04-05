import type { Metadata } from "next";
import AuthForm from "@/components/AuthForm";
import { redirectAuthenticatedUser } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Sign Up - Shor",
  description: "Create a private Shor account.",
};

export default async function SignUpPage() {
  await redirectAuthenticatedUser();
  return <AuthForm mode="sign-up" />;
}
