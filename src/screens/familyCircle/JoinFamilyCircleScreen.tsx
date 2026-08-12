import type { User } from 'firebase/auth';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Button } from '../../components/Button';
import { TextInput } from '../../components/TextInput';
import { FamilyCircleError, joinFamilyCircle } from '../../services/familyCircles';
import { INVITE_CODE_LENGTH } from '../../utils/inviteCode';
import { colors, spacing, typography } from '../../theme';

function messageForError(error: unknown) {
  if (error instanceof FamilyCircleError) {
    switch (error.code) {
      case 'invalid-code':
        return `Invite codes are ${INVITE_CODE_LENGTH} characters. Check it and try again.`;
      case 'code-not-found':
        return 'That code does not match any family circle.';
      case 'already-in-circle':
        return 'You already belong to a family circle.';
    }
  }
  return 'Could not join the circle. Check your connection and try again.';
}

interface JoinFamilyCircleScreenProps {
  user: User;
  onJoined?: (circleId: string) => void;
}

export function JoinFamilyCircleScreen({ user, onJoined }: JoinFamilyCircleScreenProps) {
  const [code, setCode] = useState('');
  const [codeError, setCodeError] = useState<string>();
  const [formError, setFormError] = useState<string>();
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    const nextCodeError = code.trim() ? undefined : 'Enter the invite code you were given.';

    setCodeError(nextCodeError);
    setFormError(undefined);
    if (nextCodeError) return;

    setSubmitting(true);
    try {
      const circleId = await joinFamilyCircle(user, code);
      onJoined?.(circleId);
    } catch (error) {
      setFormError(messageForError(error));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={styles.title}>Join your family</Text>
          <Text style={styles.subtitle}>
            Enter the invite code someone in your family shared with you.
          </Text>
        </View>

        <View style={styles.form}>
          {formError ? (
            <View style={styles.banner} accessibilityRole="alert">
              <Text style={styles.bannerText}>{formError}</Text>
            </View>
          ) : null}

          <TextInput
            label="Invite code"
            value={code}
            onChangeText={setCode}
            error={codeError}
            placeholder="K7M2-P9XR"
            autoCapitalize="characters"
            autoCorrect={false}
            maxLength={INVITE_CODE_LENGTH + 2}
            returnKeyType="go"
            onSubmitEditing={handleSubmit}
            editable={!submitting}
          />

          <View style={styles.action}>
            <Button label="Join circle" onPress={handleSubmit} loading={submitting} />
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
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
  },
});
