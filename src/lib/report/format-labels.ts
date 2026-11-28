// Readable names for the engine's hardware category and material codes.
// Shared by the report page and the PDF so the two cannot differ.

const CATEGORY_LABELS: Record<string, string> = {
  access_point: 'Access Point',
  ap: 'Access Point',
}

const MATERIAL_LABELS: Record<string, string> = {
  cat6_cabling: 'Cat6 cabling',
  patch_cords: 'Patch cords',
  rj45_connectors: 'RJ45 connectors',
  patch_panels: 'Patch panels',
  sfp_modules: 'SFP modules',
}

export function formatCategory(category: string): string {
  const normalized = category.trim().toLowerCase()

  return (
    CATEGORY_LABELS[normalized] ??
    normalized
      .split(/[\s_-]+/)
      .filter(Boolean)
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ')
  )
}

// NWP-ENGINE-019 AC7: the SFP row also says how many links and modules were estimated, and the form
// factor. The engine sends 'form factor not determined' (or null) when it could not read one.
export function formatMaterialDescription(item: Record<string, unknown>): string {
  const description =
    typeof item.description === 'string' ? item.description : '—'

  if (
    item.item !== 'sfp_modules' ||
    typeof item.modules !== 'number' ||
    typeof item.links !== 'number'
  ) {
    return description
  }

  const formFactor =
    typeof item.formFactor === 'string' &&
    item.formFactor !== 'form factor not determined'
      ? `Form factor: ${item.formFactor}.`
      : 'Form factor not determined.'

  const links = `${item.links} link${item.links === 1 ? '' : 's'}`
  const modules = `${item.modules} module${item.modules === 1 ? '' : 's'}`

  return `${description.replace(/\.?$/, '.')} ${modules} for ${links}. ${formFactor}`
}

// NWP-ENGINE-019 AC8: the firewall is a function of the gateway. This line is display-only: it is not a
// BOM line, has no price or quantity, and is left out of totals and the CSV.
export function formatFirewallNote(
  lines: ReadonlyArray<{ category: string; name?: string; sku: string }>,
): string | null {
  const gateway = lines.find((line) => line.category.toLowerCase() === 'gateway')
  if (!gateway) return null

  const model =
    gateway.name && gateway.name !== gateway.sku
      ? `${gateway.name} (${gateway.sku})`
      : gateway.sku

  return `Firewall: integrated in gateway ${model}`
}

export function formatMaterialName(name: string): string {
  if (MATERIAL_LABELS[name]) return MATERIAL_LABELS[name]

  // Anything that is already a name is left as written.
  if (!name.includes('_')) return name

  const words = name.replaceAll('_', ' ')
  return words.charAt(0).toUpperCase() + words.slice(1)
}
