// src/app/membresia/page.tsx
import { Suspense } from "react";
import MembershipPage from "./membership-page";

export default function Page() {
  return (
    <Suspense fallback={null}>
      <MembershipPage />
    </Suspense>
  );
}