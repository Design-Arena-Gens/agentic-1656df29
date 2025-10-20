"use client";

import { SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-background via-background to-primary/10">
      <SignUp appearance={{ elements: { card: "shadow-xl border border-border/60" } }} />
    </div>
  );
}
