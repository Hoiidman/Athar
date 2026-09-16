import { Ionicons } from '@expo/vector-icons';
import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { cardCornerRadius, cardShadow, controlCornerRadius, spacing } from '../theme';
import { useAppTheme, type AppTheme } from '../hooks/useAppTheme';

interface ActionRowProps {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle?: string;
  /** Short count or status shown before the chevron, e.g. "7 people". */
  meta?: string;
  onPress: () => void;
}

export function ActionRow({ icon, title, subtitle, meta, onPress }: ActionRowProps) {
  const theme = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={meta ? `${title}, ${meta}` : title}
      accessibilityHint={subtitle}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      <View style={styles.badge}>
        <Ionicons name={icon} size={22} color={theme.colors.sageIcon} />
      </View>
      <View style={styles.text}>
        <Text style={styles.title}>{title}</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>
      {meta ? <Text style={styles.meta}>{meta}</Text> : null}
      <Ionicons name="chevron-forward" size={20} color={theme.colors.uiIcon} />
    </Pressable>
  );
}

function createStyles({ colors, typography, minTapTarget }: AppTheme) {
  return StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      minHeight: minTapTarget + spacing.sm,
      backgroundColor: colors.surface,
      borderRadius: cardCornerRadius,
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.sm,
      ...cardShadow,
    },
    pressed: {
      opacity: 0.7,
    },
    badge: {
      width: minTapTarget,
      height: minTapTarget,
      borderRadius: controlCornerRadius,
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
}
