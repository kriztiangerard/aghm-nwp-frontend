import { FileText } from 'lucide-react'
import { useFormContext } from 'react-hook-form'

import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { getSummarySections, SECTION_TITLES } from '../../lib/summary'

type SummaryPanelProps = {
  sectionKey?: keyof typeof SECTION_TITLES
}

function SummaryPanel({ sectionKey }: SummaryPanelProps) {
  const { watch } = useFormContext()
  const formData = watch()
  const sections = getSummarySections(formData, sectionKey)

  return (
    <aside
      aria-labelledby="section-summary-title"
      className="min-w-0 lg:sticky lg:top-8"
    >
      {/* Same Card as the questionnaire beside it; matches its height on large screens. */}
      <Card className="max-h-[calc(100dvh-6rem)] min-h-[18rem] gap-0 lg:h-[calc(100dvh-6rem-var(--app-footer-height,0px))] lg:min-h-[36rem]">
        <CardHeader className="shrink-0 pb-(--card-spacing)">
          <div className="flex items-center gap-3">
            <div className="rounded-md bg-primary/10 p-2 text-primary-text">
              <FileText className="h-4 w-4" />
            </div>
            <h2 id="section-summary-title" className="text-lg font-bold tracking-tight">
              Section Summary
            </h2>
          </div>
        </CardHeader>

        <Separator />

        <CardContent
          className="min-h-0 flex-1 space-y-5 overflow-y-auto pt-(--card-spacing)"
          aria-live="polite"
          aria-atomic="false"
        >
        {sections.length === 0 ? (
          <div
              role="status"
              className="rounded-md border border-dashed border-border/70 bg-muted/30 px-3 py-4 text-sm text-muted-foreground"
            >
              Your answers will appear here
          </div>
        ) : (
          sections.map((section) => (
            <section key={section.title} className="space-y-3">
              <h3 className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                {section.title}
              </h3>

              <dl className="space-y-3">
                {section.items.map((item, index) => (
                  <div key={item.id ?? `${section.title}-${item.label}-${index}`} className="min-w-0 space-y-1">
                    <dt className="break-words text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
                      {item.label}
                    </dt>
                    <dd>
                      {Array.isArray(item.value) ? (
                        <div className="flex flex-wrap gap-2">
                          {item.value.map((valueItem) => (
                            <Badge
                              key={`${item.label}-${valueItem}`}
                              className="h-auto max-w-full whitespace-normal break-words text-left"
                            >
                              {valueItem}
                            </Badge>
                          ))}
                        </div>
                      ) : (
                        <span className="block whitespace-pre-line break-words text-sm text-foreground">
                          {item.value}
                        </span>
                      )}
                    </dd>
                  </div>
                ))}
              </dl>
            </section>
          ))
        )}
        </CardContent>
      </Card>
    </aside>
  )
}

export default SummaryPanel
export { getSummarySections }
