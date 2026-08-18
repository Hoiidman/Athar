import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  Image,
  Keyboard,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Gesture, GestureDetector, GestureType } from 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';
import * as Crypto from 'expo-crypto';
import { useVideoPlayer, VideoView } from 'expo-video';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../navigation/RootStackNavigator';
import { CaptureItem, useCaptureSessionStore } from '../../store/captureSessionStore';
import { clampOverlayScale, DraggableItem, DragPosition } from './DraggableItem';
import { FILTERS, FilterId, INK_COLORS, STICKERS, TOOLS, ToolId } from './editorOptions';
import { colors, spacing, typography } from '../../theme';

/* ------------------------------------------------------------------ *
 * Types and constants
 * ------------------------------------------------------------------ */

interface TextOverlay {
  id: string;
  text: string;
  color: string;
}

interface StickerOverlay {
  id: string;
  emoji: string;
}

interface MediaEdits {
  filter: FilterId;
  texts: TextOverlay[];
  stickers: StickerOverlay[];
}

const EMPTY_EDITS: MediaEdits = { filter: 'none', texts: [], stickers: [] };

function isEdited(edits: MediaEdits) {
  return edits.filter !== 'none' || edits.texts.length > 0 || edits.stickers.length > 0;
}

// Tools with an editor behind them. The rest join the rail as their panels
// are built.
const AVAILABLE_TOOLS: ToolId[] = ['text', 'filters', 'sounds', 'stickers'];

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

// Anything dropped below this line while dragging gets removed.
const DELETE_ZONE_HEIGHT = 150;

const FRAME_SIZE = 56;
const TILE_SIZE = 64;

function dampDown(value: number) {
  if (value <= 0) return 0;
  if (value <= SWIPE_CLOSE_DISTANCE) return value;
  const past = (value - SWIPE_CLOSE_DISTANCE) * DRAG_RESISTANCE;
  return Math.min(SWIPE_CLOSE_DISTANCE + past, MAX_DOWN_DRAG);
}

/* ------------------------------------------------------------------ *
 * Hooks
 * ------------------------------------------------------------------ */

/** Height the keyboard is covering, so the bottom bar can sit above it. */
function useKeyboardOffset() {
  const [offset, setOffset] = useState(0);

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const show = Keyboard.addListener(showEvent, (event) =>
      setOffset(event.endCoordinates.height),
    );
    const hide = Keyboard.addListener(hideEvent, () => setOffset(0));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  return offset;
}

/**
 * Edits are kept per capture, with a snapshot pushed before every change so
 * undo can walk back through them one step at a time.
 */
function usePreviewEdits(selectedId: string | undefined) {
  const [edits, setEdits] = useState<Record<string, MediaEdits>>({});
  const [history, setHistory] = useState<Record<string, MediaEdits[]>>({});

  const current = (selectedId ? edits[selectedId] : undefined) ?? EMPTY_EDITS;
  const canUndo = (selectedId ? (history[selectedId]?.length ?? 0) : 0) > 0;

  function update(change: Partial<MediaEdits>) {
    if (!selectedId) return;
    const previous = edits[selectedId] ?? EMPTY_EDITS;
    setHistory((state) => ({ ...state, [selectedId]: [...(state[selectedId] ?? []), previous] }));
    setEdits((state) => ({ ...state, [selectedId]: { ...previous, ...change } }));
  }

  function undo() {
    if (!selectedId) return;
    const stack = history[selectedId] ?? [];
    const previous = stack[stack.length - 1];
    if (!previous) return;
    setHistory((state) => ({ ...state, [selectedId]: stack.slice(0, -1) }));
    setEdits((state) => ({ ...state, [selectedId]: previous }));
  }

  return { current, canUndo, update, undo };
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
function DiscardLayer({ visible, drag }: { visible: boolean; drag: Animated.Value }) {
  const progress = drag.interpolate({
    inputRange: [0, SWIPE_CLOSE_DISTANCE],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });

  return (
    <View style={styles.discardLayer} pointerEvents="none">
      {visible && (
        <Animated.View
          style={[styles.discardBadge, { opacity: progress, transform: [{ scale: progress }] }]}
        >
          <Ionicons name="trash-outline" size={30} color={colors.surface} />
          <Text style={styles.discardText}>Discard</Text>
        </Animated.View>
      )}
    </View>
  );
}

function DeleteZone({ active }: { active: boolean }) {
  return (
    <View style={styles.deleteZone} pointerEvents="none">
      <View style={[styles.deleteTarget, active && styles.deleteTargetActive]}>
        <Ionicons name="trash-outline" size={26} color={colors.surface} />
      </View>
      <Text style={styles.deleteHint}>
        {active ? 'Release to remove' : 'Drag here to remove'}
      </Text>
    </View>
  );
}

interface TopBarProps {
  topInset: number;
  position: number;
  total: number;
  hidden: boolean;
  editing: boolean;
  canUndo: boolean;
  onClose: () => void;
  onUndo: () => void;
  onDelete: () => void;
}

function TopBar({
  topInset,
  position,
  total,
  hidden,
  editing,
  canUndo,
  onClose,
  onUndo,
  onDelete,
}: TopBarProps) {
  return (
    <View
      style={[
        styles.topBar,
        { paddingTop: Math.max(topInset, MIN_TOP_INSET) },
        hidden && styles.hidden,
      ]}
      pointerEvents={hidden ? 'none' : 'box-none'}
    >
      <Pressable style={styles.roundButton} hitSlop={12} onPress={onClose}>
        <Ionicons name="close" size={26} color={colors.surface} />
      </Pressable>

      <View style={styles.counter}>
        <Text style={styles.counterText}>
          {position} / {total}
        </Text>
      </View>

      {editing ? (
        canUndo ? (
          <Pressable style={styles.roundButton} hitSlop={12} onPress={onUndo}>
            <Ionicons name="arrow-undo" size={22} color={colors.surface} />
          </Pressable>
        ) : (
          <View style={styles.roundButton} />
        )
      ) : (
        <Pressable style={styles.roundButton} hitSlop={12} onPress={onDelete}>
          <Ionicons name="trash-outline" size={22} color={colors.surface} />
        </Pressable>
      )}
    </View>
  );
}

function ToolRail({ onSelect }: { onSelect: (tool: ToolId) => void }) {
  return (
    <View style={styles.toolRail}>
      {TOOLS.filter((tool) => AVAILABLE_TOOLS.includes(tool.id)).map((tool) => (
        <Pressable key={tool.id} style={styles.tool} onPress={() => onSelect(tool.id)}>
          <View style={styles.toolIcon}>
            <Ionicons name={tool.icon} size={22} color={colors.surface} />
          </View>
          <Text style={styles.toolLabel}>{tool.label}</Text>
        </Pressable>
      ))}
    </View>
  );
}

function InkSwatches({ value, onChange }: { value: string; onChange: (color: string) => void }) {
  return (
    <>
      {INK_COLORS.map((color) => (
        <Pressable
          key={color}
          onPress={() => onChange(color)}
          style={[
            styles.swatch,
            { backgroundColor: color },
            color === value && styles.swatchActive,
          ]}
        />
      ))}
    </>
  );
}

interface TextPanelProps {
  draft: string;
  inkColor: string;
  onChangeDraft: (text: string) => void;
  onChangeColor: (color: string) => void;
  onCommit: () => void;
}

function TextPanel({ draft, inkColor, onChangeDraft, onChangeColor, onCommit }: TextPanelProps) {
  return (
    <View style={styles.panel}>
      <TextInput
        value={draft}
        onChangeText={onChangeDraft}
        autoFocus
        placeholder="Say something"
        placeholderTextColor={colors.textSecondary}
        style={[styles.input, { color: inkColor }]}
        onSubmitEditing={onCommit}
        returnKeyType="done"
      />
      <View style={styles.swatchRow}>
        <InkSwatches value={inkColor} onChange={onChangeColor} />
        <Pressable style={styles.done} onPress={onCommit}>
          <Text style={styles.doneText}>Add</Text>
        </Pressable>
      </View>
    </View>
  );
}

interface FilterPanelProps {
  /** The photo being edited, so each tile previews the real thing. */
  previewUri?: string;
  active: FilterId;
  onSelect: (filter: FilterId) => void;
}

function FilterPanel({ previewUri, active, onSelect }: FilterPanelProps) {
  return (
    <View style={styles.panel}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.strip}
      >
        {FILTERS.map((option) => (
          <Pressable
            key={option.id}
            style={[styles.tile, option.id === active && styles.tileActive]}
            onPress={() => onSelect(option.id)}
          >
            {previewUri ? (
              <Image source={{ uri: previewUri }} style={styles.tileImage} />
            ) : (
              <View style={[styles.tileImage, styles.tileFallback]} />
            )}
            <View
              style={[styles.tileWash, { backgroundColor: option.color, opacity: option.opacity }]}
            />
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

function StickerPanel({ onPick }: { onPick: (emoji: string) => void }) {
  return (
    <View style={styles.panel}>
      <View style={styles.stickerGrid}>
        {STICKERS.map((emoji) => (
          <Pressable key={emoji} onPress={() => onPick(emoji)}>
            <Text style={styles.stickerChoice}>{emoji}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

function SoundsPanel() {
  return (
    <View style={styles.panel}>
      <Text style={styles.panelNote}>No sounds in your library yet.</Text>
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
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const keyboardOffset = useKeyboardOffset();

  const items = useCaptureSessionStore((state) => state.items);
  const removeItem = useCaptureSessionStore((state) => state.removeItem);

  // Newest first, so the shot you just took reads as 1 of 3.
  const ordered = useMemo(() => items.filter((item) => item.kind !== 'audio').reverse(), [items]);

  const [selectedId, setSelectedId] = useState(route.params.itemId);
  const [activeTool, setActiveTool] = useState<ToolId | null>(null);
  const [draft, setDraft] = useState('');
  const [inkColor, setInkColor] = useState<string>(INK_COLORS[0] ?? colors.surface);
  const [draggingOverlay, setDraggingOverlay] = useState(false);
  const [overDelete, setOverDelete] = useState(false);

  const index = Math.max(
    0,
    ordered.findIndex((item) => item.id === selectedId),
  );
  const selected = ordered[index];

  const { current, canUndo, update, undo } = usePreviewEdits(selected?.id);
  const edited = isEdited(current);
  const editMode = activeTool !== null || edited;

  const swipeRef = useRef<GestureType | undefined>(undefined);
  const pinchRef = useRef<GestureType | undefined>(undefined);
  const dragX = useRef(new Animated.Value(0)).current;
  const dragY = useRef(new Animated.Value(0)).current;

  // Overlay scale lives here rather than in each item, so a pinch anywhere on
  // screen can resize the one that was touched last — an item too small to fit
  // two fingers is still resizable.
  const overlayScales = useRef<Record<string, Animated.Value>>({});
  const overlayScaleBase = useRef<Record<string, number>>({});
  const activeOverlay = useRef<string | null>(null);

  function scaleFor(id: string) {
    if (!overlayScales.current[id]) overlayScales.current[id] = new Animated.Value(1);
    return overlayScales.current[id];
  }

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

  function requestClose() {
    // Nothing to lose outside edit mode, so closing just closes.
    if (!edited) {
      navigation.goBack();
      return;
    }

    Alert.alert('Close preview?', 'Your edits will be lost.', [
      { text: 'Stay', style: 'cancel', onPress: springHome },
      { text: 'Discard', style: 'destructive', onPress: () => navigation.goBack() },
    ]);
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
        .withRef(swipeRef)
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

          // Paging is only offered outside edit mode, and only towards a
          // neighbour that exists — otherwise the stage stays put.
          const forward = event.translationX < 0;
          const blocked = editMode || (forward ? !ordered[index + 1] : !ordered[index - 1]);
          dragX.setValue(blocked ? 0 : event.translationX);
          dragY.setValue(0);
        })
        .onEnd((event) => {
          const vertical =
            event.translationY > 0 && Math.abs(event.translationY) > Math.abs(event.translationX);
          if (vertical) {
            if (event.translationY > SWIPE_CLOSE_DISTANCE) requestClose();
            else springHome();
            return;
          }

          if (editMode) {
            springHome();
            return;
          }
          if (event.translationX <= -SWIPE_CHANGE_DISTANCE) slide(1);
          else if (event.translationX >= SWIPE_CHANGE_DISTANCE) slide(-1);
          else springHome();
        }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [index, ordered, width, editMode, edited],
  );

  const overlayPinch = useMemo(
    () =>
      Gesture.Pinch()
        .withRef(pinchRef)
        .onUpdate((event) => {
          const id = activeOverlay.current;
          if (!id) return;
          const base = overlayScaleBase.current[id] ?? 1;
          scaleFor(id).setValue(clampOverlayScale(base * event.scale));
        })
        .onEnd((event) => {
          const id = activeOverlay.current;
          if (!id) return;
          const base = overlayScaleBase.current[id] ?? 1;
          overlayScaleBase.current[id] = clampOverlayScale(base * event.scale);
        }),
    [],
  );

  const stageGesture = useMemo(
    () => Gesture.Simultaneous(swipeGesture, overlayPinch),
    [swipeGesture, overlayPinch],
  );

  function handleOverlayMove(position: DragPosition) {
    const over = position.y > height - DELETE_ZONE_HEIGHT;
    setOverDelete((state) => (state === over ? state : over));
  }

  function handleOverlayEnd(kind: 'text' | 'sticker', id: string, position: DragPosition) {
    setDraggingOverlay(false);
    setOverDelete(false);
    if (position.y <= height - DELETE_ZONE_HEIGHT) return;

    if (kind === 'text') update({ texts: current.texts.filter((item) => item.id !== id) });
    else update({ stickers: current.stickers.filter((item) => item.id !== id) });
  }

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

  function commitText() {
    const text = draft.trim();
    if (text) {
      const id = Crypto.randomUUID();
      activeOverlay.current = id;
      update({ texts: [...current.texts, { id, text, color: inkColor }] });
    }
    setDraft('');
    Keyboard.dismiss();
    setActiveTool(null);
  }

  function addSticker(emoji: string) {
    const id = Crypto.randomUUID();
    activeOverlay.current = id;
    update({ stickers: [...current.stickers, { id, emoji }] });
    setActiveTool(null);
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

  const filter = FILTERS.find((option) => option.id === current.filter) ?? FILTERS[0];
  const dismissable =
    activeTool === 'filters' || activeTool === 'sounds' || activeTool === 'stickers';

  return (
    <View style={styles.container}>
      <DiscardLayer visible={edited} drag={dragY} />

      <GestureDetector gesture={stageGesture}>
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

            <View
              pointerEvents="none"
              style={[
                StyleSheet.absoluteFill,
                { backgroundColor: filter.color, opacity: filter.opacity },
              ]}
            />

            {current.texts.map((overlay, position) => (
              <DraggableItem
                key={overlay.id}
                x={40}
                y={140 + position * 52}
                scale={scaleFor(overlay.id)}
                blocks={swipeRef}
                pinchWith={pinchRef}
                onActivate={() => {
                  activeOverlay.current = overlay.id;
                }}
                onDragStart={() => setDraggingOverlay(true)}
                onDragMove={handleOverlayMove}
                onDragEnd={(dropped) => handleOverlayEnd('text', overlay.id, dropped)}
              >
                <Text style={[styles.overlayText, { color: overlay.color }]}>{overlay.text}</Text>
              </DraggableItem>
            ))}

            {current.stickers.map((overlay, position) => (
              <DraggableItem
                key={overlay.id}
                x={110 + position * 24}
                y={220 + position * 30}
                scale={scaleFor(overlay.id)}
                blocks={swipeRef}
                pinchWith={pinchRef}
                onActivate={() => {
                  activeOverlay.current = overlay.id;
                }}
                onDragStart={() => setDraggingOverlay(true)}
                onDragMove={handleOverlayMove}
                onDragEnd={(dropped) => handleOverlayEnd('sticker', overlay.id, dropped)}
              >
                <Text style={styles.overlaySticker}>{overlay.emoji}</Text>
              </DraggableItem>
            ))}
          </View>
        </Animated.View>
      </GestureDetector>

      {dismissable && (
        <Pressable style={StyleSheet.absoluteFill} onPress={() => setActiveTool(null)} />
      )}

      {draggingOverlay && <DeleteZone active={overDelete} />}

      <TopBar
        topInset={insets.top}
        position={index + 1}
        total={ordered.length}
        hidden={draggingOverlay}
        editing={editMode}
        canUndo={canUndo}
        onClose={() => (activeTool ? setActiveTool(null) : requestClose())}
        onUndo={undo}
        onDelete={deleteCurrent}
      />

      <View
        style={[
          styles.bottom,
          {
            paddingBottom:
              keyboardOffset > 0
                ? keyboardOffset
                : Math.max(insets.bottom, MIN_BOTTOM_INSET) + (activeTool === null ? 18 : 0),
          },
          draggingOverlay && styles.hidden,
        ]}
        pointerEvents={draggingOverlay ? 'none' : 'box-none'}
      >
        {activeTool === 'text' && (
          <TextPanel
            draft={draft}
            inkColor={inkColor}
            onChangeDraft={setDraft}
            onChangeColor={setInkColor}
            onCommit={commitText}
          />
        )}

        {activeTool === 'filters' && (
          <FilterPanel
            previewUri={selected.kind === 'photo' ? selected.uri : undefined}
            active={current.filter}
            onSelect={(next) => update({ filter: next })}
          />
        )}

        {activeTool === 'stickers' && <StickerPanel onPick={addSticker} />}

        {activeTool === 'sounds' && <SoundsPanel />}

        {activeTool === null && <ToolRail onSelect={setActiveTool} />}

        {activeTool === null && ordered.length > 1 && (
          <Carousel items={ordered} selectedId={selected.id} onSelect={setSelectedId} />
        )}
      </View>
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
  hidden: {
    opacity: 0,
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
  deleteZone: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: DELETE_ZONE_HEIGHT,
    zIndex: 3,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  deleteTarget: {
    width: 66,
    height: 66,
    borderRadius: 33,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.35)',
  },
  deleteTargetActive: {
    backgroundColor: colors.error,
    borderColor: colors.surface,
    transform: [{ scale: 1.15 }],
  },
  deleteHint: {
    ...typography.caption,
    color: colors.surface,
  },
  bottom: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 2,
    gap: spacing.sm,
  },
  toolRail: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: spacing.sm,
  },
  tool: {
    alignItems: 'center',
    gap: 4,
  },
  toolIcon: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  toolLabel: {
    ...typography.caption,
    color: colors.surface,
  },
  panel: {
    backgroundColor: 'rgba(0,0,0,0.55)',
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  panelNote: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  input: {
    ...typography.heading,
    paddingHorizontal: spacing.md,
  },
  swatchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
  },
  swatch: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  swatchActive: {
    borderColor: colors.surface,
  },
  done: {
    marginLeft: 'auto',
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: colors.primary,
  },
  doneText: {
    ...typography.label,
    color: colors.textOnAccent,
  },
  stickerGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
  },
  stickerChoice: {
    fontSize: 30,
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
  tile: {
    width: TILE_SIZE,
    height: TILE_SIZE,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: 'transparent',
    overflow: 'hidden',
  },
  tileActive: {
    borderColor: colors.surface,
  },
  tileImage: {
    ...StyleSheet.absoluteFillObject,
  },
  tileFallback: {
    backgroundColor: '#3A3A3A',
  },
  tileWash: {
    ...StyleSheet.absoluteFillObject,
  },
  overlayText: {
    ...typography.display,
    textShadowColor: 'rgba(0,0,0,0.6)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  overlaySticker: {
    fontSize: 56,
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
