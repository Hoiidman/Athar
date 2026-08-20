import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { cardCornerRadius, cardShadow, colors, minTapTarget, spacing, typography } from '../theme';

interface InviteCodeCardProps {
  code: string;
  copyable?: boolean;
}

export function InviteCodeCard({ code, copyable = true }: InviteCodeCardProps) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;

    const timer = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(timer);
  }, [copied]);

  async function handleCopy() {
    await Clipboard.setStringAsync(code);
    setCopied(true);
  }

  return (
    <View style={styles.card}>
      <Text style={styles.code} accessibilityLabel={`Invite code ${code.split('').join(' ')}`}>
        {code}
      </Text>
      {copyable ? (
        <Pressable
          onPress={handleCopy}
          accessibilityRole="button"
          accessibilityLabel={copied ? 'Invite code copied' : 'Copy invite code'}
          style={({ pressed }) => [styles.copy, pressed && styles.pressed]}
        >
          <Ionicons
            name={copied ? 'checkmark' : 'copy-outline'}
            size={22}
            color={copied ? colors.success : colors.primary}
          />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    alignSelf: 'stretch',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderRadius: cardCornerRadius,
    paddingHorizontal: minTapTarget,
    paddingVertical: spacing.md,
    ...cardShadow,
  },
  code: {
    ...typography.display,
    color: colors.primary,
    letterSpacing: 4,
    textAlign: 'center',
  },
  copy: {
    position: 'absolute',
    right: spacing.xs,
    top: 0,
    bottom: 0,
    width: minTapTarget,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.6,
  },
});
