import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';
import { useVideoPlayer, VideoView } from 'expo-video';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../navigation/RootStackNavigator';
import { CaptureItem, useCaptureSessionStore } from '../../store/captureSessionStore';
import { colors, spacing, typography } from '../../theme';

/* ------------------------------------------------------------------ *
 * Constants
 * ------------------------------------------------------------------ */

// A full screen modal does not always report insets, and without a floor the
// buttons land under the status bar where they cannot be tapped.
const MIN_TOP_INSET = 16;
const MIN_BOTTOM_INSET = 12;

const SWIPE_CHANGE_DISTANCE = 60;
const SWIPE_CLOSE_DISTANCE = 130;

// How far the stage can travel downwards, and how much of the drag past the
// close threshold actually lands, so the screen never leaves a gap behind it.
const MAX_DOWN_DRAG = 200;
const DRAG_RESISTANCE = 0.25;

const FRAME_SIZE = 56;

function dampDown(value: number) {
  if (value <= 0) return 0;
  if (value <= SWIPE_CLOSE_DISTANCE) return value;
  const past = (value - SWIPE_CLOSE_DISTANCE) * DRAG_RESISTANCE;
  return Math.min(SWIPE_CLOSE_DISTANCE + past, MAX_DOWN_DRAG);
}

/* ------------------------------------------------------------------ *
 * Pieces
 * ------------------------------------------------------------------ */

/**
 * Neighbours only exist to be swiped onto, so a video keeps a poster rather
 * than spinning up a second player alongside the one on screen.
 */
function StaticMedia({ item }: { item: CaptureItem }) {
  if (item.kind === 'video') {
    return (
      <View style={[StyleSheet.absoluteFill, styles.poster]}>
        <Ionicons name="play" size={44} color={colors.surface} />
      </View>
    );
  }
  return (
    <Image source={{ uri: item.uri }} style={StyleSheet.absoluteFill} resizeMode="contain" />
  );
}

/** Sits behind the stage and is uncovered as the preview is dragged down. */
function DiscardLayer({ drag }: { drag: Animated.Value }) {
  const progress = drag.interpolate({
    inputRange: [0, SWIPE_CLOSE_DISTANCE],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });

  return (
    <View style={styles.discardLayer} pointerEvents="none">
      <Animated.View
        style={[styles.discardBadge, { opacity: progress, transform: [{ scale: progress }] }]}
      >
        <Ionicons name="trash-outline" size={30} color={colors.surface} />
        <Text style={styles.discardText}>Discard</Text>
      </Animated.View>
    </View>
  );
}

interface TopBarProps {
  topInset: number;
  position: number;
  total: number;
  onClose: () => void;
  onDelete: () => void;
}

function TopBar({ topInset, position, total, onClose, onDelete }: TopBarProps) {
  return (
    <View
      style={[styles.topBar, { paddingTop: Math.max(topInset, MIN_TOP_INSET) }]}
      pointerEvents="box-none"
    >
      <Pressable style={styles.roundButton} hitSlop={12} onPress={onClose}>
        <Ionicons name="close" size={26} color={colors.surface} />
      </Pressable>

      <View style={styles.counter}>
        <Text style={styles.counterText}>
          {position} / {total}
        </Text>
      </View>

      <Pressable style={styles.roundButton} hitSlop={12} onPress={onDelete}>
        <Ionicons name="trash-outline" size={22} color={colors.surface} />
      </Pressable>
    </View>
  );
}

interface CarouselProps {
  items: CaptureItem[];
  selectedId: string;
  onSelect: (id: string) => void;
}

function Carousel({ items, selectedId, onSelect }: CarouselProps) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.strip}
    >
      {items.map((item) => (
        <Pressable key={item.id} onPress={() => onSelect(item.id)}>
          {item.kind === 'photo' ? (
            <Image
              source={{ uri: item.uri }}
              style={[styles.frame, item.id === selectedId && styles.frameActive]}
            />
          ) : (
            <View
              style={[
                styles.frame,
                styles.frameVideo,
                item.id === selectedId && styles.frameActive,
              ]}
            >
              <Ionicons name="play" size={18} color={colors.surface} />
            </View>
          )}
        </Pressable>
      ))}
    </ScrollView>
  );
}

/* ------------------------------------------------------------------ *
 * Screen
 * ------------------------------------------------------------------ */

type Props = NativeStackScreenProps<RootStackParamList, 'MediaPreview'>;

export function MediaPreviewScreen({ route, navigation }: Props) {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  const items = useCaptureSessionStore((state) => state.items);
  const removeItem = useCaptureSessionStore((state) => state.removeItem);

  // Newest first, so the shot you just took reads as 1 of 3.
  const ordered = useMemo(() => items.filter((item) => item.kind !== 'audio').reverse(), [items]);

  const [selectedId, setSelectedId] = useState(route.params.itemId);

  const index = Math.max(
    0,
    ordered.findIndex((item) => item.id === selectedId),
  );
  const selected = ordered[index];

  const dragX = useRef(new Animated.Value(0)).current;
  const dragY = useRef(new Animated.Value(0)).current;

  // Passing null for a photo keeps the hook order stable without loading
  // anything the player does not need.
  const player = useVideoPlayer(selected?.kind === 'video' ? selected.uri : null, (instance) => {
    instance.loop = true;
    instance.play();
  });

  // Snapping back to centre has to happen in the same commit that renders the
  // new selection, or the old image shows for a frame at the reset offset.
  useLayoutEffect(() => {
    dragX.setValue(0);
    dragY.setValue(0);
  }, [selectedId, dragX, dragY]);

  function springHome() {
    Animated.parallel([
      Animated.spring(dragX, { toValue: 0, friction: 8, tension: 80, useNativeDriver: false }),
      Animated.spring(dragY, { toValue: 0, friction: 8, tension: 80, useNativeDriver: false }),
    ]).start();
  }

  function slide(direction: 1 | -1) {
    const target = ordered[index + direction];
    if (!target) {
      springHome();
      return;
    }
    // The neighbour is already sitting at that offset, so once the travel
    // finishes the swap is invisible and no reset animation is needed.
    Animated.timing(dragX, {
      toValue: -direction * width,
      duration: 180,
      useNativeDriver: false,
    }).start(({ finished }) => {
      if (finished) setSelectedId(target.id);
    });
  }

  const swipeGesture = useMemo(
    () =>
      Gesture.Pan()
        .maxPointers(1)
        .minDistance(15)
        .onUpdate((event) => {
          const vertical =
            event.translationY > 0 && Math.abs(event.translationY) > Math.abs(event.translationX);
          if (vertical) {
            dragY.setValue(dampDown(event.translationY));
            dragX.setValue(0);
            return;
          }

          // Only towards a neighbour that exists, otherwise the stage stays
          // put rather than dragging black into view.
          const forward = event.translationX < 0;
          const blocked = forward ? !ordered[index + 1] : !ordered[index - 1];
          dragX.setValue(blocked ? 0 : event.translationX);
          dragY.setValue(0);
        })
        .onEnd((event) => {
          const vertical =
            event.translationY > 0 && Math.abs(event.translationY) > Math.abs(event.translationX);
          if (vertical) {
            if (event.translationY > SWIPE_CLOSE_DISTANCE) navigation.goBack();
            else springHome();
            return;
          }

          if (event.translationX <= -SWIPE_CHANGE_DISTANCE) slide(1);
          else if (event.translationX >= SWIPE_CHANGE_DISTANCE) slide(-1);
          else springHome();
        }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [index, ordered, width],
  );

  function deleteCurrent() {
    if (!selected) return;
    Alert.alert('Delete this capture?', 'It will be removed from this session.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          const fallback = ordered[index + 1] ?? ordered[index - 1];
          removeItem(selected.id);
          if (fallback) setSelectedId(fallback.id);
          else navigation.goBack();
        },
      },
    ]);
  }

  if (!selected) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyText}>Nothing captured yet.</Text>
        <Pressable style={styles.emptyButton} onPress={() => navigation.goBack()}>
          <Text style={styles.emptyButtonText}>Back to camera</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <DiscardLayer drag={dragY} />

      <GestureDetector gesture={swipeGesture}>
        <Animated.View
          style={[
            styles.stageWrapper,
            { transform: [{ translateX: dragX }, { translateY: dragY }] },
          ]}
          collapsable={false}
        >
          {ordered[index - 1] && (
            <View style={[styles.neighbour, { left: -width, width }]} pointerEvents="none">
              <StaticMedia item={ordered[index - 1]!} />
            </View>
          )}

          {ordered[index + 1] && (
            <View style={[styles.neighbour, { left: width, width }]} pointerEvents="none">
              <StaticMedia item={ordered[index + 1]!} />
            </View>
          )}

          <View style={styles.stage}>
            {selected.kind === 'video' ? (
              <VideoView
                player={player}
                style={StyleSheet.absoluteFill}
                contentFit="contain"
                nativeControls={false}
              />
            ) : (
              <Image
                source={{ uri: selected.uri }}
                style={StyleSheet.absoluteFill}
                resizeMode="contain"
              />
            )}
          </View>
        </Animated.View>
      </GestureDetector>

      <TopBar
        topInset={insets.top}
        position={index + 1}
        total={ordered.length}
        onClose={() => navigation.goBack()}
        onDelete={deleteCurrent}
      />

      {ordered.length > 1 && (
        <View
          style={[
            styles.bottom,
            { paddingBottom: Math.max(insets.bottom, MIN_BOTTOM_INSET) + 18 },
          ]}
          pointerEvents="box-none"
        >
          <Carousel items={ordered} selectedId={selected.id} onSelect={setSelectedId} />
        </View>
      )}
    </View>
  );
}

/* ------------------------------------------------------------------ *
 * Styles
 * ------------------------------------------------------------------ */

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  discardLayer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000',
    alignItems: 'center',
    paddingTop: 90,
  },
  discardBadge: {
    alignItems: 'center',
    gap: 6,
  },
  discardText: {
    ...typography.label,
    color: colors.surface,
  },
  stageWrapper: {
    ...StyleSheet.absoluteFillObject,
  },
  stage: {
    flex: 1,
    backgroundColor: '#000',
  },
  neighbour: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    backgroundColor: '#000',
  },
  poster: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1A1A1A',
  },
  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.sm,
  },
  roundButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  counter: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: 14,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  counterText: {
    ...typography.caption,
    color: colors.surface,
    fontVariant: ['tabular-nums'],
  },
  bottom: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 2,
  },
  strip: {
    // Pinned so an RTL locale does not flip the running order.
    direction: 'ltr',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
  },
  frame: {
    width: FRAME_SIZE,
    height: FRAME_SIZE,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  frameVideo: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  frameActive: {
    borderColor: colors.surface,
  },
  empty: {
    flex: 1,
    backgroundColor: '#000',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  emptyText: {
    ...typography.body,
    color: colors.surface,
  },
  emptyButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: 8,
  },
  emptyButtonText: {
    ...typography.label,
    color: colors.textOnAccent,
  },
});
