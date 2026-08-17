import * as Clipboard from 'expo-clipboard';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Button } from './Button';
import { cardCornerRadius, cardShadow, colors, spacing, typography } from '../theme';

export function InviteCodeCard({ code }: { code: string }) {
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
    <View style={styles.wrapper}>
      <View style={styles.card}>
        <Text style={styles.code} accessibilityLabel={`Invite code ${code.split('').join(' ')}`}>
          {code}
        </Text>
      </View>
      <Button
        label={copied ? 'Copied' : 'Copy code'}
        variant="secondary"
        onPress={handleCopy}
        accessibilityLabel={copied ? 'Invite code copied' : 'Copy invite code'}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    alignSelf: 'stretch',
    gap: spacing.xs,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: cardCornerRadius,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    ...cardShadow,
  },
  code: {
    ...typography.display,
    color: colors.primary,
    letterSpacing: 4,
    textAlign: 'center',
  },
});
