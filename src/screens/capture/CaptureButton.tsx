/* eslint-disable react-hooks/set-state-in-effect, react-hooks/refs */
import { useEffect, useRef } from 'react';
import { Animated, PanResponder, StyleSheet, View, Pressable, StyleSheet, View } from 'react-native';
import { colors } from '../../theme';

const BUTTON_SIZE = 88;
const RING_SIZE = 116;
const STOP_SIZE = 34;
const HOLD_DELAY = 350;

interface Props {
  onTakePhoto: () => void;
  onStartRecording: () => void;
  onStopRecording: () => void;
  onZoomDrag: (dy: number) => void;
}

export function CaptureButton({
  onTakePhoto,
  onStartRecording,
  onStopRecording,
  onZoomDrag,
}: Props) {
  const isRecording = useRef(false);
  const holdTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const ringOpacity = useRef(new Animated.Value(0)).current;
  const ringScale = useRef(new Animated.Value(1)).current;
  const buttonScale = useRef(new Animated.Value(1)).current;
  const stopProgress = useRef(new Animated.Value(0)).current;
  const loopRef = useRef<Animated.CompositeAnimation | null>(null);

  useEffect(() => {
    return () => {
      if (holdTimer.current) clearTimeout(holdTimer.current);
      loopRef.current?.stop();
    };
  }, []);

  function startAnim() {
    Animated.parallel([
      Animated.timing(ringOpacity, { toValue: 1, duration: 180, useNativeDriver: true }),
      Animated.spring(buttonScale, {
        toValue: 0.88,
        friction: 6,
        tension: 120,
        useNativeDriver: true,
      }),
      Animated.spring(stopProgress, {
        toValue: 1,
        friction: 5,
        tension: 140,
        useNativeDriver: true,
      }),
    ]).start();

    loopRef.current = Animated.loop(
      Animated.sequence([
        Animated.timing(ringScale, { toValue: 1.12, duration: 650, useNativeDriver: true }),
        Animated.timing(ringScale, { toValue: 1, duration: 650, useNativeDriver: true }),
      ]),
    );
    loopRef.current.start();
  }

  function stopAnim() {
    loopRef.current?.stop();
    ringScale.setValue(1);
    Animated.parallel([
      Animated.timing(ringOpacity, { toValue: 0, duration: 150, useNativeDriver: true }),
      Animated.spring(buttonScale, {
        toValue: 1,
        friction: 6,
        tension: 120,
        useNativeDriver: true,
      }),
      Animated.timing(stopProgress, { toValue: 0, duration: 160, useNativeDriver: true }),
    ]).start();
  }

  function punch() {
    Animated.sequence([
      Animated.timing(buttonScale, { toValue: 0.86, duration: 70, useNativeDriver: true }),
      Animated.spring(buttonScale, {
        toValue: 1,
        friction: 4,
        tension: 180,
        useNativeDriver: true,
      }),
    ]).start();
  }

  const responder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      // The finger regularly leaves the button while dragging to zoom, and a
      // parent stealing the touch there would cut the recording short.
      onPanResponderTerminationRequest: () => false,

      onPanResponderGrant: () => {
        Animated.timing(buttonScale, {
          toValue: 0.93,
          duration: 110,
          useNativeDriver: true,
        }).start();

        holdTimer.current = setTimeout(() => {
          isRecording.current = true;
          startAnim();
          onStartRecording();
        }, HOLD_DELAY);
      },

      onPanResponderMove: (_event, gesture) => {
        if (isRecording.current) onZoomDrag(gesture.dy);
      },

      onPanResponderRelease: () => {
        if (holdTimer.current) clearTimeout(holdTimer.current);

        if (isRecording.current) {
          isRecording.current = false;
          stopAnim();
          onStopRecording();
          return;
        }

        punch();
        onTakePhoto();
      },

      onPanResponderTerminate: () => {
        if (holdTimer.current) clearTimeout(holdTimer.current);

        if (isRecording.current) {
          isRecording.current = false;
          stopAnim();
          onStopRecording();
          return;
        }

        Animated.spring(buttonScale, {
          toValue: 1,
          friction: 6,
          tension: 120,
          useNativeDriver: true,
        }).start();
      },
    }),
  ).current;

  const stopScale = stopProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 1],
  });

  return (
    <View style={styles.wrapper}>
      <Animated.View
        style={[styles.ring, { opacity: ringOpacity, transform: [{ scale: ringScale }] }]}
      />
      <Animated.View style={{ transform: [{ scale: buttonScale }] }} {...responder.panHandlers}>
        <View style={styles.button}>
          <Animated.View
            style={[
              styles.stopSquare,
              { opacity: stopProgress, transform: [{ scale: stopScale }] },
            ]}
          />
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    width: RING_SIZE,
    height: RING_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ring: {
    position: 'absolute',
    width: RING_SIZE,
    height: RING_SIZE,
    borderRadius: RING_SIZE / 2,
    borderWidth: 3,
    borderColor: colors.error,
  },
  button: {
    width: BUTTON_SIZE,
    height: BUTTON_SIZE,
    borderRadius: BUTTON_SIZE / 2,
    backgroundColor: colors.surface,
    borderWidth: 4,
    borderColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stopSquare: {
    width: STOP_SIZE,
    height: STOP_SIZE,
    borderRadius: 9,
    backgroundColor: colors.error,
  },
});
