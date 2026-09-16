export const spacing = {
  xs: 8,
  sm: 16,
  md: 24,
  lg: 32,
  xl: 40,
} as const;

export const minTapTarget = 44;
// The high-contrast/large-target accessibility setting raises every
// interactive control to this height instead — comfortably past the 44pt
// baseline for anyone with reduced fine motor control.
export const largeMinTapTarget = 56;
// Two radii only, and the smaller one is always the nested one: controls and
// badges sit inside cards, never the other way round.
export const cardCornerRadius = 16;
export const controlCornerRadius = 12;
