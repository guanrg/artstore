import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="border-t border-zinc-700 bg-zinc-900 text-zinc-100">
      <div className="mx-auto grid max-w-6xl gap-8 px-6 py-10 md:grid-cols-4">
        <section>
          <p className="text-xs uppercase tracking-[0.22em] text-zinc-400">Company</p>
          <h2 className="mt-2 font-[var(--font-heading)] text-xl font-semibold text-zinc-100">
            Art Studio Pty Ltd
          </h2>
          <p className="mt-3 text-sm leading-6 text-zinc-300">
            Curated vintage pieces, collectible design objects, and gallery-ready art for
            Australian collectors.
          </p>
        </section>

        <section>
          <p className="text-xs uppercase tracking-[0.22em] text-zinc-400">Contact</p>
          <ul className="mt-3 space-y-2 text-sm text-zinc-200">
            <li>+61 2 9000 1234</li>
            <li>hello@artstudio.au</li>
            <li>Suite 12, 88 George St</li>
            <li>Sydney NSW 2000, Australia</li>
          </ul>
        </section>

        <section>
          <p className="text-xs uppercase tracking-[0.22em] text-zinc-400">Support</p>
          <div className="mt-3 flex flex-col gap-2 text-sm">
            <Link href="#" className="text-zinc-200 transition hover:text-white">
              Shipping & Returns
            </Link>
            <Link href="#" className="text-zinc-200 transition hover:text-white">
              Privacy Policy
            </Link>
            <Link href="#" className="text-zinc-200 transition hover:text-white">
              Terms of Service
            </Link>
            <Link href="#" className="text-zinc-200 transition hover:text-white">
              FAQs
            </Link>
          </div>
        </section>

        <section>
          <p className="text-xs uppercase tracking-[0.22em] text-zinc-400">Hours</p>
          <ul className="mt-3 space-y-2 text-sm text-zinc-200">
            <li>Mon - Fri: 10:00 - 18:00</li>
            <li>Sat: 10:00 - 16:00</li>
            <li>Sun: Appointment only</li>
          </ul>
          <p className="mt-4 text-xs text-zinc-400">ABN 12 345 678 901</p>
        </section>
      </div>

      <div className="border-t border-zinc-700 bg-zinc-900/95">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-6 py-4 text-xs text-zinc-400 md:flex-row md:items-center md:justify-between">
          <p>© 2026 Art Studio Pty Ltd. All rights reserved.</p>
          <p>Instagram / Pinterest / Facebook</p>
        </div>
      </div>
    </footer>
  );
}
