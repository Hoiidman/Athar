import { useEffect, useRef } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  useAudioRecorder,
  useAudioRecorderState,
  setAudioModeAsync,
  RecordingPresets,
} from 'expo-audio';
import { colors, typography } from '../../theme';

interface Props {
  onRecorded: (uri: string, durationMillis: number) => void;
}

function formatDuration(millis: number) { // Converts MS "MM:SS"
  const total = Math.floor(millis / 1000);
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

export function VoiceRecorder({ onRecorded }: Props) {
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const state = useAudioRecorderState(recorder, 200);

  // The press can end before prepareToRecordAsync resolves, which would
  // otherwise start a recording nobody is holding for.
  const held = useRef(false);
  const pulse = useRef(new Animated.Value(1)).current;
  const loopRef = useRef<Animated.CompositeAnimation | null>(null);

  useEffect(() => {
    setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
  }, []);

  useEffect(() => {
    return () => loopRef.current?.stop();
  }, []);

  useEffect(() => {
    if (state.isRecording) {
      loopRef.current = Animated.loop(
        Animated.sequence([
          Animated.timing(pulse, { toValue: 1.25, duration: 600, useNativeDriver: true }),
          Animated.timing(pulse, { toValue: 1, duration: 600, useNativeDriver: true }),
        ]),
      );
      loopRef.current.start();
      return;
    }

    loopRef.current?.stop();
    pulse.setValue(1);
  }, [state.isRecording, pulse]);

  async function handlePressIn() {
    held.current = true;
    await recorder.prepareToRecordAsync();
    if (!held.current) return;
    recorder.record();
  }

  async function handlePressOut() {
    if (!held.current) return;
    held.current = false;

    if (!recorder.isRecording) return;

    const durationMillis = state.durationMillis;
    await recorder.stop();
    if (recorder.uri) onRecorded(recorder.uri, durationMillis);
  }

  return (
    <View style={styles.background}>
      <View style={styles.status}>
        {state.isRecording ? (
          <>
            <Animated.View style={[styles.dot, { transform: [{ scale: pulse }] }]} />
            <Text style={styles.duration}>{formatDuration(state.durationMillis)}</Text>
          </>
        ) : (
          <Text style={styles.hint}>Hold to record</Text>
        )}
      </View>

      <Pressable style={styles.micButton} onPressIn={handlePressIn} onPressOut={handlePressOut}>
        <Animated.View
          style={[
            styles.micRing,
            { opacity: state.isRecording ? 1 : 0, transform: [{ scale: pulse }] },
          ]}
        />
        <Ionicons name="mic" size={52} color={colors.surface} />
      </Pressable>

      <Text style={styles.caption}>
        {state.isRecording ? 'Release to save' : 'Record a voice memory'}
      </Text>
    </View>
  );
}

const MIC_SIZE = 116;

const styles = StyleSheet.create({
  background: {
    flex: 1,
    backgroundColor: '#111',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 20,
  },
  status: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    height: 24,
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.error,
  },
  duration: {
    ...typography.heading,
    color: colors.surface,
    fontVariant: ['tabular-nums'],
  },
  hint: {
    ...typography.body,
    color: colors.textSecondary,
  },
  micButton: {
    width: MIC_SIZE,
    height: MIC_SIZE,
    borderRadius: MIC_SIZE / 2,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  micRing: {
    position: 'absolute',
    width: MIC_SIZE,
    height: MIC_SIZE,
    borderRadius: MIC_SIZE / 2,
    borderWidth: 3,
    borderColor: colors.error,
  },
  caption: {
    ...typography.caption,
    color: colors.textSecondary,
  },
});
