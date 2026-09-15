import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../../hooks/useAuth';
import { useFamilyCircleMembership } from '../../hooks/useFamilyCircleMembership';
import { useMemoryGroups } from '../../hooks/useMemoryGroups';
import { searchMemories, type SearchResultMemory } from '../../services/ai';
import type { Memory } from '../../types/memory';
import { cardCornerRadius, cardShadow, colors, spacing, typography } from '../../theme';
import { SearchInput } from '../../components/SearchInput';
import { EmptyState } from '../../components/EmptyState';
import { ImageViewerModal } from '../../components/ImageViewerModal';

type SearchState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; results: SearchResultMemory[] };

const THUMBNAIL_SIZE = 72;

// ImageViewerModal only ever reads id/storageUrl/type/memoryGroupId off each
// item (plus `groups` to resolve a display label) — every other Memory field
// below is an unused placeholder so a search result can be adapted into the
// same viewer without a second, parallel component.
function toMemory(result: SearchResultMemory, familyCircleId: string): Memory {
  return {
    id: result.id,
    familyCircleId,
    memoryGroupId: result.memoryGroupId,
    visibility: 'shared',
    type: result.type,
    storageUrl: result.storageUrl,
    thumbnailUrl: result.thumbnailUrl,
    durationSeconds: null,
    takenAt: result.takenAt,
    uploadedBy: '',
    caption: null,
    transcript: null,
    aiStory: result.aiStory,
    aiStatus: 'success',
    categorizationMethod: 'auto',
    includeInSlideshow: true,
    createdAt: 0,
    updatedAt: 0,
  };
}

export function SearchScreen() {
  const navigation = useNavigation();
  const { user } = useAuth();
  const { state: membershipState } = useFamilyCircleMembership(user);
  const circleId = membershipState.status === 'ready' ? membershipState.circleId : null;
  const groupsState = useMemoryGroups(circleId);
  const groups = groupsState.status === 'ready' ? groupsState.groups : [];

  const [query, setQuery] = useState('');
  const [state, setState] = useState<SearchState>({ status: 'idle' });
  const [viewingMemory, setViewingMemory] = useState<Memory | null>(null);

  async function handleSubmit() {
    const trimmed = query.trim();
    if (!trimmed || !circleId) return;

    setState({ status: 'loading' });
    try {
      const results = await searchMemories(trimmed, circleId);
      setState({ status: 'ready', results });
    } catch (e) {
      console.error('Search failed', e);
      const message = 'Something went wrong searching your memories. Please try again.';
      setState({ status: 'error', message });
      Alert.alert('Search failed', message);
    }
  }

  const memories = state.status === 'ready' ? state.results.map((r) => toMemory(r, circleId ?? '')) : [];

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={8}>
          <Ionicons name="close" size={26} color={colors.textPrimary} />
        </Pressable>
        <Text style={styles.title}>Search</Text>
        <View style={{ width: 26 }} />
      </View>

      <View style={styles.searchBar}>
        <SearchInput
          value={query}
          onChangeText={setQuery}
          onSubmit={handleSubmit}
          placeholder="Try 'grandma birthday'"
        />
      </View>

      {state.status === 'loading' && (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      )}

      {state.status === 'error' && (
        <View style={styles.emptyWrap}>
          <EmptyState
            tone="error"
            icon="alert-circle-outline"
            title="Search failed"
            message={state.message}
          />
        </View>
      )}

      {state.status === 'ready' && state.results.length === 0 && (
        <View style={styles.emptyWrap}>
          <EmptyState
            icon="search-outline"
            title="No matches"
            message="Try a different phrase, like who's in the photo or what the occasion was."
          />
        </View>
      )}

      {state.status === 'ready' && state.results.length > 0 && (
        <FlatList
          data={state.results}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          ItemSeparatorComponent={() => <View style={{ height: spacing.xs }} />}
          renderItem={({ item }) => (
            <Pressable
              style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
              onPress={() => setViewingMemory(toMemory(item, circleId ?? ''))}
            >
              <View style={styles.thumbnailWrap}>
                <Image
                  source={{ uri: item.thumbnailUrl ?? item.storageUrl }}
                  style={styles.thumbnail}
                  contentFit="cover"
                  transition={200}
                  cachePolicy="memory-disk"
                />
                {item.type === 'video' && (
                  <View style={styles.iconOverlay}>
                    <Ionicons name="play-circle" size={20} color="#fff" />
                  </View>
                )}
                {item.type === 'voice' && (
                  <View style={styles.iconOverlay}>
                    <Ionicons name="mic" size={20} color="#fff" />
                  </View>
                )}
              </View>
              <Text
                style={[styles.caption, !item.aiStory && styles.captionMuted]}
                numberOfLines={3}
              >
                {item.aiStory ?? 'No description yet'}
              </Text>
            </Pressable>
          )}
        />
      )}

      <ImageViewerModal
        memories={memories}
        initialMemoryId={viewingMemory?.id ?? null}
        onClose={() => setViewingMemory(null)}
        groups={groups}
      />
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
  searchBar: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyWrap: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
  },
  list: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: cardCornerRadius,
    padding: spacing.xs,
    ...cardShadow,
  },
  rowPressed: {
    opacity: 0.7,
  },
  thumbnailWrap: {
    width: THUMBNAIL_SIZE,
    height: THUMBNAIL_SIZE,
    borderRadius: 8,
    overflow: 'hidden',
  },
  thumbnail: {
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
  caption: {
    ...typography.body,
    color: colors.textPrimary,
    flex: 1,
  },
  captionMuted: {
    color: colors.textSecondary,
    fontStyle: 'italic',
  },
});
