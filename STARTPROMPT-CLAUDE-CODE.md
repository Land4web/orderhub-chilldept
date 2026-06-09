# Chill-Dept Order Hub — Startprompt voor Claude Code

Plak dit als eerste bericht in een nieuwe Claude Code sessie (in een lege projectmap).

---

We bouwen de Chill-Dept Order Hub: een centrale omgeving voor orderbeheer, voorraad, AFAS-verwerking en track & trace over meerdere verkoopkanalen (WooCommerce, bol.com, Mirakl, eBay).

**We zitten in Fase 2: Frontend Prototype.**

Regels voor deze fase:
- Next.js 15 met App Router en TypeScript
- Tailwind CSS + shadcn/ui
- Alleen mock data (TypeScript bestanden in `/lib/mock-data/`)
- Geen database, geen Supabase, geen API-integraties, geen authenticatie
- UI-taal: Nederlands
- Design: Linear-stijl (clean, operationeel, compact)
- Kleuren: Primary #111827, Success #22C55E, Warning #F59E0B, Danger #EF4444, Background #F8FAFC

Ga nooit automatisch door naar een volgende fase zonder mijn goedkeuring.

---

## Stap 1: Projectopzet

Maak het volgende aan:
1. Next.js 15 project met TypeScript en Tailwind
2. Installeer shadcn/ui
3. Maak een hoofdlayout met sidebar-navigatie:
   - Dashboard
   - Orders
   - Producten & Voorraad
   - AFAS Controle
   - Synchronisatie
   - Rapportages
   - Instellingen
4. Maak mock data aan in `/lib/mock-data/` voor:
   - orders (minimaal 20 stuks, mix van kanalen en statussen)
   - producten (minimaal 10 SKUs)
   - voorraadniveaus
   - AFAS checks
   - synchronisatieslogs
5. Maak een lege placeholder voor elke pagina

Stop daarna. Ik beoordeel de structuur voordat we verder gaan.

---

## Kanalen
- WooCommerce
- bol.com
- Mirakl
- eBay

## Interne order statussen
`new` | `processing` | `ready_to_ship` | `shipped` | `completed` | `cancelled` | `returned` | `failed`

## AFAS statussen
`not_entered` | `entered` | `needs_review`

## Vervoerders
DHL | PostNL | DPD | GLS

---

Na goedkeuring van de structuur bouwen we pagina voor pagina:
1. Dashboard (KPIs, grafieken, actiecentrum)
2. Orders overzicht (tabel, filters, bulk acties)
3. Order detail (klantgegevens, producten, AFAS, tracking, tijdlijn)
4. Producten & Voorraad
5. AFAS Controle
6. Synchronisatie
7. Rapportages
8. Instellingen
