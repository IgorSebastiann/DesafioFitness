"use client";

import { useRef, useState, type ReactNode } from "react";
import { signOut } from "@/app/actions/auth";
import { push } from "@/lib/push-client";

/** Sair da conta: antes tira este aparelho da conta, para os avisos não chegarem a outra pessoa. */
export function SignOutForm({ className, children }: { className?: string; children: ReactNode }) {
  const formRef = useRef<HTMLFormElement>(null);
  const [leaving, setLeaving] = useState(false);

  return (
    <form
      ref={formRef}
      action={signOut}
      className={className}
      onSubmit={async (event) => {
        if (leaving) return;
        event.preventDefault();
        setLeaving(true);
        await push.unsubscribe();
        formRef.current?.requestSubmit();
      }}
    >
      {children}
    </form>
  );
}
