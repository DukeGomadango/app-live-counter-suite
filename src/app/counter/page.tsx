import { Suspense } from "react";
import CounterPage from "../CounterPage";

function CounterPageFallback() {
  return <div className="h-full min-h-0 w-full" aria-hidden />;
}

export default function Page() {
  return (
    <Suspense fallback={<CounterPageFallback />}>
      <CounterPage />
    </Suspense>
  );
}
