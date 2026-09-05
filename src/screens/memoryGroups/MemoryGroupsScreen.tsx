import type { User } from 'firebase/auth';
import React, { useState } from "react";
import { RefreshControl, ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFamilyCircleMembership } from '../../hooks/useFamilyCircleMembership';
import { useMemoryGroups } from '../../hooks/useMemoryGroups';
import { colors, spacing, typography, cardCornerRadius, cardShadow } from '../../theme';
import { Button } from '../../components/Button';
import type { MemoryGroup, MemoryGroupCategory } from '../../types/memory';

interface MemoryGroupsScreenProps {
  user: User;
  onCreateNew?: (circleId: string) => void;
  onOpenGroup?: (groupId: string, circleId: string) => void;
}

const CATEGORY_ICONS: Record<MemoryGroupCategory, keyof typeof Ionicons.glyphMap> = {
  vacation: 'airplane',
  event: 'calendar',
  holiday: 'partly-sunny',
  other: 'albums',
};

function GroupCard({ group, onPress }: { group: MemoryGroup; onPress: () => void }) {
  const start = new Date(group.startDate).toLocaleDateString();
  const end = new Date(group.endDate).toLocaleDateString();
  const dates = start === end ? start : `${start} — ${end}`;
  const iconName = group.category ? CATEGORY_ICONS[group.category] : 'albums-outline';

  return (
    <Pressable
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
      onPress={onPress}
      accessibilityRole="button"
    >
      <View style={styles.cardHeader}>
        <View style={styles.titleRow}>
          <View style={styles.iconContainer}>
            <Ionicons name={iconName} size={20} color={colors.sageIcon} />
          </View>
          <Text style={styles.cardTitle}>{group.title}</Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color={colors.uiIcon} />
      </View>
      <Text style={styles.cardDates}>{dates}</Text>
      <Text style={styles.cardMembers}>
        {group.memberIds.length} {group.memberIds.length === 1 ? 'member' : 'members'}
      </Text>
    </Pressable>
  );
}

export function MemoryGroupsScreen({ user, onCreateNew, onOpenGroup }: MemoryGroupsScreenProps) {
  const { state: membershipState } = useFamilyCircleMembership(user);
  const circleId = membershipState.status === 'ready' ? membershipState.circleId : null;

  const groupsState = useMemoryGroups(circleId);
  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = () => { setRefreshing(true); setTimeout(() => setRefreshing(false), 1000); };

  if (membershipState.status === 'loading' || groupsState.status === 'loading') {
    return (
      <View style={[styles.screen, styles.centred]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (membershipState.status === 'error' || groupsState.status === 'error') {
    return (
      <View style={[styles.screen, styles.centred]}>
        <Text style={styles.message} accessibilityRole="alert">
          Could not load your memory groups.
        </Text>
      </View>
    );
  }

  const groups = groupsState.status === 'ready' ? groupsState.groups : [];

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Memory Groups</Text>
        {onCreateNew && circleId ? (
          <Pressable
            style={styles.addButton}
            onPress={() => onCreateNew(circleId)}
            accessibilityRole="button"
            accessibilityLabel="Create Memory Group"
          >
            <Ionicons name="add" size={24} color={colors.surface} />
          </Pressable>
        ) : null}
      </View>

      <FlatList
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        data={groups}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="albums-outline" size={48} color={colors.textSecondary} />
            <Text style={styles.emptyTitle}>No groups yet</Text>
            <Text style={styles.emptySubtitle}>
              Create a shared memory group for your next family trip or event.
            </Text>
            {onCreateNew && circleId && (
              <View style={styles.emptyAction}>
                <Button label="Create your first group" onPress={() => onCreateNew(circleId)} />
              </View>
            )}
          </View>
        }
        renderItem={({ item }) => (
          <GroupCard group={item} onPress={() => onOpenGroup?.(item.id, circleId as string)} />
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  centred: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  message: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.xs,
    paddingBottom: spacing.md,
  },
  title: {
    ...typography.display,
    color: colors.textPrimary,
  },
  addButton: {
    backgroundColor: colors.primary,
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.xl,
    flexGrow: 1,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: cardCornerRadius,
    padding: spacing.md,
    marginBottom: spacing.sm,
    ...cardShadow,
  },
  pressed: {
    opacity: 0.7,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.xs,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: spacing.sm,
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.sm,
  },
  cardTitle: {
    ...typography.heading,
    color: colors.textPrimary,
    flex: 1,
  },
  cardDates: {
    ...typography.body,
    color: colors.textSecondary,
    marginBottom: spacing.xs / 2,
  },
  cardMembers: {
    ...typography.label,
    color: colors.textSecondary,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xl,
    gap: spacing.sm,
  },
  emptyTitle: {
    ...typography.heading,
    color: colors.textPrimary,
    marginTop: spacing.sm,
  },
  emptySubtitle: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  emptyAction: {
    marginTop: spacing.md,
    width: '100%',
  },
});
