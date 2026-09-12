import { Suspense } from "react";
import { AuthForm } from "@/components/shell/AuthForm";

export default function RegisterPage() {
  return (
    <Suspense fallback={null}>
      <AuthForm mode="register" />
    </Suspense>
  );
}
