import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { cardCornerRadius, colors, minTapTarget, spacing, typography } from '../theme';

interface ActionRowProps {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle?: string;
  /** Short count or status shown before the chevron, e.g. "7 people". */
  meta?: string;
  onPress: () => void;
}

export function ActionRow({ icon, title, subtitle, meta, onPress }: ActionRowProps) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={meta ? `${title}, ${meta}` : title}
      accessibilityHint={subtitle}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      <View style={styles.badge}>
        <Ionicons name={icon} size={22} color={colors.sageIcon} />
      </View>
      <View style={styles.text}>
        <Text style={styles.title}>{title}</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>
      {meta ? <Text style={styles.meta}>{meta}</Text> : null}
      <Ionicons name="chevron-forward" size={20} color={colors.border} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: minTapTarget + spacing.sm,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: cardCornerRadius,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
  },
  pressed: {
    opacity: 0.7,
  },
  badge: {
    width: minTapTarget,
    height: minTapTarget,
    borderRadius: 12,
    backgroundColor: 'rgba(124, 139, 111, 0.16)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    flex: 1,
    gap: 2,
  },
  title: {
    ...typography.body,
    color: colors.textPrimary,
  },
  subtitle: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  meta: {
    ...typography.caption,
    color: colors.textSecondary,
  },
});
