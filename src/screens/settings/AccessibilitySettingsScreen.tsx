import { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { useAppTheme, type AppTheme } from '../../hooks/useAppTheme';
import {
  textSizeLabels,
  textSizeScales,
  useAccessibilityStore,
  type TextSize,
} from '../../store/accessibilityStore';
import { cardCornerRadius, cardShadow, spacing } from '../../theme';

const textSizeOptions: TextSize[] = ['standard', 'large', 'extraLarge'];

function TextSizePicker({ theme }: { theme: AppTheme }) {
  const styles = useMemo(() => createStyles(theme), [theme]);
  const textSize = useAccessibilityStore((state) => state.textSize);
  const setTextSize = useAccessibilityStore((state) => state.setTextSize);

  return (
    <View style={styles.card}>
      <View style={styles.optionRow} accessibilityRole="radiogroup">
        {textSizeOptions.map((option) => {
          const selected = option === textSize;
          return (
            <Pressable
              key={option}
              onPress={() => setTextSize(option)}
              accessibilityRole="radio"
              accessibilityLabel={textSizeLabels[option]}
              accessibilityState={{ selected }}
              style={[styles.option, selected && styles.optionSelected]}
            >
              <Text
                style={[
                  styles.optionLabel,
                  { fontSize: Math.round(16 * textSizeScales[option]) },
                  selected && styles.optionLabelSelected,
                ]}
              >
                Aa
              </Text>
              <Text style={[styles.optionCaption, selected && styles.optionLabelSelected]}>
                {textSizeLabels[option]}
              </Text>
            </Pressable>
          );
        })}
      </View>
      <Text style={styles.preview}>This is how your memories will read.</Text>
    </View>
  );
}

function SettingSwitch({
  theme,
  title,
  description,
  value,
  onValueChange,
}: {
  theme: AppTheme;
  title: string;
  description: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
}) {
  const styles = useMemo(() => createStyles(theme), [theme]);
  return (
    <View style={styles.card}>
      <View style={styles.switchRow}>
        <View style={styles.switchText}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.description}>{description}</Text>
        </View>
        <Switch
          value={value}
          onValueChange={onValueChange}
          accessibilityLabel={title}
          accessibilityHint={description}
          trackColor={{ true: theme.colors.primary }}
        />
      </View>
    </View>
  );
}

export function AccessibilitySettingsScreen() {
  const theme = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const highContrast = useAccessibilityStore((state) => state.highContrast);
  const setHighContrast = useAccessibilityStore((state) => state.setHighContrast);
  const simplifiedMode = useAccessibilityStore((state) => state.simplifiedMode);
  const setSimplifiedMode = useAccessibilityStore((state) => state.setSimplifiedMode);

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.header}>
        These settings change how Athar looks and behaves for you on this device.
      </Text>

      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Text size</Text>
        <TextSizePicker theme={theme} />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Display</Text>
        <SettingSwitch
          theme={theme}
          title="High contrast and larger buttons"
          description="Black text on white, stronger outlines, and bigger buttons that are easier to tap."
          value={highContrast}
          onValueChange={setHighContrast}
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Navigation</Text>
        <SettingSwitch
          theme={theme}
          title="Simplified navigation"
          description="Show only Capture, Timeline, and Family in the tab bar. Turn this off any time to bring Albums back."
          value={simplifiedMode}
          onValueChange={setSimplifiedMode}
        />
      </View>
    </ScrollView>
  );
}

function createStyles({ colors, typography, minTapTarget }: AppTheme) {
  return StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: colors.background,
    },
    content: {
      padding: spacing.sm,
      gap: spacing.md,
    },
    header: {
      ...typography.body,
      color: colors.textSecondary,
    },
    section: {
      gap: spacing.xs,
    },
    sectionLabel: {
      ...typography.eyebrow,
      color: colors.textSecondary,
    },
    card: {
      gap: spacing.sm,
      backgroundColor: colors.surface,
      borderRadius: cardCornerRadius,
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.sm,
      ...cardShadow,
    },
    optionRow: {
      flexDirection: 'row',
      gap: spacing.xs,
    },
    option: {
      flex: 1,
      minHeight: minTapTarget + spacing.sm,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 2,
      borderRadius: cardCornerRadius,
      borderWidth: 1,
      borderColor: colors.border,
      paddingVertical: spacing.xs,
    },
    optionSelected: {
      borderColor: colors.primary,
      borderWidth: 2,
      backgroundColor: 'rgba(180, 71, 46, 0.08)',
    },
    optionLabel: {
      ...typography.body,
      fontWeight: '600',
      color: colors.textPrimary,
    },
    optionCaption: {
      ...typography.caption,
      color: colors.textSecondary,
    },
    optionLabelSelected: {
      color: colors.primary,
    },
    preview: {
      ...typography.body,
      color: colors.textPrimary,
    },
    switchRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
    },
    switchText: {
      flex: 1,
      gap: 2,
    },
    title: {
      ...typography.body,
      fontWeight: '600',
      color: colors.textPrimary,
    },
    description: {
      ...typography.caption,
      color: colors.textSecondary,
    },
  });
}
