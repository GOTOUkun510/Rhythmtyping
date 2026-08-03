"use client";

import Link from "next/link";

const NAV_ITEMS = [
  { href: "/", label: "Rhythm Typing" },
  { href: "/toshi", label: "Toshi" },
  { href: "/tsube", label: "つべ" },
];

export default function Sidebar() {
  return (
    <aside className="flex h-screen w-[150px] shrink-0 flex-col gap-1 border-r border-zinc-800 bg-zinc-950 px-3 py-6">
      <h2 className="mb-4 px-2 text-sm font-semibold text-zinc-500">
        MENU
      </h2>
      {NAV_ITEMS.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className="rounded-md px-2 py-2 text-sm font-medium text-zinc-200 transition-colors hover:bg-zinc-800"
        >
          {item.label}
        </Link>
      ))}
    </aside>
  );
}
