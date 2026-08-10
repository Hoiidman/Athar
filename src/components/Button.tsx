import { ActivityIndicator, Pressable, StyleSheet, Text } from 'react-native';
import { colors, minTapTarget, spacing, typography } from '../theme';

export type ButtonVariant = 'primary' | 'secondary' | 'destructive';

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
  const isOutline = variant === 'secondary';

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
        <ActivityIndicator size="small" color={isOutline ? colors.primary : colors.textOnAccent} />
      ) : (
        <Text style={[styles.label, isOutline ? styles.labelOutline : styles.labelFilled]}>
          {label}
        </Text>
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
  pressed: {
    opacity: 0.7,
  },
  inactive: {
    opacity: 0.4,
  },
  label: {
    ...typography.label,
  },
  labelFilled: {
    color: colors.textOnAccent,
  },
  labelOutline: {
    color: colors.primary,
  },
});
