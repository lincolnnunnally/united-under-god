import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { SealGlyph } from "@/components/seal-mark";
import { LEGAL } from "@/lib/content";

function Wordmark({ className }: { className?: string }) {
  return <SealGlyph className={className} />;
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
