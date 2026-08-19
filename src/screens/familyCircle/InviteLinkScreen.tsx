import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Button } from '../../components/Button';
import { InviteCodeCard } from '../../components/InviteCodeCard';
import { signInAsGuest } from '../../services/auth';
import { FamilyCircleError, joinFamilyCircle } from '../../services/familyCircles';
import { colors, minTapTarget, spacing, typography } from '../../theme';

function messageForError(error: unknown) {
  if (error instanceof FamilyCircleError) {
    switch (error.code) {
      case 'invalid-code':
      case 'code-not-found':
        return 'That invite is no longer valid. Ask your family for a new one.';
      case 'already-in-circle':
        return 'You already belong to a family circle.';
    }
  }
  if (typeof (error as { code?: unknown }).code === 'string') {
    return 'Guest access is unavailable right now. Try signing in instead.';
  }
  return 'Could not join the circle. Check your connection and try again.';
}

interface InviteLinkScreenProps {
  code: string;
  onJoined: () => void;
  onUseAccount: () => void;
  onDismiss: () => void;
}

export function InviteLinkScreen({
  code,
  onJoined,
  onUseAccount,
  onDismiss,
}: InviteLinkScreenProps) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string>();

  async function join() {
    setError(undefined);
    setPending(true);
    try {
      const credential = await signInAsGuest();
      await joinFamilyCircle(credential.user, code);
      onJoined();
    } catch (failure) {
      setError(messageForError(failure));
      setPending(false);
    }
  }

  return (
    <ScrollView
      style={styles.flex}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.header}>
        <View style={styles.mark}>
          <Text style={styles.markText}>أثر</Text>
        </View>
        <Text style={styles.title}>You have been invited</Text>
        <Text style={styles.subtitle}>
          Join your family on Athar with the code below. You can add your name and email later.
        </Text>
      </View>

      <View style={styles.form}>
        {error ? (
          <View style={styles.banner} accessibilityRole="alert">
            <Text style={styles.bannerText}>{error}</Text>
          </View>
        ) : null}

        <InviteCodeCard code={code} copyable={false} />

        <View style={styles.action}>
          <Button label="Join as guest" onPress={join} loading={pending} />
          {error ? (
            <Button label="Continue without joining" variant="secondary" onPress={onDismiss} />
          ) : (
            <Pressable
              onPress={onUseAccount}
              disabled={pending}
              accessibilityRole="link"
              style={styles.link}
            >
              <Text style={styles.linkText}>I already have an account</Text>
            </Pressable>
          )}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xl,
    gap: spacing.xl,
  },
  header: {
    alignItems: 'center',
    gap: spacing.xs,
  },
  mark: {
    width: 72,
    height: 72,
    borderRadius: 24,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  markText: {
    ...typography.display,
    color: colors.textOnAccent,
  },
  title: {
    ...typography.display,
    color: colors.textPrimary,
    textAlign: 'center',
  },
  subtitle: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  form: {
    gap: spacing.sm,
  },
  banner: {
    backgroundColor: colors.surface,
    borderLeftWidth: 4,
    borderLeftColor: colors.error,
    borderRadius: 12,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  bannerText: {
    ...typography.body,
    color: colors.error,
  },
  action: {
    marginTop: spacing.xs,
    gap: spacing.xs,
  },
  link: {
    minHeight: minTapTarget,
    alignItems: 'center',
    justifyContent: 'center',
  },
  linkText: {
    ...typography.label,
    color: colors.primary,
  },
});
