import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../navigation/RootStackNavigator';
import { useCaptureSessionStore } from '../../store/captureSessionStore';
import { colors, spacing, typography } from '../../theme';

// A full screen modal does not always report a top inset, and without a floor
// the close button lands under the status bar where it cannot be tapped.
const MIN_TOP_INSET = 16;

type Props = NativeStackScreenProps<RootStackParamList, 'MediaPreview'>;

export function MediaPreviewScreen({ route, navigation }: Props) {
  const insets = useSafeAreaInsets();
  const items = useCaptureSessionStore((state) => state.items);

  const selected = items.find((item) => item.id === route.params.itemId);

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
      {selected.kind === 'video' ? (
        <View style={[StyleSheet.absoluteFill, styles.poster]}>
          <Ionicons name="play" size={44} color={colors.surface} />
        </View>
      ) : (
        <Image
          source={{ uri: selected.uri }}
          style={StyleSheet.absoluteFill}
          resizeMode="contain"
        />
      )}

      <View
        style={[styles.topBar, { paddingTop: Math.max(insets.top, MIN_TOP_INSET) }]}
        pointerEvents="box-none"
      >
        <Pressable style={styles.roundButton} hitSlop={12} onPress={() => navigation.goBack()}>
          <Ionicons name="close" size={26} color={colors.surface} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
