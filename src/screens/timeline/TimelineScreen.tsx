import { useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  Image,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import type { User } from 'firebase/auth';
import { useMySpaceMemories } from '../../hooks/useMySpaceMemories';
import { useFamilyCircleMembership } from '../../hooks/useFamilyCircleMembership';
import { useMemoryGroups } from '../../hooks/useMemoryGroups';
import { moveMemoryToGroup } from '../../services/memories';
import type { Memory } from '../../types/memory';
import { colors, spacing, typography } from '../../theme';

interface TimelineScreenProps {
  user: User;
}

const numColumns = 3;
const screenWidth = Dimensions.get('window').width;
const imageSize = screenWidth / numColumns;

export function TimelineScreen({ user }: TimelineScreenProps) {
  const memoriesState = useMySpaceMemories(user.uid);
  const { state: membershipState } = useFamilyCircleMembership(user);
  const circleId = membershipState.status === 'ready' ? membershipState.circleId : null;
  const groupsState = useMemoryGroups(circleId);

  const [selectedMemory, setSelectedMemory] = useState<Memory | null>(null);
  const [moving, setMoving] = useState(false);

  async function handleMove(groupId: string) {
    if (!selectedMemory) return;
    setMoving(true);
    try {
      await moveMemoryToGroup(selectedMemory.id, groupId);
      setSelectedMemory(null);
    } catch (e) {
      console.error('Failed to move memory:', e);
    } finally {
      setMoving(false);
    }
  }

  if (memoriesState.status === 'loading') {
    return (
      <View style={[styles.screen, styles.centered]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (memoriesState.status === 'error') {
    return (
      <View style={[styles.screen, styles.centered]}>
        <Text style={styles.emptyTitle}>Could not load My Space.</Text>
      </View>
    );
  }

  const { memories } = memoriesState;
  const groups = groupsState.status === 'ready' ? groupsState.groups : [];

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>My Space</Text>
      </View>

      <FlatList
        data={memories}
        numColumns={numColumns}
        keyExtractor={(item) => item.id}
        contentContainerStyle={memories.length === 0 ? styles.emptyContainer : null}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="lock-closed-outline" size={48} color={colors.textSecondary} />
            <Text style={styles.emptyTitle}>Your private space</Text>
            <Text style={styles.emptySubtitle}>
              Memories you capture will appear here privately until you move them to a group.
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <Pressable
            style={styles.imageContainer}
            onLongPress={() => setSelectedMemory(item)}
            delayLongPress={250}
          >
            <Image
              source={{ uri: item.thumbnailUrl ?? item.storageUrl }}
              style={styles.image}
              resizeMode="cover"
            />
            {item.type === 'video' && (
              <View style={styles.iconOverlay}>
                <Ionicons name="play-circle" size={24} color="#fff" />
              </View>
            )}
            {item.type === 'voice' && (
              <View style={styles.iconOverlay}>
                <Ionicons name="mic" size={24} color="#fff" />
              </View>
            )}
          </Pressable>
        )}
      />

      <Modal
        visible={!!selectedMemory}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedMemory(null)}
      >
        <Pressable style={styles.modalBackdrop} onPress={() => setSelectedMemory(null)} />
        <View style={styles.modalSheet}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Move to Memory Group</Text>
            <Pressable onPress={() => setSelectedMemory(null)} style={styles.closeButton}>
              <Ionicons name="close" size={24} color={colors.textPrimary} />
            </Pressable>
          </View>

          {groups.length === 0 ? (
            <Text style={styles.noGroupsText}>You don&apos;t have any Memory Groups yet.</Text>
          ) : (
            <FlatList
              data={groups}
              keyExtractor={(g) => g.id}
              renderItem={({ item }) => (
                <Pressable
                  style={styles.groupRow}
                  onPress={() => handleMove(item.id)}
                  disabled={moving}
                >
                  <Ionicons name="albums-outline" size={24} color={colors.textPrimary} />
                  <Text style={styles.groupTitle}>{item.title}</Text>
                  <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
                </Pressable>
              )}
            />
          )}
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.xs,
    paddingBottom: spacing.sm,
  },
  title: {
    ...typography.heading,
    color: colors.textPrimary,
  },
  centered: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyContainer: {
    flex: 1,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
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
  imageContainer: {
    width: imageSize,
    height: imageSize,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.background,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  iconOverlay: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 12,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalSheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: spacing.md,
    maxHeight: '60%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  modalTitle: {
    ...typography.heading,
    color: colors.textPrimary,
  },
  closeButton: {
    padding: spacing.xs,
  },
  noGroupsText: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    paddingVertical: spacing.xl,
  },
  groupRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
    gap: spacing.sm,
  },
  groupTitle: {
    ...typography.body,
    color: colors.textPrimary,
    flex: 1,
  },
});
