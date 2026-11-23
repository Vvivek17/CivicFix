"use client";

import { Brand } from "@/components/ui";
import { RefreshCw } from "lucide-react";

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <main className="min-h-screen flex items-center justify-center p-6"><section className="max-w-md rounded-xl border border-[#e0e8d5] bg-white p-10 text-center"><Brand /><h1 className="mt-8 text-2xl font-semibold">Let’s try that again.</h1><p className="mt-3 text-sm leading-7 text-[#8b9c79]">We couldn’t connect to your community right now. Your reports are safe. Please try again in a moment.</p><button className="button button-primary mt-6" onClick={reset}><RefreshCw size={15} />Try again</button></section></main>;
}
