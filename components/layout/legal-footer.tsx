import Link from "next/link";

const legalLinks = [
  { href: "/terms", label: "服务条款" },
  { href: "/privacy", label: "隐私政策" },
  { href: "/refund", label: "退款政策" }
];

export function LegalFooter() {
  return (
    <footer className="border-t py-6 text-sm text-muted-foreground">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-3 px-4 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
        <p>© {new Date().getFullYear()} One AI. All rights reserved.</p>
        <nav className="flex flex-wrap gap-x-4 gap-y-2">
          {legalLinks.map((link) => (
            <Link key={link.href} href={link.href} className="hover:text-primary hover:underline">
              {link.label}
            </Link>
          ))}
        </nav>
      </div>
    </footer>
  );
}
