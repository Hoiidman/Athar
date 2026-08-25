import { useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Avatar } from '../../components/Avatar';
import { Button } from '../../components/Button';
import { EmptyState } from '../../components/EmptyState';
import { Select } from '../../components/Select';
import { TextInput } from '../../components/TextInput';
import { useFamilyCircleOverview } from '../../hooks/useFamilyCircleOverview';
import {
  MAX_RELATIONSHIP_LENGTH,
  removeFamilyCircleMember,
  setMemberRelationship,
} from '../../services/familyCircles';
import { cardCornerRadius, cardShadow, colors, spacing, typography } from '../../theme';

interface MemberDetailScreenProps {
  circleId: string | null;
  userId: string;
  currentUid: string;
  onRemoved: () => void;
}

interface RemoveMemberProps {
  circleId: string;
  userId: string;
  displayName: string;
  onRemoved: () => void;
}

function RemoveMember({ circleId, userId, displayName, onRemoved }: RemoveMemberProps) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string>();

  async function remove() {
    setError(undefined);
    setPending(true);
    try {
      await removeFamilyCircleMember(circleId, userId);
      onRemoved();
    } catch {
      setError('Could not remove them. Check your connection and try again.');
      setPending(false);
    }
  }

  function confirmRemove() {
    Alert.alert(
      `Remove ${displayName}?`,
      'They lose access to the circle straight away. They can join again with the invite code, so change it too if that is not what you want.',
      [
        { text: 'Keep them', style: 'cancel' },
        { text: 'Remove', style: 'destructive', onPress: remove },
      ],
    );
  }

  return (
    <View style={styles.danger}>
      <Button
        label="Remove from circle"
        variant="destructive"
        onPress={confirmRemove}
        loading={pending}
        accessibilityLabel={`Remove ${displayName} from circle`}
      />
      {error ? (
        <Text style={styles.error} accessibilityRole="alert">
          {error}
        </Text>
      ) : null}
    </View>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.detail}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
}

const OTHER = 'other';

const RELATIONSHIPS = [
  'Dad',
  'Mum',
  'Son',
  'Daughter',
  'Brother',
  'Sister',
  'Grandpa',
  'Grandma',
  'Uncle',
  'Aunt',
  'Cousin',
].map((name) => ({ value: name, label: name }));

const RELATIONSHIP_CHOICES = [...RELATIONSHIPS, { value: OTHER, label: 'Other' }];

function choiceFor(current: string | null) {
  if (!current) return null;
  return RELATIONSHIPS.some((option) => option.value === current) ? current : OTHER;
}

interface RelationshipFieldProps {
  circleId: string;
  userId: string;
  current: string | null;
  canEdit: boolean;
  onSaved: () => void;
}

function RelationshipField({
  circleId,
  userId,
  current,
  canEdit,
  onSaved,
}: RelationshipFieldProps) {
  const [editing, setEditing] = useState(false);
  const [choice, setChoice] = useState(() => choiceFor(current));
  const [custom, setCustom] = useState(current ?? '');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string>();

  if (!editing) {
    return (
      <View style={styles.detail}>
        <Text style={styles.detailLabel}>Relationship</Text>
        <View style={styles.detailAction}>
          <Text style={styles.detailValue}>{current || 'Not set'}</Text>
          {canEdit ? (
            <Button
              label={current ? 'Change' : 'Add'}
              variant="secondary"
              onPress={() => {
                setChoice(choiceFor(current));
                setCustom(current ?? '');
                setError(undefined);
                setEditing(true);
              }}
              accessibilityLabel={current ? 'Change relationship' : 'Add relationship'}
            />
          ) : null}
        </View>
      </View>
    );
  }

  const value = choice === OTHER ? custom.trim() : (choice ?? '');

  async function save() {
    setError(undefined);
    setPending(true);
    try {
      await setMemberRelationship(circleId, userId, value);
      setEditing(false);
      onSaved();
    } catch {
      setError('Could not save. Check your connection and try again.');
    } finally {
      setPending(false);
    }
  }

  return (
    <View style={styles.editor}>
      <Select
        label="Relationship"
        value={choice}
        options={RELATIONSHIP_CHOICES}
        onSelect={setChoice}
        placeholder="Not set"
        sheetTitle="How are they related?"
      />
      {choice === OTHER ? (
        <TextInput
          label="Other relationship"
          value={custom}
          onChangeText={setCustom}
          helperText="Whatever your family calls them — Khalo, Step-dad, Godmother."
          maxLength={MAX_RELATIONSHIP_LENGTH}
          autoCapitalize="words"
        />
      ) : null}
      {error ? (
        <Text style={styles.error} accessibilityRole="alert">
          {error}
        </Text>
      ) : null}
      <View style={styles.editorActions}>
        <Button label="Cancel" variant="secondary" onPress={() => setEditing(false)} />
        <Button label="Save" onPress={save} disabled={!value} loading={pending} />
      </View>
    </View>
  );
}

export function MemberDetailScreen({
  circleId,
  userId,
  currentUid,
  onRemoved,
}: MemberDetailScreenProps) {
  const { state, reload } = useFamilyCircleOverview(circleId);

  if (state.status === 'loading') {
    return (
      <View style={[styles.screen, styles.centred]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (state.status === 'error') {
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

  const member =
    state.status === 'ready' ? state.members.find((m) => m.userId === userId) : undefined;

  if (state.status !== 'ready' || !member) {
    return (
      <View style={[styles.screen, styles.centred]}>
        <EmptyState
          icon="person-remove-outline"
          title="No longer a member"
          message="This person is not in your family circle any more."
        />
      </View>
    );
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.identity}>
        <Avatar name={member.displayName} size={80} />
        <Text style={styles.name}>{member.displayName}</Text>
        {userId === currentUid ? <Text style={styles.you}>This is you</Text> : null}
      </View>

      <View style={styles.card}>
        <RelationshipField
          circleId={state.circle.id}
          userId={userId}
          current={member.relationship ?? null}
          canEdit={userId === currentUid || state.circle.ownerId === currentUid}
          onSaved={reload}
        />
        <Detail label="Role" value={member.role === 'owner' ? 'Family owner' : 'Member'} />
        <Detail label="Joined" value={new Date(member.joinedAt).toLocaleDateString()} />
      </View>

      {state.circle.ownerId === currentUid && userId !== currentUid ? (
        <RemoveMember
          circleId={state.circle.id}
          userId={userId}
          displayName={member.displayName}
          onRemoved={onRemoved}
        />
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
  danger: {
    gap: spacing.xs,
  },
  error: {
    ...typography.caption,
    color: colors.error,
  },
  identity: {
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.md,
  },
  name: {
    ...typography.display,
    color: colors.textPrimary,
    textAlign: 'center',
  },
  you: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: cardCornerRadius,
    paddingHorizontal: spacing.sm,
    ...cardShadow,
  },
  detail: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
  },
  detailAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flexShrink: 1,
  },
  editor: {
    gap: spacing.xs,
    paddingVertical: spacing.sm,
  },
  editorActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.xs,
  },
  detailLabel: {
    ...typography.body,
    color: colors.textSecondary,
  },
  detailValue: {
    ...typography.body,
    color: colors.textPrimary,
    flexShrink: 1,
    textAlign: 'right',
  },
});
