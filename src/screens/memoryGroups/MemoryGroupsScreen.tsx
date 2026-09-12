import type { User } from 'firebase/auth';
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Animated, RefreshControl, ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import Svg, { Defs, LinearGradient as SvgLinearGradient, Stop, Rect } from 'react-native-svg';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFamilyCircleMembership } from '../../hooks/useFamilyCircleMembership';
import { useMemoryGroups } from '../../hooks/useMemoryGroups';
import { useGroupMemories } from '../../hooks/useGroupMemories';
import { colors, spacing, typography, cardCornerRadius, cardShadow } from '../../theme';
import { Button } from '../../components/Button';
import type { MemoryGroup, MemoryGroupCategory } from '../../types/memory';

const MEDIA_CARD_HEIGHT = 220;
const MEDIA_CYCLE_INTERVAL_MS = 5000;
const MEDIA_FADE_DURATION_MS = 500;

// Two permanently-mounted layers that swap which is on top, so a source
// change only ever happens on the currently-hidden layer — never on the one
// visibly fading in, which is what caused the post-transition flicker.
function AlbumMediaBackground({ images }: { images: string[] }) {
  const [layerAUri, setLayerAUri] = useState(images[0]);
  const [layerBUri, setLayerBUri] = useState(images[1] ?? images[0]);
  const opacityA = useRef(new Animated.Value(1)).current;
  const opacityB = useRef(new Animated.Value(0)).current;
  const topIsA = useRef(true);
  const nextIndex = useRef(images.length > 1 ? 2 % images.length : 0);

  useEffect(() => {
    setLayerAUri(images[0]);
    setLayerBUri(images[1] ?? images[0]);
    topIsA.current = true;
    nextIndex.current = images.length > 1 ? 2 % images.length : 0;
    opacityA.setValue(1);
    opacityB.setValue(0);
  }, [images, opacityA, opacityB]);

  useEffect(() => {
    if (images.length <= 1) return undefined;
    const interval = setInterval(() => {
      const hidden = topIsA.current ? opacityB : opacityA;
      const visible = topIsA.current ? opacityA : opacityB;
      if (topIsA.current) setLayerBUri(images[nextIndex.current]);
      else setLayerAUri(images[nextIndex.current]);
      nextIndex.current = (nextIndex.current + 1) % images.length;
      topIsA.current = !topIsA.current;

      Animated.timing(hidden, { toValue: 1, duration: MEDIA_FADE_DURATION_MS, useNativeDriver: true }).start();
      Animated.timing(visible, { toValue: 0, duration: MEDIA_FADE_DURATION_MS, useNativeDriver: true }).start();
    }, MEDIA_CYCLE_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [images, opacityA, opacityB]);

  if (!layerAUri) return null;

  return (
    <View style={StyleSheet.absoluteFill}>
      <Animated.View style={[StyleSheet.absoluteFill, { opacity: opacityA }]}>
        <Image source={{ uri: layerAUri }} style={StyleSheet.absoluteFill} contentFit="cover" />
      </Animated.View>
      <Animated.View style={[StyleSheet.absoluteFill, { opacity: opacityB }]}>
        <Image source={{ uri: layerBUri }} style={StyleSheet.absoluteFill} contentFit="cover" />
      </Animated.View>
    </View>
  );
}

function MediaAlbumCard({ group, images, onPress }: { group: MemoryGroup; images: string[]; onPress: () => void }) {
  return (
    <Pressable
      style={({ pressed }) => [styles.mediaCard, pressed && styles.pressed]}
      onPress={onPress}
      accessibilityRole="button"
    >
      <AlbumMediaBackground images={images} />
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <Svg width="100%" height="100%">
          <Defs>
            <SvgLinearGradient id="albumFade" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor="#000000" stopOpacity={0} />
              <Stop offset="1" stopColor="#000000" stopOpacity={0.78} />
            </SvgLinearGradient>
          </Defs>
          <Rect x="0" y="0" width="100%" height="100%" fill="url(#albumFade)" />
        </Svg>
      </View>
      <Text style={styles.mediaCardTitle} numberOfLines={1}>{group.title}</Text>
    </Pressable>
  );
}

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
  const memoriesState = useGroupMemories(group.familyCircleId, group.id);
  const images = useMemo(() => {
    if (memoriesState.status !== 'ready') return [];
    return memoriesState.memories
      .map((memory) => (memory.type === 'photo' ? memory.storageUrl : memory.type === 'video' ? memory.thumbnailUrl : null))
      .filter((uri): uri is string => Boolean(uri))
      .slice(0, 8);
  }, [memoriesState]);

  if (images.length > 0) {
    return <MediaAlbumCard group={group} images={images} onPress={onPress} />;
  }

  return <StaticAlbumCard group={group} onPress={onPress} />;
}

function StaticAlbumCard({ group, onPress }: { group: MemoryGroup; onPress: () => void }) {
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
          Could not load your albums.
        </Text>
      </View>
    );
  }

  const groups = groupsState.status === 'ready' ? groupsState.groups : [];

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Albums</Text>
        {onCreateNew && circleId ? (
          <Pressable
            style={styles.addButton}
            onPress={() => onCreateNew(circleId)}
            accessibilityRole="button"
            accessibilityLabel="Create Album"
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
            <Text style={styles.emptyTitle}>No albums yet</Text>
            <Text style={styles.emptySubtitle}>
              Create a shared album for your next family trip or event.
            </Text>
            {onCreateNew && circleId && (
              <View style={styles.emptyAction}>
                <Button label="Create your first album" onPress={() => onCreateNew(circleId)} />
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
  mediaCard: {
    height: MEDIA_CARD_HEIGHT,
    borderRadius: cardCornerRadius,
    marginBottom: spacing.sm,
    overflow: 'hidden',
    backgroundColor: colors.surface,
    justifyContent: 'flex-end',
    ...cardShadow,
  },
  mediaCardTitle: {
    ...typography.heading,
    color: '#fff',
    padding: spacing.md,
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
