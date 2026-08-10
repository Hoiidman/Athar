export const colors = {
  primary: '#4C5FD5',
  secondary: '#FF8A5B',
  success: '#3DA35D',
  // Darkened from #D64545, which measured 4.38:1 against white — just under
  // the 4.5:1 minimum required by UI_Design_System.md §10. Now 4.80:1.
  error: '#CC4040',
  warning: '#E8A63B',
  background: '#FAFAF8',
  surface: '#FFFFFF',
  textPrimary: '#1A1A1A',
  textSecondary: '#6B6B6B',
  // Text/icons placed on a filled primary or error surface.
  textOnAccent: '#FFFFFF',
  // Input/card outlines. The lightest grey clearing 3:1 against both
  // `surface` and `background` — WCAG 1.4.11 requires that for a control's
  // visible boundary. Anything lighter fails and the field stops reading
  // as an input.
  border: '#8A8A8A',
} as const;

export const darkColors: Record<keyof typeof colors, string> = {
  primary: '#7B8AFF',
  secondary: '#FF9E75',
  success: '#4FBF75',
  warning: '#F0B85C',
  error: '#E8706F',
  background: '#121212',
  surface: '#1E1E1E',
  textPrimary: '#F2F2F2',
  textSecondary: '#A6A6A6',
  // Dark-mode accents are light, so they take dark text rather than white.
  // Revisit alongside dark mode itself (Phase 8) — untested until then.
  textOnAccent: '#121212',
  // 3.37:1 on `surface`, 3.78:1 on `background` — clears 3:1 on both.
  border: '#707070',
};
