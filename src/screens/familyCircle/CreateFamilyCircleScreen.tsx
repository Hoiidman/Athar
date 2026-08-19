import type { User } from 'firebase/auth';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Button } from '../../components/Button';
import { InviteShare } from '../../components/InviteShare';
import { TextInput } from '../../components/TextInput';
import {
  FamilyCircleError,
  MAX_CIRCLE_NAME_LENGTH,
  createFamilyCircle,
} from '../../services/familyCircles';
import { colors, spacing, typography } from '../../theme';

function messageForError(error: unknown) {
  if (error instanceof FamilyCircleError) {
    switch (error.code) {
      case 'invalid-name':
        return 'Give your circle a name of up to 60 characters.';
      case 'code-generation-failed':
        return 'Could not generate an invite code. Please try again.';
    }
  }
  return 'Could not create the circle. Check your connection and try again.';
}

interface CreateFamilyCircleScreenProps {
  user: User;
  onContinue?: (circleId: string) => void;
  onSwitchToJoin?: () => void;
  onSkip?: () => void;
}

export function CreateFamilyCircleScreen({
  user,
  onContinue,
  onSwitchToJoin,
  onSkip,
}: CreateFamilyCircleScreenProps) {
  const [name, setName] = useState('');
  const [nameError, setNameError] = useState<string>();
  const [formError, setFormError] = useState<string>();
  const [submitting, setSubmitting] = useState(false);
  const [created, setCreated] = useState<{ id: string; inviteCode: string }>();

  async function handleSubmit() {
    const trimmed = name.trim();
    const nextNameError = trimmed ? undefined : 'Enter a name for your circle.';

    setNameError(nextNameError);
    setFormError(undefined);
    if (nextNameError) return;

    setSubmitting(true);
    try {
      const circle = await createFamilyCircle(user, trimmed);
      setCreated({ id: circle.id, inviteCode: circle.inviteCode });
    } catch (error) {
      setFormError(messageForError(error));
    } finally {
      setSubmitting(false);
    }
  }

  if (created) {
    return (
      <ScrollView style={styles.flex} contentContainerStyle={styles.created}>
        <Text style={styles.title}>{name.trim()}</Text>
        <Text style={styles.subtitle}>Share this code with your family so they can join.</Text>
        <InviteShare circleName={name.trim()} code={created.inviteCode} />
        {onContinue ? (
          <View style={styles.continue}>
            <Button label="Continue" onPress={() => onContinue(created.id)} />
          </View>
        ) : null}
      </ScrollView>
    );
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
          <Text style={styles.title}>Start a family circle</Text>
          <Text style={styles.subtitle}>
            A shared space for your family&apos;s memories. You can invite everyone once it exists.
          </Text>
        </View>

        <View style={styles.form}>
          {formError ? (
            <View style={styles.banner} accessibilityRole="alert">
              <Text style={styles.bannerText}>{formError}</Text>
            </View>
          ) : null}

          <TextInput
            label="Circle name"
            value={name}
            onChangeText={setName}
            error={nameError}
            placeholder="Our family"
            maxLength={MAX_CIRCLE_NAME_LENGTH}
            returnKeyType="go"
            onSubmitEditing={handleSubmit}
            editable={!submitting}
          />

          <View style={styles.action}>
            <Button label="Create circle" onPress={handleSubmit} loading={submitting} />
            {onSwitchToJoin ? (
              <Button
                label="I have an invite code"
                variant="secondary"
                onPress={onSwitchToJoin}
                disabled={submitting}
              />
            ) : null}
            {onSkip ? (
              <Button
                label="Skip for now"
                variant="secondary"
                onPress={onSkip}
                disabled={submitting}
              />
            ) : null}
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
  created: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.lg,
    gap: spacing.sm,
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
    gap: spacing.xs,
  },
  continue: {
    alignSelf: 'stretch',
    marginTop: spacing.sm,
  },
});
