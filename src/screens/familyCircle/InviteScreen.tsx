import type { User } from 'firebase/auth';
import { useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, Share, StyleSheet, Text, View } from 'react-native';
import * as Linking from 'expo-linking';
import QRCode from 'react-native-qrcode-svg';
import { Button } from '../../components/Button';
import { EmptyState } from '../../components/EmptyState';
import { InviteCodeCard } from '../../components/InviteCodeCard';
import { useFamilyCircleOverview } from '../../hooks/useFamilyCircleOverview';
import { rotateInviteCode } from '../../services/familyCircles';
import { cardCornerRadius, cardShadow, colors, spacing, typography } from '../../theme';

interface InviteScreenProps {
  circleId: string | null;
  user: User;
}

export function inviteLink(code: string) {
  return Linking.createURL(`join/${code}`);
}

function inviteMessage(circleName: string, code: string) {
  return [
    `Join our family circle "${circleName}" on Athar.`,
    inviteLink(code),
    `If that link does nothing, open Athar, choose Join a circle, and enter the code ${code}.`,
  ].join('\n\n');
}

export function InviteScreen({ circleId, user }: InviteScreenProps) {
  const { state, reload } = useFamilyCircleOverview(circleId);
  const [rotating, setRotating] = useState(false);
  const [rotateError, setRotateError] = useState<string>();

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

  const { id, name, inviteCode, ownerId } = state.circle;

  async function rotate() {
    setRotateError(undefined);
    setRotating(true);
    try {
      await rotateInviteCode(user, id);
      reload();
    } catch {
      setRotateError('Could not change the code. Check your connection and try again.');
    } finally {
      setRotating(false);
    }
  }

  function confirmRotate() {
    Alert.alert(
      'Change the invite code?',
      'The code above stops working straight away, and anyone you already gave it to will need the new one.',
      [
        { text: 'Keep it', style: 'cancel' },
        { text: 'Change code', style: 'destructive', onPress: rotate },
      ],
    );
  }

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

      {ownerId === user.uid ? (
        <View style={styles.rotate}>
          <Text style={styles.rotateHint}>
            If the code has spread further than you meant it to, replace it. The old one stops
            working.
          </Text>
          <Button
            label="Change code"
            variant="secondary"
            onPress={confirmRotate}
            loading={rotating}
          />
          {rotateError ? (
            <Text style={styles.error} accessibilityRole="alert">
              {rotateError}
            </Text>
          ) : null}
        </View>
      ) : null}
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
    borderRadius: cardCornerRadius,
    paddingVertical: spacing.md,
    ...cardShadow,
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
  rotate: {
    gap: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.md,
  },
  rotateHint: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  error: {
    ...typography.caption,
    color: colors.error,
  },
});
