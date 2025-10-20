"use client";

import * as DialogPrimitive from "@radix-ui/react-dialog";
import { clsx } from "clsx";
import { X } from "lucide-react";
import { forwardRef } from "react";

export const Dialog = DialogPrimitive.Root;
export const DialogTrigger = DialogPrimitive.Trigger;
export const DialogClose = DialogPrimitive.Close;

export const DialogPortal = ({ children }: { children: React.ReactNode }) => (
  <DialogPrimitive.Portal>
    <div className="fixed inset-0 z-40 flex items-center justify-center">{children}</div>
  </DialogPrimitive.Portal>
);

export const DialogOverlay = forwardRef<HTMLDivElement, React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>>(
  ({ className, ...props }, ref) => (
    <DialogPrimitive.Overlay
      ref={ref}
      className={clsx("fixed inset-0 z-40 bg-black/40 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out", className)}
      {...props}
    />
  ),
);

DialogOverlay.displayName = DialogPrimitive.Overlay.displayName;

export const DialogContent = forwardRef<HTMLDivElement, React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>>(
  ({ className, children, ...props }, ref) => (
    <DialogPortal>
      <DialogOverlay />
      <DialogPrimitive.Content
        ref={ref}
        className={clsx(
          "glass-panel fixed z-50 w-full max-w-lg origin-center rounded-xl border border-border bg-background/95 p-6 shadow-2xl data-[state=open]:animate-in data-[state=open]:fade-in-90 data-[state=open]:zoom-in-90 data-[state=open]:slide-in-from-top-10 data-[state=closed]:animate-out data-[state=closed]:fade-out-0",
          className,
        )}
        {...props}
      >
        {children}
        <DialogPrimitive.Close className="absolute right-4 top-4 rounded-full p-1 text-muted-foreground transition hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60">
          <X className="h-4 w-4" />
        </DialogPrimitive.Close>
      </DialogPrimitive.Content>
    </DialogPortal>
  ),
);

DialogContent.displayName = DialogPrimitive.Content.displayName;

export const DialogHeader = ({ children }: { children: React.ReactNode }) => (
  <div className="space-y-1 text-left">{children}</div>
);

export const DialogTitle = forwardRef<
  HTMLHeadingElement,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title ref={ref} className={clsx("text-lg font-semibold text-foreground", className)} {...props} />
));

DialogTitle.displayName = DialogPrimitive.Title.displayName;

export const DialogDescription = forwardRef<
  HTMLParagraphElement,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description ref={ref} className={clsx("text-sm text-muted-foreground", className)} {...props} />
));

DialogDescription.displayName = DialogPrimitive.Description.displayName;
