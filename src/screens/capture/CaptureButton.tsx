import { useRef } from 'react';
import { Animated, Pressable, StyleSheet, View } from 'react-native';
import { colors } from '../../theme';

const BUTTON_SIZE = 88;
const RING_SIZE = 116;
const STOP_SIZE = 34;

interface Props {
  onTakePhoto: () => void;
  onStartRecording: () => void;
  onStopRecording: () => void;
}

export function CaptureButton({ onTakePhoto, onStartRecording, onStopRecording }: Props) {
  const isRecording = useRef(false);
  const ringOpacity = useRef(new Animated.Value(0)).current;
  const ringScale = useRef(new Animated.Value(1)).current;
  const buttonScale = useRef(new Animated.Value(1)).current;
  const stopProgress = useRef(new Animated.Value(0)).current;
  const loopRef = useRef<Animated.CompositeAnimation | null>(null);

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

  function handlePress() {
    Animated.sequence([
      Animated.timing(buttonScale, { toValue: 0.86, duration: 70, useNativeDriver: true }),
      Animated.spring(buttonScale, {
        toValue: 1,
        friction: 4,
        tension: 180,
        useNativeDriver: true,
      }),
    ]).start();
    onTakePhoto();
  }

  function handlePressIn() {
    Animated.timing(buttonScale, { toValue: 0.93, duration: 110, useNativeDriver: true }).start();
  }

  function handleLongPress() {
    isRecording.current = true;
    startAnim();
    onStartRecording();
  }

  function handlePressOut() {
    if (!isRecording.current) return;
    isRecording.current = false;
    stopAnim();
    onStopRecording();
  }

  const stopScale = stopProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 1],
  });

  return (
    <View style={styles.wrapper}>
      <Animated.View
        style={[styles.ring, { opacity: ringOpacity, transform: [{ scale: ringScale }] }]}
      />
      <Animated.View style={{ transform: [{ scale: buttonScale }] }}>
        <Pressable
          style={styles.button}
          onPress={handlePress}
          onPressIn={handlePressIn}
          onLongPress={handleLongPress}
          onPressOut={handlePressOut}
          delayLongPress={350}
        >
          <Animated.View
            style={[
              styles.stopSquare,
              { opacity: stopProgress, transform: [{ scale: stopScale }] },
            ]}
          />
        </Pressable>
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
