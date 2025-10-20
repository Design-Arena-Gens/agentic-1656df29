"use client";

import { UserButton } from "@clerk/nextjs";

export function UserMenu() {
  return (
    <UserButton
      appearance={{
        elements: {
          avatarBox: "h-10 w-10",
          userButtonPopoverCard: "border border-border shadow-xl",
        },
      }}
      afterSignOutUrl="/"
    />
  );
}
