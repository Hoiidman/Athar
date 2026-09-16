import { useMemo } from 'react';
import { useAccessibilityStore, textSizeScales } from '../store/accessibilityStore';
import { colors as standardColors, highContrastColors } from '../theme/colors';
import { getTypography } from '../theme/typography';
import { minTapTarget, largeMinTapTarget } from '../theme/spacing';

/**
 * The theme actually in effect for this render, after the accessibility
 * settings (text size, high contrast) are applied. Components that need to
 * react to those settings should read this instead of importing the static
 * `colors`/`typography` exports directly.
 */
export function useAppTheme() {
  const textSize = useAccessibilityStore((state) => state.textSize);
  const highContrast = useAccessibilityStore((state) => state.highContrast);

  return useMemo(() => {
    const scale = textSizeScales[textSize];
    return {
      colors: highContrast ? highContrastColors : standardColors,
      typography: getTypography(scale),
      minTapTarget: highContrast ? largeMinTapTarget : minTapTarget,
      highContrast,
      textSize,
      scale,
    };
  }, [textSize, highContrast]);
}

export type AppTheme = ReturnType<typeof useAppTheme>;
