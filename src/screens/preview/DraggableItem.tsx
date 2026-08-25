import { MutableRefObject, ReactNode, useMemo, useRef } from 'react';
import { Animated, StyleSheet } from 'react-native';
import { Gesture, GestureDetector, GestureType } from 'react-native-gesture-handler';

const MIN_SCALE = 0.4;
const MAX_SCALE = 4;

export interface DragPosition {
  x: number;
  y: number;
}

export function clampOverlayScale(value: number) {
  return Math.min(Math.max(value, MIN_SCALE), MAX_SCALE);
}

interface Props {
  x: number;
  y: number;
  // Owned by the screen so a pinch can resize this item without both fingers
  // having to land on it.
  scale: Animated.Value;
  // The screen's swipe gesture, held off so dragging an overlay never also
  // drags the whole preview.
  blocks?: MutableRefObject<GestureType | undefined>;
  // The screen's pinch, allowed to run alongside this drag so an item can be
  // moved and resized at the same time.
  pinchWith?: MutableRefObject<GestureType | undefined>;
  onActivate?: () => void;
  onDragStart?: () => void;
  onDragMove?: (position: DragPosition) => void;
  onDragEnd?: (position: DragPosition) => void;
  children: ReactNode;
}

export function DraggableItem({
  x,
  y,
  scale,
  blocks,
  pinchWith,
  onActivate,
  onDragStart,
  onDragMove,
  onDragEnd,
  children,
}: Props) {
  const translation = useRef(new Animated.ValueXY({ x, y })).current;
  const origin = useRef<DragPosition>({ x, y });

  const handlers = useRef({ onActivate, onDragStart, onDragMove, onDragEnd });
  handlers.current = { onActivate, onDragStart, onDragMove, onDragEnd };

  const gesture = useMemo(
    () =>
      Gesture.Pan()
        .blocksExternalGesture(...(blocks ? [blocks] : []))
        .simultaneousWithExternalGesture(...(pinchWith ? [pinchWith] : []))
        .onBegin(() => handlers.current.onActivate?.())
        .onStart(() => handlers.current.onDragStart?.())
        .onUpdate((event) => {
          const next = {
            x: origin.current.x + event.translationX,
            y: origin.current.y + event.translationY,
          };
          translation.setValue(next);
          handlers.current.onDragMove?.(next);
        })
        .onEnd((event) => {
          const next = {
            x: origin.current.x + event.translationX,
            y: origin.current.y + event.translationY,
          };
          origin.current = next;
          handlers.current.onDragEnd?.(next);
        }),
    [translation, blocks, pinchWith],
  );

  return (
    <GestureDetector gesture={gesture}>
      <Animated.View
        style={[
          styles.item,
          {
            transform: [
              { translateX: translation.x },
              { translateY: translation.y },
              { scale },
            ],
          },
        ]}
      >
        {children}
      </Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  item: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
});
