import { ActivityIndicator, Pressable, StyleSheet, Text } from 'react-native';
import {
  accentShadow,
  colors,
  controlCornerRadius,
  minTapTarget,
  spacing,
  typography,
} from '../theme';

export type ButtonVariant =
  'primary' | 'secondary' | 'destructive' | 'destructiveOutline' | 'quiet';

interface ButtonProps {
  label: string;
  hint?: string;
  onPress: () => void;
  variant?: ButtonVariant;
  disabled?: boolean;
  loading?: boolean;
  /** Defaults to `label`; set this only when the label alone isn't descriptive. */
  accessibilityLabel?: string;
}

export function Button({
  label,
  hint,
  onPress,
  variant = 'primary',
  disabled = false,
  loading = false,
  accessibilityLabel,
}: ButtonProps) {
  const interactive = !disabled && !loading;
  const labelColor =
    variant === 'secondary'
      ? colors.primary
      : variant === 'destructiveOutline'
        ? colors.error
        : variant === 'quiet'
          ? colors.textSecondary
          : colors.textOnAccent;

  return (
    <Pressable
      onPress={onPress}
      disabled={!interactive}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? (hint ? `${label}, ${hint}` : label)}
      accessibilityState={{ disabled: !interactive, busy: loading }}
      style={({ pressed }) => [
        styles.base,
        styles[variant],
        pressed && interactive && styles.pressed,
        !interactive && styles.inactive,
      ]}
    >
      {loading ? (
        // Rendered at the same height as the label so the button doesn't
        // resize when it enters the loading state.
        <ActivityIndicator size="small" color={labelColor} />
      ) : (
        <>
          <Text style={[styles.label, { color: labelColor }]}>{label}</Text>
          {hint ? <Text style={[styles.hint, { color: labelColor }]}>{hint}</Text> : null}
        </>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: minTapTarget,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: controlCornerRadius,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primary: {
    backgroundColor: colors.primary,
    ...accentShadow,
  },
  secondary: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.primary,
  },
  destructive: {
    backgroundColor: colors.error,
  },
  destructiveOutline: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.error,
  },
  quiet: {
    backgroundColor: 'transparent',
  },
  pressed: {
    opacity: 0.7,
  },
  inactive: {
    opacity: 0.4,
  },
  label: {
    ...typography.label,
  },
  hint: {
    ...typography.caption,
    fontSize: 11,
    marginTop: 1,
  },
});
