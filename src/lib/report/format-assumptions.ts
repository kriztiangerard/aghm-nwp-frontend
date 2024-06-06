// Turns the engine's ledger identifiers (for example "wireless.standard") into
// plain wording. Used for the report page and the PDF through report-view-model.

const FIELD_LABELS: Record<string, string> = {
  apps: 'Applications',
  'powerProtection.estimatedLoadW': 'Power Protection Estimated Load (W)',
  'powerProtection.minUpsRatingW': 'Power Protection Minimum UPS Rating (W)',
}

const WORD_LABELS: Record<string, string> = {
  ce: 'Cost-Efficient',
  hp: 'High-Performance',
  ups: 'UPS',
  poe: 'PoE',
}

/** Engine codes whose plain wording cannot be worked out from the code itself. */
const VALUE_LABELS: Record<string, string> = {
  notSure: 'Not sure',
  notChecked: 'Not checked',
  cli: 'Command line (CLI)',
  wall: 'Wall cabinet',
  rack: 'Full-size rack',
  dslOrCellular: 'DSL or cellular',
  itSupport: 'IT Support',
  inHouse: 'In-house',
}

export function humanizeField(field: string): string {
  if (FIELD_LABELS[field]) return FIELD_LABELS[field]

  return field
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .split(/[._\s]+/)
    .filter(Boolean)
    .map((word) => {
      const known = WORD_LABELS[word.toLowerCase()]
      return known ?? word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
    })
    .join(' ')
}

function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1)
}

function humanizeText(text: string): string {
  if (VALUE_LABELS[text]) return VALUE_LABELS[text]

  // Sentences and phrases such as "assumed layout" only need a capital letter.
  if (/\s/.test(text)) return capitalize(text)

  // Single lowercase codes such as "twoOrMore" or "not_applied".
  if (/^[a-z]+(?:[A-Z][a-z]*|_[a-z]+)*$/.test(text)) {
    return capitalize(
      text
        .replace(/([a-z])([A-Z])/g, '$1 $2')
        .replaceAll('_', ' ')
        .toLowerCase(),
    )
  }

  // Names, models and anything else are left exactly as written.
  return text
}

function percent(value: number): string {
  return `${Math.round(value * 1000) / 10}%`
}

export function humanizeValue(field: string, value: unknown): string {
  if (value === null || value === undefined || value === '') {
    return field === 'enclosure' ? 'None required' : 'Not specified'
  }

  // A device model number: never reword it.
  if (field === 'coreSwitch') return String(value)

  if (field === 'wireless.standard') return `Wi-Fi ${String(value)}`

  if (typeof value === 'number') {
    if (field === 'wireless.growth' || field === 'powerProtection.UPS_LOAD_RATIO') {
      return percent(value)
    }
    if (field === 'floorArea') return `${value} m²`
    return String(value)
  }

  if (typeof value === 'boolean') return value ? 'Yes' : 'No'

  if (Array.isArray(value)) {
    if (value.length === 0) return 'None'
    if (field === 'wireless.coveragePerFloor') {
      return value.map((count, index) => `Floor ${index + 1}: ${count}`).join(', ')
    }
    return value.map((item) => humanizeValue(field, item)).join(', ')
  }

  if (typeof value === 'object') {
    return Object.entries(value as Record<string, unknown>)
      .map(([key, item]) => `${humanizeField(key)}: ${humanizeValue(key, item)}`)
      .join('; ')
      .replace('It Support', 'IT Support')
  }

  return humanizeText(String(value))
}

const LIMITATION_PREFIX = 'Default or estimate used: '

/**
 * The engine also repeats every ledger entry as a limitation line in the form
 * "Default or estimate used: <field> = <value>. <reason>". Rewrite those lines
 * with the same wording as the assumptions; leave all other lines alone.
 */
export function humanizeLimitation(line: string, ledger: unknown[]): string {
  if (!line.startsWith(LIMITATION_PREFIX)) return line

  const body = line.slice(LIMITATION_PREFIX.length)

  for (const entry of ledger) {
    const { field, valueUsed, reason } = (entry ?? {}) as {
      field?: unknown
      valueUsed?: unknown
      reason?: unknown
    }
    if (typeof field !== 'string') continue

    const raw = typeof valueUsed === 'string' ? valueUsed : JSON.stringify(valueUsed)
    const start = `${field} = ${raw}. `

    if (body.startsWith(start) && body.includes(String(reason ?? '').trim())) {
      return `${LIMITATION_PREFIX}${humanizeField(field)}: ${humanizeValue(field, valueUsed)}. ${body.slice(start.length)}`
    }
  }

  // No matching ledger entry: still replace the field name.
  const match = body.match(/^([\w.]+) = /)
  if (!match) return line

  return `${LIMITATION_PREFIX}${humanizeField(match[1])}: ${body.slice(match[0].length)}`
}
