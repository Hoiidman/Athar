import { ActivityIndicator, Pressable, StyleSheet, Text } from 'react-native';
import { colors, minTapTarget, spacing, typography } from '../theme';

export type ButtonVariant = 'primary' | 'secondary' | 'destructive' | 'quiet';

interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  disabled?: boolean;
  loading?: boolean;
  /** Defaults to `label`; set this only when the label alone isn't descriptive. */
  accessibilityLabel?: string;
}

export function Button({
  label,
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
      : variant === 'quiet'
        ? colors.textSecondary
        : colors.textOnAccent;

  return (
    <Pressable
      onPress={onPress}
      disabled={!interactive}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
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
        <Text style={[styles.label, { color: labelColor }]}>{label}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: minTapTarget,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primary: {
    backgroundColor: colors.primary,
  },
  secondary: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.primary,
  },
  destructive: {
    backgroundColor: colors.error,
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
});
