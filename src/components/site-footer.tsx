import { Link } from "@tanstack/react-router";
import { SealMark } from "@/components/seal-mark";
import { LEGAL, NAV } from "@/lib/content";

export function SiteFooter() {
  return (
    <footer className="border-t border-rule bg-cream">
      <div className="mx-auto grid max-w-6xl gap-10 px-5 py-14 md:grid-cols-[1.4fr_1fr_1fr] md:px-8">
        <div>
          <div className="flex items-center gap-2.5 text-forest">
            <SealMark className="size-11" />
            <span className="font-display text-lg font-medium text-ink">
              United Under God
            </span>
          </div>
          <p className="mt-4 max-w-sm text-sm leading-relaxed text-muted">
            A movement of Christians united under the authority of God, united
            in love, and active in the world — so that good work is seen, and
            people praise the Father.
          </p>
          <p className="mt-4 max-w-sm font-display text-base italic text-ink">
            When God’s people unite, we show the world what is possible.
          </p>
        </div>
        <div>
          <p className="text-xs font-semibold tracking-[0.16em] text-subtle uppercase">
            Walk with us
          </p>
          <ul className="mt-3 space-y-2 text-sm">
            {NAV.map((item) => (
              <li key={item.to}>
                <Link to={item.to} className="text-muted hover:text-ink">
                  {item.label}
                </Link>
              </li>
            ))}
            <li>
              <Link to="/login" className="text-muted hover:text-ink">
                Sign in
              </Link>
            </li>
            <li>
              <Link to="/doctrine" className="text-muted hover:text-ink">
                Doctrine
              </Link>
            </li>
            <li>
              <Link to="/bible" className="text-muted hover:text-ink">
                Understanding the Bible
              </Link>
            </li>
            <li>
              <Link to="/verse" className="text-muted hover:text-ink">
                Verse of the Day
              </Link>
            </li>
            <li>
              <Link to="/join" className="text-muted hover:text-ink">
                Take the seal
              </Link>
            </li>
            <li>
              <Link to="/give" className="text-muted hover:text-ink">
                Give
              </Link>
            </li>
            <li>
              <Link to="/food-donors" className="text-muted hover:text-ink">
                Food donors
              </Link>
            </li>
            <li>
              <Link to="/apps" className="text-muted hover:text-ink">
                Apps & services
              </Link>
            </li>
            <li>
              <Link to="/happenings" className="text-muted hover:text-ink">
                What’s on
              </Link>
            </li>
          </ul>
        </div>
        <div>
          <p className="text-xs font-semibold tracking-[0.16em] text-subtle uppercase">
            Vidalia & beyond
          </p>
          <p className="mt-3 text-sm leading-relaxed text-muted">
            Based in Vidalia, Georgia, serving churches and neighbors across
            the region. Food help through Plenty, donated goods through
            Operate, and church tools through ChurchConnect.
          </p>
          <p className="mt-4 text-sm text-muted">
            {LEGAL.status}. EIN {LEGAL.ein}.
          </p>
          <p className="mt-4 text-sm">
            <Link to="/buying" className="text-forest underline-offset-4 hover:underline">
              Group buying
            </Link>
            {" · "}
            <Link to="/church-av" className="text-forest underline-offset-4 hover:underline">
              Church sound & video
            </Link>
            {" · "}
            <Link to="/apps" className="text-forest underline-offset-4 hover:underline">
              All apps & services
            </Link>
          </p>
        </div>
      </div>
      <div className="border-t border-rule">
        <p className="mx-auto max-w-6xl px-5 py-5 text-xs text-subtle md:px-8">
          United · Loving · Active. {LEGAL.name} is a {LEGAL.status}, EIN{" "}
          {LEGAL.ein}. Tax and Good Samaritan information on this site is a
          plain-language summary, not legal or tax advice.{" "}
          <Link to="/privacy" className="underline-offset-4 hover:underline">
            Privacy
          </Link>
          {" · "}
          <Link to="/terms" className="underline-offset-4 hover:underline">
            Terms
          </Link>
          {" · "}
          <Link to="/admin" className="underline-offset-4 hover:underline">
            Staff
          </Link>
        </p>
      </div>
    </footer>
  );
}
