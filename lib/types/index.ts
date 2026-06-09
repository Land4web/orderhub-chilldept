export type Kanaal = string
export type KanaalType = 'woocommerce' | 'mirakl'

export interface KanaalConfigRow {
  kanaal: string
  type: KanaalType
  config: Record<string, string>
}
export type Vervoerder = 'DHL' | 'PostNL' | 'DPD' | 'GLS'

export type OrderStatus =
  | 'new'
  | 'processing'
  | 'ready_to_ship'
  | 'shipped'
  | 'completed'
  | 'cancelled'
  | 'returned'
  | 'failed'

export type AfasStatus = 'not_entered' | 'entered'

export interface OrderRegel {
  sku: string
  naam: string
  aantal: number
  prijs: number
}

export interface Order {
  id: string
  kanaal: Kanaal
  kanaalOrderId: string
  status: OrderStatus
  afasStatus: AfasStatus
  klantNaam: string
  klantEmail: string
  klantAdres: string
  klantPostcode: string
  klantStad: string
  klantLand: string
  regels: OrderRegel[]
  totaal: number
  vervoerder: Vervoerder | null
  trackingCode: string | null
  aangemaaktOp: string
  bijgewerktOp: string
  notities: string | null
  afasIngevoerdOp?: string | null
}

export interface Product {
  id: string
  sku: string
  naam: string
  categorie: string
  inkoopprijs: number
  verkoopprijs: number
  gewicht: number
  actief: boolean
  kanalen: Kanaal[]
}

export interface Voorraad {
  sku: string
  beschikbaar: number
  gereserveerd: number
  minimumDrempel: number
  locatie: string
}

export interface AfasCheck {
  id: string
  orderId: string
  klantNaam: string
  kanaal: Kanaal
  bedrag: number
  afasStatus: AfasStatus
  foutmelding: string | null
  gecontroleerOp: string
}

export type SyncStatus = 'success' | 'warning' | 'error'

export interface SyncLog {
  id: string
  kanaal: Kanaal
  type: 'orders' | 'voorraad' | 'producten'
  status: SyncStatus
  aantalVerwerkt: number
  aantalFouten: number
  bericht: string
  uitgevoerdOp: string
}
