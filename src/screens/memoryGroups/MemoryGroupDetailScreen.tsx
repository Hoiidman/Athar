import React, { useState } from "react";
import { Image } from 'expo-image';
import { RefreshControl, Pressable,
  ActivityIndicator,
  Dimensions,
  FlatList,
  
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useGroupMemories } from '../../hooks/useGroupMemories';
import { useMemoryGroups } from '../../hooks/useMemoryGroups';
import { useEffect } from "react";
import { useFamilyCircleOverview } from '../../hooks/useFamilyCircleOverview';
import { colors, spacing, typography } from '../../theme';
import { ImageViewerModal } from '../../components/ImageViewerModal';
import type { Memory } from '../../types/memory';

interface MemoryGroupDetailScreenProps {
  navigation?: any;
  groupId: string;
  circleId: string;
}

const numColumns = 3;
const screenWidth = Dimensions.get('window').width;
const imageSize = screenWidth / numColumns;

export function MemoryGroupDetailScreen({ groupId, circleId, navigation }: MemoryGroupDetailScreenProps) {
  const memoriesState = useGroupMemories(circleId, groupId);
  const groupsState = useMemoryGroups(circleId);
  const group = groupsState.status === "ready" ? groupsState.groups.find(g => g.id === groupId) : null;

  useEffect(() => {
    if (navigation && group) {
      navigation.setOptions({
        headerRight: () => (
          <Pressable onPress={() => navigation.navigate("CreateMemoryGroup", { circleId, initialGroup: group })}>
            <Ionicons name="settings-outline" size={24} color={colors.primary} />
          </Pressable>
        )
      });
    }
  }, [navigation, group, circleId]);
  const { state: overviewState } = useFamilyCircleOverview(circleId);
  const [refreshing, setRefreshing] = useState(false);
  const [viewingMemory, setViewingMemory] = useState<Memory | null>(null);

  const onRefresh = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1000);
  };

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
        <Text style={styles.emptyTitle}>Could not load memories.</Text>
      </View>
    );
  }

  const { memories } = memoriesState;

  return (
    <SafeAreaView style={styles.screen} edges={['bottom']}>
      <FlatList
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        data={memories}
        numColumns={numColumns}
        keyExtractor={(item) => item.id}
        contentContainerStyle={memories.length === 0 ? styles.emptyContainer : null}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="images-outline" size={48} color={colors.textSecondary} />
            <Text style={styles.emptyTitle}>No memories yet</Text>
            <Text style={styles.emptySubtitle}>
              Photos and videos added to this group will appear here.
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <Pressable style={styles.imageContainer} onPress={() => setViewingMemory(item)}>
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
          </Pressable>
        )}
      />
      <ImageViewerModal
        memories={memoriesState.status === 'ready' ? memoriesState.memories : []}
        initialMemoryId={viewingMemory?.id ?? null}
        onClose={() => setViewingMemory(null)}
        showDetails={true}
        getUploaderName={(uid) => {
          if (overviewState.status === 'ready') {
            const member = overviewState.members.find(m => m.userId === uid);
            return member?.displayName ?? uid;
          }
          return uid;
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
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
});
