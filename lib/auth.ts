export type Role = 'admin' | 'employee' | 'fulfillment'

export interface User {
  id: string
  name: string
  email: string
  initials: string
  role: Role
}

export const ROLE_LABELS: Record<Role, string> = {
  admin: 'Beheerder',
  employee: 'Medewerker',
  fulfillment: 'Fulfillment partner',
}
