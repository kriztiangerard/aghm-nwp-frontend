const CUSTOM_SELECT_LABELS: Record<string, string> = {
  in_house: 'In-house IT',
  outside: 'Outside person/company',
  none: 'No',
  stable: 'Stable',
  frequent_outages: 'Frequent brownouts/outages',
  full_size_rack: 'Full-size rack in a dedicated closet/room',
  wall_cabinet: 'Wall cabinet',
  not_sure: 'Not sure',
  command_line: 'Traditional CLI or technical management',
  dashboard: "A simple app or dashboard (easy-to-use, if you don't have IT staff)",
  can_wait: 'We can wait for it to be fixed',
  same_day_matters: 'It should be fixed within the same day',
  every_minute_matters: 'We need the internet available with very little downtime',
  not_checked: 'Not checked / Not sure',
  dsl_or_cellular: 'DSL / Cellular',
  fiber: 'Fiber',
  none_or_not_sure: 'None / Not sure',
  cat5e_or_cat6: 'Cat5e / Cat6',
  '0_10': '0–10%',
  '11_30': '11–30%',
  '31_plus': '31%+',
  one: '1',
  two_plus: '2+',
}

/** Option labels for the management preference question, shared by the form and the summary. */
export const MANAGEMENT_PREFERENCE_LABELS: Record<string, string> = {
  dashboard: CUSTOM_SELECT_LABELS.dashboard,
  command_line: CUSTOM_SELECT_LABELS.command_line,
  not_sure: 'Not sure / Recommend',
}

/**
 * Formats raw schema values (snake_case, booleans, key names)
 * into human-readable, sentence-case display labels for forms & summaries.
 */
export function formatSelectLabel(value?: string | boolean | null): string {
  if (value === undefined || value === null || value === '') return ''
  if (typeof value === 'boolean') return value ? 'Yes' : 'No'

  const labelKey = String(value)

  if (CUSTOM_SELECT_LABELS[labelKey]) {
    return CUSTOM_SELECT_LABELS[labelKey]
  }

  // Fallback: convert snake_case or UPPERCASE to sentence case
  const formatted = labelKey.replace(/_/g, ' ')
  return formatted.charAt(0).toUpperCase() + formatted.slice(1).toLowerCase()
}