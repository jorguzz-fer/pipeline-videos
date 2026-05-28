"use client";

import { useFormStatus } from "react-dom";

export function SubmitButton({
  className,
  children,
  pendingLabel = "…",
}: {
  className: string;
  children: React.ReactNode;
  pendingLabel?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className={className} disabled={pending}>
      {pending ? pendingLabel : children}
    </button>
  );
}
