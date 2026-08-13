/**
 * Shared spacing & radius scale for the adat employee app.
 *
 * All screens should pull horizontal/vertical rhythm from these tokens instead of
 * ad-hoc numbers, so gaps and card padding stay identical everywhere (4px grid,
 * matching the adat design system).
 */
export const spacing = {
  /** 4 — hairline gaps, icon-to-text nudges */
  xs: 4,
  /** 8 — tight inner gaps */
  sm: 8,
  /** 12 — default gap between related items / grid gutter */
  md: 12,
  /** 16 — block separation */
  lg: 16,
  /** 20 — screen horizontal padding, card padding, section separation */
  xl: 20,
  /** 24 — hero padding, large section separation */
  xxl: 24,
  /** 32 — top/bottom breathing room */
  xxxl: 32,
} as const;

export const radius = {
  /** 10 — buttons, chips */
  sm: 10,
  /** 14 — cards, tiles */
  md: 14,
  /** 20 — hero containers, sheets */
  lg: 20,
  /** fully rounded — pills, avatars */
  pill: 999,
} as const;

/** Standard horizontal padding for screen content (matches ScreenShell / list content). */
export const screenPaddingX = spacing.xl;
