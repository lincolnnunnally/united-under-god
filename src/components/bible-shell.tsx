import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { LEGAL } from "@/lib/content";

function Wordmark({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 32 32" aria-hidden="true" focusable="false">
      <circle cx="16" cy="16" r="14.9" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <g fill="none" stroke="currentColor" strokeWidth="1.45">
        <circle cx="16" cy="12.52" r="4.93" />
        <circle cx="12.13" cy="18.62" r="4.93" />
        <circle cx="19.87" cy="18.62" r="4.93" />
      </g>
      <circle cx="16" cy="16.42" r="3.26" fill="var(--paper)" />
      <path
        d="M16 13.25V20.29M13.84 15.71h4.32"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function BibleShell({ children }: { children: ReactNode }) {
  return (
    <div className="bible-root">
      <header className="bible-header">
        <div className="bible-header-inner">
          <Link to="/bible" className="bible-wordmark" aria-label="Understanding the Bible — home">
            <Wordmark className="bible-mark" />
            <span>
              Understanding the Bible
              <small>bible.unitedundergod.org</small>
            </span>
          </Link>
          <nav className="bible-nav" aria-label="Bible">
            <Link to="/bible">Library</Link>
            <Link to="/bible" hash="ask">
              Ask
            </Link>
            <Link to="/doctrine">Doctrine</Link>
            <Link to="/">The movement</Link>
          </nav>
        </div>
      </header>
      {children}
      <footer className="bible-footer">
        <div className="bible-footer-inner">
          <p>
            {LEGAL.name} — {LEGAL.status}, EIN {LEGAL.ein}. Real questions. Short answers. The verses.
            Freedom first.
          </p>
          <p>
            <Link to="/">United Under God</Link>
            {" · "}
            <Link to="/doctrine">Doctrine</Link>
            {" · "}
            <Link to="/privacy">Privacy</Link>
          </p>
        </div>
      </footer>
    </div>
  );
}
