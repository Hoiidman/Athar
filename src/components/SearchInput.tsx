import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, TextInput as RNTextInput, View } from 'react-native';
import { colors, controlCornerRadius, minTapTarget, spacing, typography } from '../theme';

interface SearchInputProps {
  value: string;
  onChangeText: (text: string) => void;
  onSubmit: () => void;
  placeholder?: string;
}

export function SearchInput({ value, onChangeText, onSubmit, placeholder }: SearchInputProps) {
  return (
    <View style={styles.container}>
      <Ionicons name="search" size={20} color={colors.textSecondary} />
      <RNTextInput
        value={value}
        onChangeText={onChangeText}
        onSubmitEditing={onSubmit}
        returnKeyType="search"
        placeholder={placeholder ?? 'Search your memories'}
        placeholderTextColor={colors.textSecondary}
        style={styles.input}
        accessibilityLabel={placeholder ?? 'Search your memories'}
      />
      {value.length > 0 && (
        <Pressable onPress={() => onChangeText('')} hitSlop={8} accessibilityLabel="Clear search">
          <Ionicons name="close-circle" size={20} color={colors.textSecondary} />
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    minHeight: minTapTarget,
    paddingHorizontal: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: controlCornerRadius,
    backgroundColor: colors.surface,
  },
  input: {
    ...typography.body,
    flex: 1,
    color: colors.textPrimary,
    paddingVertical: spacing.xs,
  },
});
