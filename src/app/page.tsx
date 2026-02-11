'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/Button';

function LandingPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Handle OAuth redirects that land on the home page
  useEffect(() => {
    const code = searchParams.get('code');
    if (code) {
      console.log('🔥 OAuth code detected on landing page, redirecting to auth callback');
      console.log('Code:', code);
      
      // Build the callback URL with all parameters
      const callbackUrl = new URL('/auth/callback', window.location.origin);
      searchParams.forEach((value, key) => {
        callbackUrl.searchParams.set(key, value);
      });
      
      console.log('🚀 Redirecting to:', callbackUrl.toString());
      router.replace(callbackUrl.pathname + callbackUrl.search);
      return;
    }
  }, [searchParams, router]);

  return (
    <main className="min-h-screen bg-gradient-to-br from-pink-50 to-purple-50">
      <div className="container mx-auto px-4 py-16 lg:py-24">
        {/* Hero + Preview */}
        <div className="grid items-center gap-12 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
          {/* Hero copy */}
          <div className="max-w-xl">
            <div className="mb-6 flex items-center gap-3">
              <span className="rounded-full border border-pink-200 bg-white/70 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-pink-700">
                AI reading workspace
              </span>
              <span className="text-xs text-gray-600">Context-aware summaries · Q&amp;A · Speed reading</span>
            </div>

            <div className="mb-6 flex items-center gap-4">
              <Image
                src="/logo.svg"
                alt="The Quick Reader Logo"
                width={60}
                height={60}
                className="rounded-xl bg-white/80 p-2 shadow-sm"
              />
              <div>
                <p className="text-xs font-medium uppercase tracking-[0.3em] text-pink-500">
                  The Quick Reader
                </p>
                <p className="mt-1 text-sm text-gray-600">
                  Turn dense books into actionable, searchable knowledge.
                </p>
              </div>
            </div>

            <h1 className="font-serif text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 mb-5 tracking-tight">
              Read faster, remember more, and ask your book anything.
            </h1>

            <p className="font-sans text-lg md:text-xl text-gray-600 mb-8">
              The Quick Reader combines context-aware summaries, interactive Q&amp;A, and a focused speed reading
              mode so you can actually finish the books that matter—and keep their ideas at your fingertips.
            </p>

            <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center">
              <div className="flex items-center gap-3">
                <Link href="/register">
                  <Button size="default" className="px-6 py-3 text-sm md:text-base shadow-sm shadow-pink-200">
                    Get started free
                  </Button>
                </Link>
                <Link href="/login" className="text-sm font-medium text-pink-700 underline-offset-4 hover:underline">
                  Log in
                </Link>
              </div>
              <p className="text-sm text-gray-600">
                No new bookstore. <span className="font-medium text-gray-800">Bring your own PDFs &amp; EPUBs.</span>
              </p>
            </div>

            <div className="mt-6 flex flex-wrap gap-3 text-sm">
              <span className="inline-flex items-center gap-2 rounded-full bg-white/80 px-3 py-1 text-gray-700 shadow-sm">
                <span className="h-1.5 w-1.5 rounded-full bg-pink-500" />
                Context-aware summaries
              </span>
              <span className="inline-flex items-center gap-2 rounded-full bg-white/80 px-3 py-1 text-gray-700 shadow-sm">
                <span className="h-1.5 w-1.5 rounded-full bg-purple-500" />
                Ask-anything Q&amp;A
              </span>
              <span className="inline-flex items-center gap-2 rounded-full bg-white/80 px-3 py-1 text-gray-700 shadow-sm">
                <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
                Speed reading mode
              </span>
            </div>
          </div>

          {/* Product preview */}
          <div className="relative">
            <div className="absolute -inset-4 -z-10 rounded-3xl bg-gradient-to-tr from-pink-200/60 via-purple-200/60 to-blue-200/60 blur-xl" />
            <div className="overflow-hidden rounded-3xl border border-white/80 bg-white/90 shadow-2xl backdrop-blur-sm">
              <div className="flex items-center justify-between border-b border-gray-100 px-5 py-3">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-emerald-400" />
                  <span className="text-xs font-medium text-gray-500">Preview</span>
                </div>
                <span className="text-xs text-gray-400">The Quick Reader · Live view</span>
              </div>

              <div className="border-b border-gray-100 px-5 py-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium uppercase tracking-[0.18em] text-gray-500">Reading</p>
                    <p className="mt-1 text-sm font-semibold text-gray-900">
                      Pride and Prejudice — Chapter 4 · A Ball at Meryton
                    </p>
                  </div>
                  <span className="rounded-full bg-gray-900 px-3 py-1 text-xs font-medium text-white">
                    38 min left
                  </span>
                </div>

                <div className="mt-4 inline-flex gap-2 rounded-full bg-gray-100 p-1 text-xs font-medium text-gray-600">
                  <span className="rounded-full bg-white px-3 py-1 text-gray-900 shadow-sm">
                    Context-aware summary
                  </span>
                  <span className="rounded-full px-3 py-1">Q&amp;A</span>
                  <span className="rounded-full px-3 py-1">Speed reading</span>
                </div>
              </div>

              <div className="space-y-4 px-5 py-4 text-xs text-gray-700">
                <div className="rounded-2xl bg-pink-50/80 p-3">
                  <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-pink-600">
                    Context-aware summary
                  </p>
                  <p>
                    You&apos;re in a scene where{" "}
                    <span className="font-semibold">Elizabeth first watches Darcy in society</span>. The summary pulls
                    out the social tension, early hints of pride and prejudice, and how this moment frames their
                    relationship.
                  </p>
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  <div className="rounded-2xl bg-purple-50/80 p-3">
                    <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-purple-600">Q&amp;A</p>
                    <p className="mb-1 font-medium text-gray-900">
                      “Why is Darcy&apos;s first impression so important to the story?”
                    </p>
                    <p>
                      The answer connects this chapter to later reversals, showing how Austen uses early judgments to
                      set up character growth and social critique.
                    </p>
                  </div>

                  <div className="flex flex-col justify-between rounded-2xl bg-blue-50/80 p-3">
                    <div>
                      <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-blue-600">
                        Speed reading mode
                      </p>
                      <p>
                        Bionic-style highlighting and gentle pacing help you move faster without losing comprehension.
                      </p>
                    </div>
                    <div className="mt-3 flex items-center justify-between text-[11px] text-blue-700">
                      <span>Words per minute</span>
                      <span className="rounded-full bg-blue-600 px-2 py-0.5 font-semibold text-white">
                        310 wpm
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Feature highlights */}
        <div className="mt-20 grid gap-8 md:grid-cols-3">
          <div className="rounded-2xl bg-white/85 p-6 text-left shadow-sm">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-pink-100">
              <svg className="h-7 w-7 text-pink-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                />
              </svg>
            </div>
            <h3 className="mb-2 text-xl font-semibold text-gray-900">Context-aware summaries</h3>
            <p className="text-sm text-gray-600">
              Skip generic chapter abstracts. Get short, focused summaries that stay anchored to the exact page or
              section you&apos;re on, so you can recap quickly and never lose the thread of the argument.
            </p>
          </div>

          <div className="rounded-2xl bg-white/85 p-6 text-left shadow-sm">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-purple-100">
              <svg className="h-7 w-7 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                />
              </svg>
            </div>
            <h3 className="mb-2 text-xl font-semibold text-gray-900">Ask-anything Q&amp;A</h3>
            <p className="text-sm text-gray-600">
              Treat every book like a personal coach. Ask follow-up questions, clarify concepts, or compare ideas
              across chapters—and get answers grounded in the text you&apos;re reading right now.
            </p>
          </div>

          <div className="rounded-2xl bg-white/85 p-6 text-left shadow-sm">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-blue-100">
              <svg className="h-7 w-7 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                />
              </svg>
            </div>
            <h3 className="mb-2 text-xl font-semibold text-gray-900">Speed reading mode</h3>
            <p className="text-sm text-gray-600">
              Glide through dense sections without burning out. Subtle highlighting and pacing help you increase
              words-per-minute while maintaining comprehension—so you finish more books, not just skim them.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}

export default function Home() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <LandingPageContent />
    </Suspense>
  );
}
