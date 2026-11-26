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

export function formatMaterialName(name: string): string {
  if (MATERIAL_LABELS[name]) return MATERIAL_LABELS[name]

  // Anything that is already a name is left as written.
  if (!name.includes('_')) return name

  const words = name.replaceAll('_', ' ')
  return words.charAt(0).toUpperCase() + words.slice(1)
}
