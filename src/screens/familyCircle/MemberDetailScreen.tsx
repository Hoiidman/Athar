import { useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Avatar } from '../../components/Avatar';
import { Button } from '../../components/Button';
import { EmptyState } from '../../components/EmptyState';
import { TextInput } from '../../components/TextInput';
import { useFamilyCircleOverview } from '../../hooks/useFamilyCircleOverview';
import { MAX_RELATIONSHIP_LENGTH, setMemberRelationship } from '../../services/familyCircles';
import { colors, spacing, typography } from '../../theme';

interface MemberDetailScreenProps {
  circleId: string | null;
  userId: string;
  currentUid: string;
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.detail}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
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
  const [value, setValue] = useState(current ?? '');
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
                setValue(current ?? '');
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
      <TextInput
        label="Relationship"
        value={value}
        onChangeText={setValue}
        error={error}
        helperText="How this person is related — Dad, Grandma, Sister."
        maxLength={MAX_RELATIONSHIP_LENGTH}
        autoCapitalize="words"
      />
      <View style={styles.editorActions}>
        <Button label="Cancel" variant="secondary" onPress={() => setEditing(false)} />
        <Button label="Save" onPress={save} loading={pending} />
      </View>
    </View>
  );
}

export function MemberDetailScreen({ circleId, userId, currentUid }: MemberDetailScreenProps) {
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
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: spacing.sm,
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
