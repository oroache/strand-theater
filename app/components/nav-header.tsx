"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/", label: "Home" },
  { href: "/favorites", label: "Favorites" },
];

export default function NavHeader() {
  const pathname = usePathname();

  return (
    <header className="border-b border-black/10 dark:border-white/10">
      <nav className="mx-auto flex max-w-3xl items-center gap-6 px-6 py-4">
        <span className="font-semibold tracking-tight">Strand Theater</span>
        <ul className="flex gap-4 text-sm">
          {links.map(({ href, label }) => {
            const isActive = pathname === href;
            return (
              <li key={href}>
                <Link
                  href={href}
                  aria-current={isActive ? "page" : undefined}
                  className={
                    isActive
                      ? "font-medium text-foreground"
                      : "text-zinc-500 hover:text-foreground dark:text-zinc-400"
                  }
                >
                  {label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </header>
  );
}
