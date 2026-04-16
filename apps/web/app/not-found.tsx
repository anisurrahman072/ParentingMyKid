import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Page not found',
  description: 'The page you are looking for does not exist on ParentingMyKid.',
  robots: {
    index: false,
    follow: true,
  },
};

export default function NotFound(): React.ReactElement {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-bg-base px-4 py-16">
      <p className="text-sm font-semibold uppercase tracking-wider text-brand-teal">404</p>
      <h1 className="mt-2 font-quote text-3xl font-bold text-text-main md:text-4xl">
        Page not found
      </h1>
      <p className="mt-4 max-w-md text-center text-text-soft">
        We couldn&apos;t find that page. Choose your language to go back to the home page.
      </p>
      <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
        <Link
          href="/en"
          className="rounded-full bg-gradient-brand px-8 py-3 text-sm font-bold text-white shadow-lg shadow-brand-teal/25 transition hover:opacity-95"
        >
          English home
        </Link>
        <Link
          href="/bn"
          className="rounded-full border-2 border-brand-teal bg-white px-8 py-3 text-sm font-bold text-brand-teal transition hover:bg-brand-teal/5"
        >
          বাংলা হোম
        </Link>
      </div>
      <Link href="/" className="mt-8 text-sm font-medium text-brand-purple underline underline-offset-4">
        Try automatic locale (geo) from root
      </Link>
    </main>
  );
}
