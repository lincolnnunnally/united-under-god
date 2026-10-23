/**
 * Page footer on every church sound and video page, same place ChurchConnect
 * puts the line: a single muted paragraph under the page, above the site footer.
 */
export function ChurchAvPageFooter() {
  return (
    <footer className="border-t border-rule bg-paper">
      <p className="mx-auto max-w-6xl px-5 py-4 text-[16px] leading-normal text-subtle md:px-8 md:pt-4 md:pb-6">
        Nothing here is a price or a quote.
      </p>
    </footer>
  );
}
