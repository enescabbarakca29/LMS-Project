"use client";

import { ReactNode, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getUser } from "@/app/lib/auth/storage";
import type { Role } from "@/app/lib/auth/types";
import { hasAnyRole, hasMinRole } from "@/app/lib/auth/guard";

type Props = {
  children: ReactNode;
  // ikisinden biri kullanılacak:
  minRole?: Role;
  allowRoles?: Role[];
  redirectTo?: string;
};

export default function RoleGate({
  children,
  minRole,
  allowRoles,
  redirectTo = "/login",
}: Props) {
  const router = useRouter();
  const [ok, setOk] = useState<boolean | null>(null);

  useEffect(() => {
    const user = getUser();

    const allowed =
      allowRoles ? hasAnyRole(user, allowRoles) : minRole ? hasMinRole(user, minRole) : !!user;

    if (!allowed) {
      setOk(false);
      router.replace(redirectTo);
      return;
    }
    setOk(true);
  }, [allowRoles, minRole, redirectTo, router]);

  if (ok === null) return null; // loading
  if (!ok) return null;
  return <>{children}</>;
}
