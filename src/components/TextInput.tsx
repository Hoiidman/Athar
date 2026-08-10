import { useState } from 'react';
import {
  StyleSheet,
  Text,
  TextInput as RNTextInput,
  type TextInputProps as RNTextInputProps,
  View,
} from 'react-native';
import { colors, minTapTarget, spacing, typography } from '../theme';

interface TextInputProps extends Omit<RNTextInputProps, 'style' | 'placeholderTextColor'> {
  /**
   * Always visible above the field. A placeholder is not a substitute — it
   * disappears on focus and is lost to screen readers.
   */
  label: string;
  /** When set, the field reads as invalid and this replaces `helperText`. */
  error?: string;
  helperText?: string;
}

export function TextInput({ label, error, helperText, ...inputProps }: TextInputProps) {
  const [focused, setFocused] = useState(false);
  const hasError = !!error;
  // Errors take priority — showing both at once competes for attention and
  // pushes the error further from the field it belongs to.
  const message = error ?? helperText;

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>

      <RNTextInput
        {...inputProps}
        onFocus={(e) => {
          setFocused(true);
          inputProps.onFocus?.(e);
        }}
        onBlur={(e) => {
          setFocused(false);
          inputProps.onBlur?.(e);
        }}
        accessibilityLabel={label}
        accessibilityHint={message}
        placeholderTextColor={colors.textSecondary}
        style={[
          styles.input,
          focused && styles.inputFocused,
          hasError && styles.inputError,
          inputProps.editable === false && styles.inputDisabled,
        ]}
      />

      {message ? (
        <Text style={[styles.message, hasError && styles.messageError]}>{message}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.xs / 2,
  },
  label: {
    ...typography.label,
    color: colors.textPrimary,
  },
  input: {
    ...typography.body,
    color: colors.textPrimary,
    minHeight: minTapTarget,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    backgroundColor: colors.surface,
  },
  inputFocused: {
    borderColor: colors.primary,
    // Widened rather than only recoloured, so focus is still visible to
    // someone who cannot distinguish the two colours.
    borderWidth: 2,
  },
  inputError: {
    borderColor: colors.error,
    borderWidth: 2,
  },
  inputDisabled: {
    opacity: 0.5,
  },
  message: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  messageError: {
    color: colors.error,
  },
});
