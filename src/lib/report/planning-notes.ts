// Plain-language version of the assumptions, engine flags and limitations for the Final Report page.
// The PDF does not use this file: it keeps the engine's precise wording.
//
// Nothing is dropped. Every note keeps the engine's own wording in `details`, which the page shows
// on request. A code or line that is not recognised here is shown as written.

import { formatCategory } from './format-labels'
import { humanizeField, humanizeValue } from './format-assumptions'

export interface PlanningNote {
  key: string
  text: string
  /** The engine's own wording behind this note. */
  details: string[]
}

export interface AssumptionGroup {
  title: string
  notes: PlanningNote[]
  /** The exact assumptions behind the whole group. */
  details: string[]
}

export interface PlanningNotes {
  /** Things the reader should act on before buying. */
  actions: PlanningNote[]
  assumptions: AssumptionGroup[]
  /** Information that needs no action. */
  goodToKnow: PlanningNote[]
  notCovered: PlanningNote[]
  /** Laws and standards the reader should look into. */
  regulations: PlanningNote[]
}

interface LedgerEntry {
  field: string
  valueUsed: unknown
  reason: string
}

interface Flag {
  code: string
  message: string
}

export interface PlanningNotesInput {
  vendor: string
  planType: 'CE' | 'HP'
  /** Shared entries plus this plan's entries. */
  ledger: unknown[]
  /** The result's flag list followed by this plan's flags. */
  flags: unknown[]
  /** The limitation lines as the report words them. */
  limitations: string[]
}

type UnknownRecord = Record<string, unknown>

const asRecord = (value: unknown): UnknownRecord =>
  value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as UnknownRecord)
    : {}

const asText = (value: unknown): string => (typeof value === 'string' ? value : '')

/** Adds a note, or adds its wording to the note that already says the same thing. */
function addNote(list: PlanningNote[], key: string, text: string, detail: string) {
  const existing = list.find((note) => note.key === key && note.text === text)

  if (!existing) {
    list.push({ key, text, details: detail ? [detail] : [] })
  } else if (detail && !existing.details.includes(detail)) {
    existing.details.push(detail)
  }
}

function joinList(items: string[]): string {
  if (items.length < 2) return items.join('')
  return `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`
}

// ---------------------------------------------------------------------------
// Engine flags
// ---------------------------------------------------------------------------

type FlagLevel = 'action' | 'info'

interface FlagCopy {
  level: FlagLevel
  /** Receives the engine message, so that model names and counts can be kept. */
  text: (message: string) => string
  /** Notes with the same key and text are shown once. */
  key?: string
}

const fixed = (level: FlagLevel, text: string, key?: string): FlagCopy => ({
  level,
  text: () => text,
  key,
})

/** Uses the captured parts of the engine message, or the whole message if its wording has changed. */
const captured = (
  level: FlagLevel,
  pattern: RegExp,
  text: (...parts: string[]) => string,
  key?: string,
): FlagCopy => ({
  level,
  key,
  text: (message) => {
    const match = message.match(pattern)
    return match ? text(...match.slice(1)) : message
  },
})

const FLAG_COPY: Record<string, FlagCopy> = {
  SKU_SUNSETTING: captured(
    'action',
    /^(.+?) is sunsetting/,
    (sku) => `${sku} is being phased out. Check that you can still buy it.`,
  ),
  CONTROLLER_SUNSETTING: fixed(
    'action',
    'The selected controller is being phased out. Check that you can still buy it.',
  ),
  AP_DATA_INCOMPLETE: captured(
    'info',
    /missing from the catalog: (.+?)\.?$/,
    (skus) => `Some access points were left out because the catalog is missing their power details: ${skus}.`,
  ),
  WIFI_6E_FALLBACK: fixed(
    'info',
    'This vendor has no suitable Wi-Fi 6E access point, so this plan uses a different Wi-Fi standard.',
    'wifi-fallback',
  ),
  GATEWAY_LAN_PORTS_UNCONFIRMED: captured(
    'action',
    /^The LAN port count of (.+?) is not confirmed .*connect (\d+) switch/,
    (sku, count) => `Check that gateway ${sku} has enough LAN ports for ${count} switch connection(s). The catalog does not confirm it.`,
  ),
  GATEWAY_LAN_PORTS_INSUFFICIENT: captured(
    'action',
    /^(.+?) records (\d+) LAN port\(s\), but this plan needs (\d+)/,
    (sku, have, need) => `Gateway ${sku} lists ${have} LAN port(s), but this plan needs ${need}. Confirm how the switches will connect.`,
  ),
  GATEWAY_VPN_CAPACITY_UNKNOWN: fixed(
    'action',
    'Check that the gateway supports enough VPN connections between your sites.',
  ),
  GATEWAY_THROUGHPUT_UNKNOWN: fixed(
    'info',
    'Some gateways were not considered as fast enough because their speed rating is unknown.',
  ),
  GATEWAY_DUAL_WAN_UNKNOWN: fixed(
    'info',
    'Some gateways do not say whether they support two internet links, so that support was not assumed.',
  ),
  GATEWAY_HA_UNSUPPORTED: fixed(
    'action',
    'This vendor does not support a standby gateway pair at this plan level. Plan for what happens if the gateway fails.',
  ),
  GATEWAY_SECURITY_TIER_FALLBACK: fixed(
    'action',
    'No suitable gateway with advanced security was available, so this plan uses standard security. Check your security needs.',
    'security-fallback',
  ),
  TOPOLOGY_DUAL_WAN_UNAVAILABLE: fixed(
    'action',
    'A backup internet link is needed, but the selected gateway does not support two. The diagram shows one link.',
  ),
  TOPOLOGY_DUAL_WAN_UNKNOWN: fixed(
    'action',
    'Check that the gateway supports two internet links. The diagram shows only one.',
  ),
  TOPOLOGY_PARTIAL: fixed('action', 'This plan is incomplete, so the diagram is not a full design.', 'incomplete'),
  TOPOLOGY_WIFI_DEVICES_WITHOUT_AP: fixed(
    'action',
    'Wi-Fi devices were entered, but this plan has no access point.',
  ),
  TOPOLOGY_SWITCH_SPECS_MISSING: fixed(
    'action',
    'Some switch port counts are missing. Check that the switches have enough ports.',
  ),
  TOPOLOGY_ATTACHMENT_OVERFLOW: fixed(
    'action',
    'Some devices did not fit on the listed switch ports. Check the switch port counts.',
  ),
  OPTICS_COMPATIBILITY_ADVISORY: fixed(
    'action',
    'Before buying fiber modules (SFP), check that they work with your chosen equipment. A site survey sets the final number.',
  ),
  OPTICS_NO_SFP_PORTS: fixed(
    'action',
    'A selected switch lists no fiber (SFP) ports, so the module type is unknown. Check how the fiber will connect.',
  ),
  OPTICS_FORM_FACTOR_UNKNOWN: fixed('action', 'Confirm the fiber module type before you buy.'),
  OPTICS_FORM_FACTOR_MISMATCH: fixed(
    'action',
    'The two ends of a fiber link use different port types. Confirm which module will work.',
  ),
  OPTICS_MIXED_SPEED: fixed(
    'action',
    'Some fiber links will run at 1 Gbps. Check that the faster port accepts a 1 Gbps module.',
  ),
  CONTROLLER_CAPACITY_NOT_VERIFIED: fixed(
    'action',
    'Check that the gateway’s built-in controller can manage all the planned devices.',
  ),
  CONTROLLER_INTEGRATED_CAPACITY_EXCEEDED: fixed(
    'info',
    'The gateway’s built-in controller cannot manage all the planned devices, so a separate controller is used.',
  ),
  CORE_SWITCH_PORTS_UNKNOWN: fixed(
    'info',
    'Some switches with unknown port counts were not considered for the main (core) switch.',
  ),
  RACK_UNITS_UNKNOWN: fixed(
    'action',
    'The rack size of some equipment is unknown. Check that it fits the rack or cabinet.',
  ),
  DEVICE_NOT_RACK_MOUNTABLE: fixed(
    'info',
    'Some equipment does not mount in a rack. It needs a shelf or a wall.',
  ),
  ENCLOSURE_GENERIC: fixed('info', 'Any rack or cabinet model of the listed size can be used.', 'enclosure-size'),
  POWER_DRAW_UNKNOWN: fixed(
    'action',
    'Some power figures are missing, so the suggested UPS size may be too small. Check it before buying.',
  ),
  EDGE_DEVICES_SINGLE_HOMED: fixed(
    'info',
    'Each end device connects to one switch only, even where switches have backup links.',
  ),
  BOM_PARTIAL_PRICE: captured(
    'action',
    /selected SKU\(s\): (.+?)\.?$/,
    (skus) => `The total leaves out items with no price: ${skus}. Ask a supplier for their prices.`,
    'partial-price',
  ),
  BOM_PRICE_STALE: fixed('action', 'Some prices may be out of date. Confirm them with a supplier.'),
  BOM_PLAN_INCOMPLETE: fixed('action', 'This plan is missing required equipment.', 'incomplete'),
  UNPRICED_SKUS_EXCLUDED: fixed('info', 'Devices without a price were not considered.'),
  CONNECTION_TYPE_NOT_CHECKED: fixed(
    'action',
    'Check your internet connection type. The advice on a backup connection may change.',
  ),
  OTHER_LOCATION_COUNT_ASSUMED: fixed('info', 'We assumed you have one other location.', 'other-locations'),
  FUTURE_SITE_VPN_ADVISORY: fixed(
    'info',
    'Only the High-Performance plan allows for VPN links to your planned new sites.',
  ),
  LARGE_ROOM_OCCUPANCY_EXCEEDS_WIFI_DEVICES: fixed(
    'action',
    'Your large rooms hold more people than the number of Wi-Fi devices entered. Check both numbers.',
  ),
  Q10_FALLBACK_UNDEFINED: fixed(
    'action',
    'No internet speed was entered, so no minimum gateway speed was applied. Check the gateway against your internet plan.',
  ),
  DEFAULT_VENDOR_NO_COMPLETE_CE_PLAN: fixed('info', 'No vendor had a complete Cost-Efficient plan to suggest.'),
  DEFAULT_VENDOR_NO_COMPLETE_HP_PLAN: fixed('info', 'No vendor had a complete High-Performance plan to suggest.'),
  'existing-equipment-advisory': fixed(
    'info',
    'The estimate assumes all new equipment. Have your current equipment checked for possible reuse.',
    'greenfield',
  ),
  'other-devices-not-sized': fixed(
    'info',
    'The other devices you listed were not included in the sizing.',
    'other-devices',
  ),
}

/**
 * The result's flag list also holds every vendor's plan flags, each tagged with its plan. Keep the
 * general ones and this plan's own.
 */
export function selectPlanFlags(flags: unknown[], vendor: string, planType: 'CE' | 'HP'): Flag[] {
  const seen = new Set<string>()

  return flags.flatMap((flag) => {
    const item = asRecord(flag)
    const scope = asRecord(item.plan)

    if (item.plan !== undefined && (scope.vendor !== vendor || scope.planType !== planType)) {
      return []
    }

    const code = asText(item.code)
    const message =
      typeof flag === 'string'
        ? flag
        : asText(item.message ?? item.description ?? item.reason) || code
    const id = JSON.stringify([code, message])

    if (!message || seen.has(id)) return []
    seen.add(id)
    return [{ code, message }]
  })
}

// ---------------------------------------------------------------------------
// Assumptions
// ---------------------------------------------------------------------------

type GroupId = 'answers' | 'wifi' | 'network' | 'power' | 'vendor' | 'other'

/** Answers the engine filled in or adjusted. */
const ANSWER_FIELDS = ['sensitiveData', 'locations', 'floorArea', 'apps', 'existingEquipment', 'connection', 'management', 'growth.band']

const GROUP_TITLES: Record<GroupId, string> = {
  answers: 'Your answers',
  wifi: 'Wi-Fi',
  network: 'Network and cabling',
  power: 'Power and equipment housing',
  vendor: 'How the suggested vendor was chosen',
  other: 'Other',
}

const GROUP_ORDER: GroupId[] = ['answers', 'wifi', 'network', 'power', 'vendor', 'other']

function groupOf(field: string): GroupId {
  if (ANSWER_FIELDS.includes(field)) return 'answers'
  if (field.startsWith('wireless.') || field === 'largeRooms') return 'wifi'
  if (field.startsWith('defaultVendor.')) return 'vendor'
  if (field.startsWith('powerProtection.') || ['upsRecommendationLevel', 'housing', 'enclosure'].includes(field)) {
    return 'power'
  }
  if (
    field.startsWith('topology.') ||
    ['fiberLinks', 'coreSwitch', 'otherLocations', 'securityTier'].includes(field)
  ) {
    return 'network'
  }
  return 'other'
}

function exactWording(entry: LedgerEntry): string {
  return `${humanizeField(entry.field)}: ${humanizeValue(entry.field, entry.valueUsed)}. ${entry.reason}`
}

function coverageText(counts: unknown): string | null {
  if (!Array.isArray(counts) || !counts.every((count) => typeof count === 'number') || counts.length === 0) {
    return null
  }
  if (counts.every((count) => count === 1)) {
    return counts.length === 1
      ? 'The floor gets at least one access point.'
      : 'Every floor gets at least one access point.'
  }
  return `Minimum access points for coverage: ${counts.map((count, index) => `${count} on Floor ${index + 1}`).join(', ')}.`
}

/** One plain sentence for an assumption, or null when it needs no line of its own. */
function assumptionText(entry: LedgerEntry, has: (field: string) => boolean): { key: string; text: string } | null {
  const { field, valueUsed, reason } = entry
  const note = (text: string, key = field) => ({ key, text })

  switch (field) {
    case 'wireless.standard':
      return note(
        has('wireless.planStandard')
          ? `Wi-Fi ${String(valueUsed)} was requested.`
          : `The plan is designed for Wi-Fi ${String(valueUsed)}.`,
      )
    case 'wireless.planStandard':
      return note(
        `This plan uses Wi-Fi ${String(valueUsed)} because the vendor has no suitable Wi-Fi 6E access point. The Wi-Fi 6E counts do not apply.`,
        'wifi-fallback',
      )
    case 'wireless.coveragePerFloor': {
      const text = coverageText(valueUsed)
      return text ? note(text) : note(exactWording(entry))
    }
    case 'wireless.largeRoomOccupants':
      return Number(valueUsed) > 0
        ? note(`${String(valueUsed)} people in large rooms are left out of the general Wi-Fi capacity count.`)
        : null
    case 'wireless.growth':
      return typeof valueUsed === 'number'
        ? note(
            valueUsed > 0
              ? `Wi-Fi sizing allows for ${Math.round(valueUsed * 100)}% growth.`
              : 'Wi-Fi sizing adds no room for growth.',
          )
        : note(exactWording(entry))
    case 'largeRooms':
      return note('No large-room details were given, so none were assumed.')
    case 'sensitiveData':
      return note(
        /Not sure/.test(reason)
          ? 'You were not sure about sensitive data, so the plan treats your data as sensitive.'
          : 'You selected live payments (POS), so the plan treats your data as sensitive.',
      )
    case 'locations':
      return note('The number of sites was not answered, so one site is assumed.')
    case 'floorArea':
      return note('Floor area was estimated from the number of rooms.')
    case 'apps':
      return note(
        /Camera/i.test(reason)
          ? 'You entered cameras, so camera viewing is included in your applications.'
          : 'You entered VoIP phones, so VoIP calls are included in your applications.',
        `apps-${/Camera/i.test(reason) ? 'cameras' : 'voip'}`,
      )
    case 'existingEquipment':
      return note('The question about existing equipment was not answered, so it is treated as “not sure”.')
    case 'connection':
      return note('The internet connection type was not answered, so it is treated as “not checked”.')
    case 'management':
      return note('You chose command-line management without IT support. Confirm someone can manage the network.')
    case 'otherLocations':
      return note('We assumed you have one other location.', 'other-locations')
    case 'coreSwitch':
      return note(
        `The main (core) switch is estimated to be the same model as the first floor-level switch: ${String(valueUsed)}.`,
      )
    case 'topology.coreFloor':
      return note('The diagram places the main (core) switch in the Floor 1 network closet. Confirm this on site.')
    case 'topology.attachment':
      return note(
        'Which switch each device connects to is only an example. The real wiring depends on your site.',
        'attachment',
      )
    case 'fiberLinks': {
      const count = Number(valueUsed)
      return note(
        `We estimated ${count} fiber link${count === 1 ? '' : 's'}. A site survey should confirm what the fiber connects to.`,
      )
    }
    case 'securityTier':
      return note(
        'No suitable gateway with advanced security was available, so this plan uses standard security.',
        'security-fallback',
      )
    case 'housing': {
      const floor = reason.match(/^Floor (\d+) closet:/)?.[1]
      const housing = valueUsed === 'wall' ? 'a wall cabinet' : valueUsed === 'rack' ? 'a rack' : null
      if (!housing) return note(exactWording(entry))
      return note(
        `${floor ? `Floor ${floor}: ` : ''}You were not sure about equipment housing, so ${housing} is assumed based on the space needed.`,
        floor ? `housing-${floor}` : 'housing',
      )
    }
    case 'enclosure': {
      const floor = reason.match(/^Floor (\d+) closet:/)?.[1]
      return valueUsed === null
        ? note(`${floor ? `Floor ${floor}: ` : ''}No rack or cabinet is needed.`, `enclosure-${floor ?? ''}`)
        : note(exactWording(entry))
    }
    // The UPS figures are combined into one note by the caller.
    case 'powerProtection.estimatedLoadW':
    case 'powerProtection.minUpsRatingW':
    case 'powerProtection.UPS_LOAD_RATIO':
    case 'upsRecommendationLevel':
      return null
    case 'growth.band':
      return note('Your growth range was not available, so no growth was added.')
    default:
      return note(exactWording(entry))
  }
}

/** "Floor 1: x", "Floor 2: x" becomes "Floors 1 and 2: x". */
function combineFloors(notes: PlanningNote[]): PlanningNote[] {
  const floors = new Map<string, string[]>()
  const parts = notes.map((note) => note.text.match(/^Floor (\d+): ([\s\S]+)$/))

  for (const match of parts) {
    if (match) floors.set(match[2], [...(floors.get(match[2]) ?? []), match[1]])
  }

  const done = new Set<string>()

  return notes.flatMap((note, index) => {
    const match = parts[index]
    if (!match) return [note]

    const [, , body] = match
    const shared = floors.get(body) ?? []
    if (shared.length < 2) return [note]
    if (done.has(body)) return []
    done.add(body)
    return [{ ...note, text: `Floors ${joinList(shared)}: ${body}` }]
  })
}

function upsNotes(entries: LedgerEntry[]): PlanningNote[] {
  const value = (field: string) => {
    const found = entries.find((entry) => entry.field === field)?.valueUsed
    return typeof found === 'number' ? found : null
  }
  const minimum = value('powerProtection.minUpsRatingW')
  const load = value('powerProtection.estimatedLoadW')
  const ratio = value('powerProtection.UPS_LOAD_RATIO')
  const notes: PlanningNote[] = []

  if (minimum !== null) {
    notes.push({
      key: 'ups-size',
      text: `If you buy a UPS (backup power), look for a rating of at least ${minimum} W. This is a planning estimate.`,
      details: [],
    })
  }
  if (load !== null) {
    notes.push({
      key: 'ups-load',
      text: `Estimated equipment load: ${load} W. Access points and other PoE-powered devices are not added separately.`,
      details: [],
    })
  }
  if (ratio !== null && minimum !== null) {
    notes.push({
      key: 'ups-ratio',
      text: `The UPS size keeps the load at or below ${Math.round(ratio * 100)}% of its rating. This limit has no confirmed source, so check the UPS maker’s guidance.`,
      details: [],
    })
  }

  return notes
}

/** How the suggested vendor is picked, for the plan type being viewed. */
function vendorNotes(entries: LedgerEntry[], planType: 'CE' | 'HP'): PlanningNote[] {
  if (entries.length === 0) return []

  const find = (field: string) => entries.find((entry) => entry.field === field)
  const planName = planType === 'CE' ? 'Cost-Efficient' : 'High-Performance'
  const notes: PlanningNote[] = []
  const add = (key: string, text: string) => notes.push({ key, text, details: [] })

  const preferred = asText(find('defaultVendor.preferredTier')?.valueUsed)

  if (find('defaultVendor.selectionRule')) {
    add(
      'vendor-rule',
      preferred && preferred !== 'none'
        ? `We compare complete plans, starting with the ${preferred.toLowerCase()} price tier (a team grouping of vendors). Plans with every price listed come first, then the lowest total.`
        : 'We compare complete plans. Plans with every price listed come first, then the lowest total.',
    )
  }

  const suggestion = find(`defaultVendor.${planType}`)
  if (suggestion) {
    add(
      'vendor-pick',
      typeof suggestion.valueUsed === 'string'
        ? `Suggested ${planName} vendor: ${suggestion.valueUsed}. You can still choose any vendor.`
        : `There was no complete ${planName} plan to suggest.`,
    )
  }

  const management = find(`defaultVendor.${planType}.managementFilter`)
  if (management && management.valueUsed !== 'notSure') {
    add(
      'vendor-management',
      /ignored/i.test(management.reason)
        ? 'No vendor matched your management preference, so it was not used for the suggestion.'
        : 'The suggestion only includes vendors that match your management preference.',
    )
  }

  return notes
}

function buildAssumptionGroups(
  entries: LedgerEntry[],
  planType: 'CE' | 'HP',
): AssumptionGroup[] {
  const has = (field: string) => entries.some((entry) => entry.field === field)

  return GROUP_ORDER.flatMap((id) => {
    const members = entries.filter((entry) => groupOf(entry.field) === id)
    if (members.length === 0) return []

    let notes: PlanningNote[] = []

    if (id === 'vendor') {
      notes = vendorNotes(members, planType)
    } else {
      for (const entry of members) {
        const line = assumptionText(entry, has)
        if (line) addNote(notes, line.key, line.text, '')
      }
      if (id === 'power') notes = [...combineFloors(notes), ...upsNotes(members)]
    }

    return [
      {
        title: GROUP_TITLES[id],
        notes,
        details: [...new Set(members.map(exactWording))],
      },
    ]
  })
}

// ---------------------------------------------------------------------------
// Limitations
// ---------------------------------------------------------------------------

type LimitationList = 'actions' | 'notCovered' | 'regulations'

interface LimitationCopy {
  match: RegExp
  list: LimitationList
  key: string
  text: (...parts: string[]) => string
}

const NO_ADVICE = 'This system does not check compliance or give legal advice.'

const LIMITATION_COPY: LimitationCopy[] = [
  {
    match: /^The Bill of Materials covers major network equipment only/,
    list: 'notCovered',
    key: 'bom-scope',
    text: () =>
      'The equipment list and total cover major network devices only: gateway, switches, access points, any controller, and racks or cabinets. Cabling, accessories and minor installation materials are not included. The gateway provides the firewall, so no separate firewall is priced.',
  },
  {
    match: /^The topology is a logical design only/,
    list: 'notCovered',
    key: 'logical-diagram',
    text: () =>
      'The diagram shows logical connections only. It has no IP addresses, rack layouts, Wi-Fi coverage analysis, cable routes or network simulation.',
  },
  {
    match: /^In the topology, the attachment of devices to switches is an assumed layout/,
    list: 'notCovered',
    key: 'attachment',
    text: () => 'Which switch each device connects to is only an example. The real wiring depends on your site.',
  },
  {
    match: /^(?:This is a full greenfield replacement estimate|Existing equipment was reported or is unknown)/,
    list: 'notCovered',
    key: 'greenfield',
    text: () =>
      'The estimate assumes all new equipment. After an on-site check, you may be able to reuse working cabling or equipment, which could lower the cost.',
  },
  {
    match: /^The rack or cabinet in the Bill of Materials is a generic size/,
    list: 'notCovered',
    key: 'enclosure-size',
    text: () => 'Any rack or cabinet model of the listed size or larger can be used.',
  },
  {
    match: /^The plan assumes one network closet or small wall cabinet on each floor/,
    list: 'notCovered',
    key: 'closets',
    text: () =>
      'The plan assumes one network closet or small cabinet per floor. The gateway, main (core) switch and any hardware controller are on Floor 1. A site survey may combine closets.',
  },
  {
    match: /^(Floors? .+? (?:is|are) larger than .+)$/,
    list: 'actions',
    key: 'large-floor',
    text: (line) => line,
  },
  {
    match: /^You listed other devices: "([\s\S]*)"\. They are not counted/,
    list: 'actions',
    key: 'other-devices',
    text: (devices) =>
      `Your other devices (“${devices}”) are not counted in switch ports or power over Ethernet (PoE). Check their connection and power needs.`,
  },
  {
    match: /^The total cost is partial: one or more items have no price/,
    list: 'actions',
    key: 'partial-price',
    text: () => 'The total leaves out items with no price. Ask a supplier for their prices.',
  },
  {
    match: /^The total cost is partial and does not cover/,
    list: 'actions',
    key: 'partial-total',
    text: () => 'The total does not cover every item in the plan.',
  },
  {
    match: /^Requirement not met by .+?: (.+?) — ([\s\S]+)$/,
    list: 'actions',
    key: 'unmet',
    text: (category, reason) => `Not met (${formatCategory(category)}): ${reason}`,
  },
  {
    match: /^The .+ plan is incomplete \(complete: false\)/,
    list: 'actions',
    key: 'incomplete',
    text: () => 'This plan is missing required equipment.',
  },
  {
    match: /^The Data Privacy Act of 2012 \(RA 10173\) likely applies/,
    list: 'regulations',
    key: 'privacy',
    text: () => `The Data Privacy Act of 2012 (RA 10173) likely applies, based on your answers. ${NO_ADVICE}`,
  },
  {
    match: /^The Data Privacy Act of 2012 \(RA 10173\) may apply/,
    list: 'regulations',
    key: 'privacy',
    text: () =>
      `The Data Privacy Act of 2012 (RA 10173) may apply. Check what personal or sensitive data you handle. ${NO_ADVICE}`,
  },
  {
    match: /^PCI DSS applies/,
    list: 'regulations',
    key: 'pci',
    text: () =>
      `The payment card security standard (PCI DSS) applies if you accept or process payment cards. ${NO_ADVICE}`,
  },
]

/** The engine repeats each assumption as a limitation. Those are already shown with the assumptions. */
function repeatsAssumption(line: string, entries: LedgerEntry[]): boolean {
  const prefix = 'Default or estimate used: '
  if (!line.startsWith(prefix)) return false

  const body = line.slice(prefix.length)
  return entries.some(
    (entry) => body.startsWith(`${humanizeField(entry.field)}: `) && body.includes(entry.reason.trim()),
  )
}

// ---------------------------------------------------------------------------

export function buildPlanningNotes({
  vendor,
  planType,
  ledger,
  flags,
  limitations,
}: PlanningNotesInput): PlanningNotes {
  const entries: LedgerEntry[] = ledger.flatMap((entry) => {
    const item = asRecord(entry)
    return typeof item.field === 'string'
      ? [{ field: item.field, valueUsed: item.valueUsed, reason: asText(item.reason) }]
      : []
  })

  const actions: PlanningNote[] = []
  const goodToKnow: PlanningNote[] = []
  const notCovered: PlanningNote[] = []
  const regulations: PlanningNote[] = []
  const lists = { actions, notCovered, regulations }

  for (const { code, message } of selectPlanFlags(flags, vendor, planType)) {
    const copy = FLAG_COPY[code]
    if (!copy) {
      // An unknown flag stays visible, in the engine's words.
      addNote(actions, code || message, message, '')
      continue
    }
    addNote(copy.level === 'action' ? actions : goodToKnow, copy.key ?? code, copy.text(message), message)
  }

  for (const line of limitations) {
    if (repeatsAssumption(line, entries)) continue

    const copy = LIMITATION_COPY.find((candidate) => candidate.match.test(line))
    if (!copy) {
      addNote(notCovered, line, line, '')
      continue
    }

    const parts = line.match(copy.match)?.slice(1) ?? []

    // A flag may already say this. Keep one note and add the limitation's wording to it.
    const flagNote =
      copy.key === 'unmet'
        ? undefined
        : [...actions, ...goodToKnow].find((note) => note.key === copy.key)
    // The limitation wins when it asks for action and the flag only informs.
    const promote = flagNote !== undefined && copy.list === 'actions' && goodToKnow.includes(flagNote)

    if (flagNote && !promote) {
      if (!flagNote.details.includes(line)) flagNote.details.push(line)
      continue
    }

    addNote(lists[copy.list], copy.key, copy.text(...parts), line)

    if (flagNote) {
      goodToKnow.splice(goodToKnow.indexOf(flagNote), 1)
      const kept = actions.find((note) => note.key === copy.key)
      kept?.details.push(...flagNote.details.filter((detail) => !kept.details.includes(detail)))
    }
  }

  const assumptions = buildAssumptionGroups(entries, planType)

  // A flag that only repeats an assumption is shown once, with the assumption.
  for (const group of assumptions) {
    for (const note of group.notes) {
      for (const list of [actions, goodToKnow, notCovered]) {
        const index = list.findIndex((other) => other.key === note.key)
        if (index === -1) continue

        if (list === actions) {
          // Something to act on stays at the top instead.
          group.notes = group.notes.filter((other) => other !== note)
        } else {
          group.details.push(...list[index].details.filter((detail) => !group.details.includes(detail)))
          list.splice(index, 1)
        }
      }
    }
  }

  return { actions, assumptions, goodToKnow, notCovered, regulations }
}
