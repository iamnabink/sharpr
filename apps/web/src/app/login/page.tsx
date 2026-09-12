import { Suspense } from "react";
import { AuthForm } from "@/components/shell/AuthForm";

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <AuthForm mode="login" />
    </Suspense>
  );
}
