/* eslint-disable react-hooks/set-state-in-effect, react-hooks/refs */
import { Image } from 'expo-image';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  FlatList,
  
  LayoutAnimation,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  UIManager,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import type { User } from 'firebase/auth';
import { useMySpaceMemories } from '../../hooks/useMySpaceMemories';
import { useFamilyCircleMembership } from '../../hooks/useFamilyCircleMembership';
import { useFamilyCircleOverview } from '../../hooks/useFamilyCircleOverview';
import { useMemoryGroups } from '../../hooks/useMemoryGroups';
import { moveMemoryToGroup, uploadBatchedMemories } from '../../services/memories';
import type { Memory } from '../../types/memory';
import { colors, spacing, typography } from '../../theme';
import { BulkUploadScreen, type CategorizedPhoto } from '../upload/BulkUploadScreen';
import { UploadProgressScreen } from '../upload/UploadProgressScreen';
import { ImageViewerModal } from '../../components/ImageViewerModal';
import { RefreshControl } from 'react-native';

interface TimelineScreenProps {
  user: User;
}

const numColumns = 3;
const screenWidth = Dimensions.get('window').width;
const imageSize = screenWidth / numColumns;

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export function TimelineScreen({ user }: TimelineScreenProps) {
  const { state: membershipState } = useFamilyCircleMembership(user);
  const circleId = membershipState.status === 'ready' ? membershipState.circleId : null;
  const { state: overviewState } = useFamilyCircleOverview(circleId);
  const groupsState = useMemoryGroups(circleId);
  const memoriesState = useMySpaceMemories(user.uid, circleId);

  const [selectedMemory, setSelectedMemory] = useState<Memory | null>(null);
  const [viewingMemory, setViewingMemory] = useState<Memory | null>(null);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [refreshing, setRefreshing] = useState(false);

  function toggleSelection(id: string) {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    if (next.size === 0) setSelectionMode(false);
    setSelectedIds(next);
  }

  const onRefresh = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1000);
  };

  const [moving, setMoving] = useState(false);

  // Bulk Upload State
  const [uploadMode, setUploadMode] = useState<'idle' | 'selecting' | 'uploading' | 'done'>('idle');
  const [uploadProgress, setUploadProgress] = useState({ current: 0, total: 0 });

  // Pop animation: trigger LayoutAnimation when memory count changes
  const prevCountRef = useRef(0);
  useEffect(() => {
    if (memoriesState.status === 'ready') {
      const newCount = memoriesState.memories.length;
      if (newCount > prevCountRef.current) {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.spring);
      }
      prevCountRef.current = newCount;
    }
  }, [memoriesState]);

  // Scale animation for the FAB
  const fabScale = useRef(new Animated.Value(1)).current;
  function animateFab() {
    Animated.sequence([
      Animated.timing(fabScale, { toValue: 0.85, duration: 80, useNativeDriver: true }),
      Animated.spring(fabScale, { toValue: 1, friction: 3, useNativeDriver: true }),
    ]).start();
  }

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

  async function handleStartUpload(photos: CategorizedPhoto[]) {
    if (!circleId) return;
    setUploadMode('uploading');
    setUploadProgress({ current: 0, total: photos.length });

    try {
      await uploadBatchedMemories(
        user,
        circleId,
        photos.map((p) => ({
          uri: p.uri,
          groupId: p.selectedGroupId,
          takenAtMs: p.creationTimeMs,
        })),
        (current, total) => setUploadProgress({ current, total }),
      );
      setUploadMode('done');
      // Auto-dismiss after 2 seconds
      setTimeout(() => setUploadMode('idle'), 2000);
    } catch (e) {
      console.error('Upload failed', e);
      setUploadMode('idle');
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
  const photoCount = memories.length;

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>My Space</Text>
          <Text style={styles.headerSubtitle}>
            {photoCount === 0
              ? 'Your private collection'
              : `${photoCount} ${photoCount === 1 ? 'memory' : 'memories'}`}
          </Text>
        </View>
        <Ionicons name="lock-closed" size={18} color={colors.sageIcon} />
      </View>

      <FlatList
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
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
        renderItem={({ item }) => {
          const isSelected = selectedIds.has(item.id);
          const group = groups.find(g => g.id === item.memoryGroupId);
          return (
          <Pressable
            style={[styles.imageContainer, isSelected && { opacity: 0.7, borderWidth: 2, borderColor: colors.primary }]}
            onLongPress={() => { setSelectionMode(true); toggleSelection(item.id); }}
            onPress={() => {
              if (selectionMode) {
                toggleSelection(item.id);
              } else {
                setViewingMemory(item);
              }
            }}
            delayLongPress={250}
          >
            <Image
              source={{ uri: item.thumbnailUrl ?? item.storageUrl }}
              style={styles.image}
              contentFit="cover" transition={200} cachePolicy="memory-disk"
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
            {isSelected && (
              <View style={[styles.iconOverlay, { backgroundColor: colors.primary, borderRadius: 12, padding: 2 }]}>
                <Ionicons name="checkmark" size={20} color="#fff" />
              </View>
            )}
            {group?.icon && !isSelected && (
              <View style={[styles.iconOverlay, { top: 4, left: 4, right: undefined, backgroundColor: 'rgba(255,255,255,0.8)', padding: 2, borderRadius: 12 }]}>
                <Text style={{ fontSize: 16 }}>{group.icon}</Text>
              </View>
            )}
          </Pressable>
          );
        }}
      />
      <ImageViewerModal
        memories={memories}
        initialMemoryId={viewingMemory?.id ?? null}
        onClose={() => setViewingMemory(null)}
        showDetails={false}
      />

      <Animated.View style={[styles.fab, { transform: [{ scale: fabScale }] }]}>
        <Pressable
          style={styles.fabInner}
          onPress={() => {
            animateFab();
            setUploadMode('selecting');
          }}
          accessibilityRole="button"
          accessibilityLabel="Bulk Upload Photos"
        >
          <Ionicons name="images" size={24} color={colors.textOnAccent} />
        </Pressable>
      </Animated.View>

      <Modal visible={uploadMode === 'selecting'} animationType="slide">
        <BulkUploadScreen
          user={user}
          onCancel={() => setUploadMode('idle')}
          onUpload={handleStartUpload}
        />
      </Modal>

      <Modal visible={uploadMode === 'uploading' || uploadMode === 'done'} animationType="fade">
        {uploadMode === 'done' ? (
          <View style={[styles.screen, styles.centered]}>
            <Ionicons name="checkmark-circle" size={64} color={colors.success} />
            <Text style={styles.successTitle}>Upload Complete!</Text>
            <Text style={styles.successSubtitle}>
              {uploadProgress.total} {uploadProgress.total === 1 ? 'memory' : 'memories'} added
            </Text>
          </View>
        ) : (
          <UploadProgressScreen current={uploadProgress.current} total={uploadProgress.total} />
        )}
      </Modal>

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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.xs,
    paddingBottom: spacing.sm,
  },
  title: {
    ...typography.heading,
    color: colors.textPrimary,
  },
  headerSubtitle: {
    ...typography.label,
    color: colors.textSecondary,
    marginTop: 2,
  },
  centered: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
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
  fab: {
    position: 'absolute',
    bottom: spacing.lg,
    right: spacing.lg,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  fabInner: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  successTitle: {
    ...typography.heading,
    color: colors.textPrimary,
  },
  successSubtitle: {
    ...typography.body,
    color: colors.textSecondary,
  },
});
