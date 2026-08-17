// Text tiers are capped from below: on the canvas nothing under 0.63 alpha of
// `ink` reaches 4.5:1, and on a card nothing under 0.61. There is deliberately
// no third, lighter text colour — supporting text separates itself by size,
// weight, case and tracking instead, and keeps the same passing colour.
export const colors = {
  background: '#EFEBE6',
  surface: '#FFFFFF',
  sunken: '#E6E0D9',
  tabBar: '#FCFAF8',

  textPrimary: '#231F1C',
  textSecondary: 'rgba(35, 31, 28, 0.70)',
  // Text/icons placed on a filled primary or error surface.
  textOnAccent: '#FFFFFF',

  // Glyphs that are never text: chevrons, decorative icons.
  uiIcon: 'rgba(35, 31, 28, 0.62)',
  // Outlines and dividers. 3.26:1 on the canvas — WCAG 1.4.11 wants 3:1 for a
  // control's visible boundary.
  border: 'rgba(35, 31, 28, 0.52)',

  // Spent once per screen: the primary action and the active tab.
  primary: '#B4472E',
  primaryPressed: '#993A24',

  // Carries icons and tinted fills, never text — 3.63:1 on white.
  sage: '#7C8B6F',
  sageIcon: '#5F6E53',

  error: '#B3352C',
  success: '#2F7343',
  warning: '#8A6010',
} as const;

// Fills for the avatar preview. Each carries a white glyph at 5.4:1 or better,
// which the lighter sage and amber of the reference could not.
export const avatarFills = ['#B4472E', '#5F6E53', '#8F5F22'] as const;

export const darkColors: Record<keyof typeof colors, string> = {
  background: '#191512',
  surface: '#241F1B',
  sunken: '#12100E',
  tabBar: '#1F1A17',

  textPrimary: '#F3EEE8',
  textSecondary: 'rgba(243, 238, 232, 0.72)',
  // Dark-mode accents are light, so they take dark text rather than white.
  // Revisit alongside dark mode itself — untested until then.
  textOnAccent: '#191512',

  uiIcon: 'rgba(243, 238, 232, 0.64)',
  border: 'rgba(243, 238, 232, 0.34)',

  primary: '#E0836A',
  primaryPressed: '#C96A50',

  sage: '#9DAC8F',
  sageIcon: '#B6C4A8',

  error: '#E8837A',
  success: '#7FBF92',
  warning: '#D9A64E',
};
