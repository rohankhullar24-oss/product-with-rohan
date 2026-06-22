export default function Footer() {
  return (
    <footer className="bg-navy dark:bg-slate-900 border-t border-slate-700/50 dark:border-slate-700">
      <div className="mx-auto max-w-5xl px-6 py-6 text-center text-xs text-slate-500 dark:text-slate-600">
        © {new Date().getFullYear()} Rohan Khullar — Product with Rohan
      </div>
    </footer>
  );
}
