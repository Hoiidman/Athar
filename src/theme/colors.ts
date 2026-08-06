export const colors = {
  primary: '#4C5FD5',
  secondary: '#FF8A5B',
  success: '#3DA35D',
  warning: '#E8A63B',
  error: '#D64545',
  background: '#FAFAF8',
  surface: '#FFFFFF',
  textPrimary: '#1A1A1A',
  textSecondary: '#6B6B6B',
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
};
