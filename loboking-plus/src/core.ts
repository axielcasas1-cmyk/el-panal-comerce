export const routeTypes = [
  'SALE','LICENSING','CONTEST','GRANT','RESEARCH','PARTNERSHIP',
  'MANUFACTURER','DISTRIBUTOR','INVESTOR','HOSPITAL','UNIVERSITY','JOINT_VENTURE','OTHER'
] as const

export const horizons = ['NOW','30D','Q1','Q2','H1','H2','12M','LONG'] as const
export const flightStates = ['EN_TIERRA','DESPEGANDO','EN_EL_AIRE','TOCANDO_PUERTAS','INTERES','NEGOCIANDO','FIRMA','COBRADO','PARADO','BLOQUEADO'] as const

const lifecycleProgress: Record<string, number> = {
  TRIAGE: 8, WAREHOUSE: 18, DOCUMENTS: 30, STUDY: 38, MIGTAX: 48,
  BUSINESS: 62, SALES: 76, LEGAL: 86, FINANCE: 94, CLOSED: 100, HOLD: 20,
}

export const lifecyclePercent = (state?: string | null) =>
  state ? (lifecycleProgress[state] ?? 0) : 0

export const money = (value?: number | string | null) =>
  new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })
    .format(Number(value ?? 0))

export const prettyDate = (value?: string | null) => {
  if (!value) return '—'
  const date = new Date(value)
  return Number.isNaN(date.getTime())
    ? '—'
    : new Intl.DateTimeFormat('es-ES', { dateStyle: 'medium', timeStyle: 'short' }).format(date)
}

export const safeFileName = (value: string) =>
  value.normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9._-]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 120) || 'archivo'

export async function sha256(file: Blob) {
  const buffer = await file.arrayBuffer()
  const digest = await crypto.subtle.digest('SHA-256', buffer)
  return Array.from(new Uint8Array(digest))
    .map((x) => x.toString(16).padStart(2, '0'))
    .join('')
}

export function fileMatch(fileName: string, assets: Array<{ id: string; name: string }>) {
  const haystack = fileName.toLocaleLowerCase('es')
  const matches = assets.filter((asset) => {
    const needle = asset.name.trim().toLocaleLowerCase('es')
    return needle.length >= 3 && haystack.includes(needle)
  })
  if (matches.length === 1) return { status: 'MATCHED_FILENAME', assetId: matches[0].id, confidence: 85 }
  if (matches.length > 1) return { status: 'POSSIBLE_MATCH', assetId: null, confidence: 60 }
  return { status: 'UNASSIGNED', assetId: null, confidence: null }
}
