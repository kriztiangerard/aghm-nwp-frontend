// The "here" link in the footer emails this address.
const CONTACT_EMAIL = 'kriztiangerard.kim.cics@ust.edu.ph'

// Same order as the manuscript's title page (by surname).
const DEVELOPERS = [
  'Angelique Rosen Cortez',
  'Kriztian Gerard Kim',
  'Mikaela Angela Muldong',
  'Hyacinth Singian',
]

/**
 * Credits and contact link at the end of the splash page: one row on wide
 * screens, stacked on narrow ones.
 */
export function AppFooter() {
  return (
    <footer className="flex flex-col items-center gap-2 border-t bg-background px-4 py-4 text-center text-xs text-muted-foreground sm:px-8 lg:flex-row lg:justify-between lg:py-5 lg:text-left print:hidden">
      <div className="flex flex-col gap-x-3 gap-y-1 lg:flex-row lg:items-center">
        <p className="text-xs font-semibold text-foreground">Developed by AGHM.</p>
        <ul aria-label="Developers" className="flex flex-wrap justify-center gap-x-3 gap-y-1">
          {DEVELOPERS.map((name) => (
            <li key={name} className="whitespace-nowrap">
              {name}
            </li>
          ))}
        </ul>
      </div>
      <p className="text-xs">
        Any problems? Contact us{' '}
        <a
          href={`mailto:${CONTACT_EMAIL}`}
          className="rounded-sm font-semibold text-primary-text underline underline-offset-2 hover:no-underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        >
          here
        </a>
        .
      </p>
    </footer>
  )
}
