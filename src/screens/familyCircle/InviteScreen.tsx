import { ActivityIndicator, ScrollView, Share, StyleSheet, Text, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { Button } from '../../components/Button';
import { EmptyState } from '../../components/EmptyState';
import { InviteCodeCard } from '../../components/InviteCodeCard';
import { useFamilyCircleOverview } from '../../hooks/useFamilyCircleOverview';
import { colors, spacing, typography } from '../../theme';

interface InviteScreenProps {
  circleId: string | null;
}

function inviteMessage(circleName: string, code: string) {
  return `Join our family circle "${circleName}" on Athar. Open the app, choose Join a circle, and enter the code ${code}.`;
}

export function InviteScreen({ circleId }: InviteScreenProps) {
  const { state, reload } = useFamilyCircleOverview(circleId);

  if (state.status === 'loading') {
    return (
      <View style={[styles.screen, styles.centred]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (state.status !== 'ready') {
    return (
      <View style={[styles.screen, styles.centred]}>
        <EmptyState
          icon="cloud-offline-outline"
          tone="error"
          title="Can't reach your circle"
          message="Check your connection and try again."
        >
          <Button label="Try again" variant="secondary" onPress={reload} />
        </EmptyState>
      </View>
    );
  }

  const { name, inviteCode } = state.circle;

  async function share() {
    try {
      await Share.share({ message: inviteMessage(name, inviteCode) });
    } catch {
      // The sheet was dismissed or unavailable; the code on screen still works.
    }
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.title}>Invite your family</Text>
        <Text style={styles.hint}>
          Anyone with this code can join {name}. Share it only with people you want in your circle.
        </Text>
      </View>

      <InviteCodeCard code={inviteCode} />

      <View style={styles.qr} accessibilityLabel="Invite code as a scannable code">
        {/* Fixed black on white rather than theme colours — scanners need the
            contrast, and it must not follow the palette into dark mode. */}
        <QRCode value={inviteCode} size={180} color="#000000" backgroundColor="#FFFFFF" />
        <Text style={styles.qrHint}>Or let them scan this while you are together.</Text>
      </View>

      <Button label="Share invite" onPress={share} />

      <Text style={styles.footnote}>
        They will need the Athar app, then Join a circle on the welcome screen.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  centred: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
  },
  content: {
    padding: spacing.sm,
    gap: spacing.md,
  },
  header: {
    gap: spacing.xs,
  },
  title: {
    ...typography.heading,
    color: colors.textPrimary,
  },
  hint: {
    ...typography.body,
    color: colors.textSecondary,
  },
  qr: {
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingVertical: spacing.md,
  },
  qrHint: {
    ...typography.caption,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  footnote: {
    ...typography.caption,
    color: colors.textSecondary,
    textAlign: 'center',
  },
});
