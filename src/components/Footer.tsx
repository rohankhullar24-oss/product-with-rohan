import Link from "next/link";

export default function Footer() {
  return (
    <footer className="bg-navy dark:bg-slate-900 border-t border-slate-700/50 dark:border-slate-700">
      <div className="mx-auto max-w-5xl px-6 py-6 flex flex-col items-center gap-2 text-center text-xs text-slate-500 dark:text-slate-600">
        <div>© {new Date().getFullYear()} Rohan Khullar — Product with Rohan</div>
        <nav className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1">
          <Link href="/privacy" className="hover:text-accent transition-colors">
            Privacy Policy
          </Link>
          <Link href="/terms" className="hover:text-accent transition-colors">
            Terms of Service
          </Link>
          <Link href="/refund-policy" className="hover:text-accent transition-colors">
            Refund Policy
          </Link>
        </nav>
      </div>
    </footer>
  );
}
