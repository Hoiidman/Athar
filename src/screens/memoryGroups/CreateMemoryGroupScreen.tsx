import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Avatar } from '../../components/Avatar';
import { Button } from '../../components/Button';
import { TextInput } from '../../components/TextInput';
import { useFamilyCircleOverview } from '../../hooks/useFamilyCircleOverview';
import { cardCornerRadius, colors, minTapTarget, spacing, typography } from '../../theme';
import type { User } from 'firebase/auth';
import { createMemoryGroup } from '../../services/memoryGroups';

interface CreateMemoryGroupScreenProps {
  user: User;
  circleId: string | null;
  onCancel?: () => void;
  onContinue?: (groupId: string) => void;
}

export function CreateMemoryGroupScreen({
  user,
  circleId,
  onCancel,
  onContinue,
}: CreateMemoryGroupScreenProps) {
  const { state: overviewState } = useFamilyCircleOverview(circleId);

  const [title, setTitle] = useState('');
  const [titleError, setTitleError] = useState<string>();
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(new Date());
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);
  const [selectedMembers, setSelectedMembers] = useState<Set<string>>(new Set());
  const [formError, setFormError] = useState<string>();
  const [submitting, setSubmitting] = useState(false);

  function toggleMember(userId: string) {
    const next = new Set(selectedMembers);
    if (next.has(userId)) {
      next.delete(userId);
    } else {
      next.add(userId);
    }
    setSelectedMembers(next);
  }

  async function handleSubmit() {
    const trimmedTitle = title.trim();
    const nextTitleError = trimmedTitle ? undefined : 'Enter a title for this group.';
    setTitleError(nextTitleError);
    setFormError(undefined);

    if (nextTitleError) return;

    if (startDate > endDate) {
      setFormError('Start date must be before or equal to the end date.');
      return;
    }

    if (selectedMembers.size === 0) {
      setFormError('Select at least one member for this group.');
      return;
    }

    if (!circleId) {
      setFormError('Family circle is missing.');
      return;
    }

    setSubmitting(true);
    try {
      const groupId = await createMemoryGroup(user, circleId, {
        title: trimmedTitle,
        startDate: startDate.getTime(),
        endDate: endDate.getTime(),
        memberIds: Array.from(selectedMembers),
      });
      if (onContinue) {
        onContinue(groupId);
      }
    } catch {
      setFormError('Could not create memory group. Check your connection.');
    } finally {
      setSubmitting(false);
    }
  }

  const renderMemberPicker = () => {
    if (overviewState.status === 'loading') {
      return (
        <View style={styles.loadingBox}>
          <ActivityIndicator color={colors.primary} />
        </View>
      );
    }

    if (overviewState.status !== 'ready') {
      return <Text style={styles.placeholderText}>Could not load family members.</Text>;
    }

    return (
      <View style={styles.membersList}>
        {overviewState.members.map((member) => {
          const isSelected = selectedMembers.has(member.userId);
          return (
            <Pressable
              key={member.userId}
              onPress={() => toggleMember(member.userId)}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: isSelected }}
              style={({ pressed }) => [styles.memberRow, pressed && styles.pressed]}
            >
              <Avatar name={member.displayName} />
              <Text style={styles.memberName}>{member.displayName}</Text>
              <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
                {isSelected ? <Ionicons name="checkmark" size={16} color={colors.surface} /> : null}
              </View>
            </Pressable>
          );
        })}
      </View>
    );
  };

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
          <Text style={styles.title}>New Memory Group</Text>
          <Text style={styles.subtitle}>
            Create a shared space for an event, trip, or time period.
          </Text>
        </View>

        <View style={styles.form}>
          {formError ? (
            <View style={styles.banner} accessibilityRole="alert">
              <Text style={styles.bannerText}>{formError}</Text>
            </View>
          ) : null}

          <TextInput
            label="Title"
            value={title}
            onChangeText={setTitle}
            error={titleError}
            placeholder="e.g. Summer Vacation 2026"
            maxLength={80}
            returnKeyType="done"
            editable={!submitting}
          />

          <View style={styles.dateRow}>
            <View style={styles.dateField}>
              <Text style={styles.label}>Start Date</Text>
              <Pressable
                onPress={() => setShowStartPicker(true)}
                style={styles.dateButton}
                disabled={submitting}
              >
                <Text style={styles.dateText}>{startDate.toLocaleDateString()}</Text>
                <Ionicons name="calendar-outline" size={20} color={colors.uiIcon} />
              </Pressable>
              {showStartPicker && (
                <DateTimePicker
                  value={startDate}
                  mode="date"
                  display="default"
                  onChange={(_, date) => {
                    setShowStartPicker(Platform.OS === 'ios');
                    if (date) setStartDate(date);
                  }}
                />
              )}
            </View>

            <View style={styles.dateField}>
              <Text style={styles.label}>End Date</Text>
              <Pressable
                onPress={() => setShowEndPicker(true)}
                style={styles.dateButton}
                disabled={submitting}
              >
                <Text style={styles.dateText}>{endDate.toLocaleDateString()}</Text>
                <Ionicons name="calendar-outline" size={20} color={colors.uiIcon} />
              </Pressable>
              {showEndPicker && (
                <DateTimePicker
                  value={endDate}
                  mode="date"
                  display="default"
                  onChange={(_, date) => {
                    setShowEndPicker(Platform.OS === 'ios');
                    if (date) setEndDate(date);
                  }}
                />
              )}
            </View>
          </View>

          <View style={styles.membersSection}>
            <Text style={styles.label}>Who is included?</Text>
            {renderMemberPicker()}
          </View>

          <View style={styles.action}>
            <Button label="Create memory group" onPress={handleSubmit} loading={submitting} />
            {onCancel ? (
              <Button label="Cancel" variant="secondary" onPress={onCancel} disabled={submitting} />
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
  content: {
    flexGrow: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xl,
    gap: spacing.lg,
  },
  header: {
    alignItems: 'flex-start',
    gap: spacing.xs,
  },
  title: {
    ...typography.display,
    color: colors.textPrimary,
  },
  subtitle: {
    ...typography.body,
    color: colors.textSecondary,
  },
  form: {
    gap: spacing.lg,
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
  label: {
    ...typography.label,
    color: colors.textPrimary,
    marginBottom: spacing.xs / 2,
  },
  dateRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  dateField: {
    flex: 1,
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: minTapTarget,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    backgroundColor: colors.surface,
  },
  dateText: {
    ...typography.body,
    color: colors.textPrimary,
  },
  membersSection: {
    gap: spacing.xs,
  },
  loadingBox: {
    minHeight: 100,
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    ...typography.body,
    color: colors.textSecondary,
  },
  membersList: {
    backgroundColor: colors.surface,
    borderRadius: cardCornerRadius,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
    gap: spacing.sm,
  },
  memberName: {
    ...typography.body,
    color: colors.textPrimary,
    flex: 1,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  pressed: {
    opacity: 0.7,
  },
  action: {
    marginTop: spacing.md,
    gap: spacing.xs,
  },
});
