/* eslint-disable react-hooks/set-state-in-effect, react-hooks/refs */
import { useRef } from 'react';
import { Animated, Pressable, StyleSheet, View } from 'react-native';
import { colors } from '../../theme';

const BUTTON_SIZE = 72;
const RING_SIZE = 96;

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
  const loopRef = useRef<Animated.CompositeAnimation | null>(null);

  function startAnim() {
    Animated.timing(ringOpacity, { toValue: 1, duration: 200, useNativeDriver: true }).start();
    Animated.timing(buttonScale, { toValue: 0.85, duration: 200, useNativeDriver: true }).start();
    loopRef.current = Animated.loop(
      Animated.sequence([
        Animated.timing(ringScale, { toValue: 1.15, duration: 700, useNativeDriver: true }),
        Animated.timing(ringScale, { toValue: 1, duration: 700, useNativeDriver: true }),
      ]),
    );
    loopRef.current.start();
  }

  function stopAnim() {
    loopRef.current?.stop();
    ringScale.setValue(1);
    Animated.parallel([
      Animated.timing(ringOpacity, { toValue: 0, duration: 150, useNativeDriver: true }),
      Animated.timing(buttonScale, { toValue: 1, duration: 150, useNativeDriver: true }),
    ]).start();
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

  return (
    <View style={styles.wrapper}>
      <Animated.View
        style={[styles.ring, { opacity: ringOpacity, transform: [{ scale: ringScale }] }]}
      />
      <Animated.View style={{ transform: [{ scale: buttonScale }] }}>
        <Pressable
          style={styles.button}
          onPress={onTakePhoto}
          onLongPress={handleLongPress}
          onPressOut={handlePressOut}
          delayLongPress={350}
        />
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
  },
});
