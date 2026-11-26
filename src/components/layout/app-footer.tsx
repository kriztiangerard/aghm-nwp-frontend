// The "here" link in the footer emails this address.
const CONTACT_EMAIL = 'kriztiangerard.kim.cics@ust.edu.ph'

// Same order as the manuscript's title page (by surname).
const DEVELOPERS = [
  'Angelique Rosen Cortez',
  'Kriztian Gerard Kim',
  'Mikaela Angela Muldong',
  'Hyacinth Singian',
]

const DISCLAIMER =
  'All trademarks, logos, and brand names shown on this website are the property ' +
  'of their respective owners. Their use does not imply affiliation with or ' +
  'endorsement by those owners. The content of this website, including generated ' +
  'plans and cost estimates, is for informational and planning purposes only. It ' +
  'does not constitute professional advice and is not a substitute for a physical ' +
  'site survey or professional installation.'

/**
 * Credits, contact link and disclaimer at the end of the splash page. Credits
 * and contact share a row on wide screens and stack on narrow ones.
 */
export function AppFooter() {
  return (
    <footer className="border-t bg-background px-4 py-4 text-center text-xs text-muted-foreground sm:px-8 lg:py-5 lg:text-left print:hidden">
      <div className="flex flex-col items-center gap-2 lg:flex-row lg:justify-between">
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
      </div>
      <p className="mt-4 border-t pt-4 text-xs leading-relaxed text-pretty">{DISCLAIMER}</p>
    </footer>
  )
}
