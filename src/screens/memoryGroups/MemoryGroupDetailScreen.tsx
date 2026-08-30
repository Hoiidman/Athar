import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  Image,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useGroupMemories } from '../../hooks/useGroupMemories';
import { colors, spacing, typography } from '../../theme';

interface MemoryGroupDetailScreenProps {
  groupId: string;
  circleId: string;
}

const numColumns = 3;
const screenWidth = Dimensions.get('window').width;
const imageSize = screenWidth / numColumns;

export function MemoryGroupDetailScreen({ groupId, circleId }: MemoryGroupDetailScreenProps) {
  const memoriesState = useGroupMemories(circleId, groupId);

  if (memoriesState.status === 'loading') {
    return (
      <View style={[styles.screen, styles.centered]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (memoriesState.status === 'error') {
    return (
      <View style={[styles.screen, styles.centered]}>
        <Text style={styles.emptyTitle}>Could not load memories.</Text>
      </View>
    );
  }

  const { memories } = memoriesState;

  return (
    <SafeAreaView style={styles.screen} edges={['bottom']}>
      <FlatList
        data={memories}
        numColumns={numColumns}
        keyExtractor={(item) => item.id}
        contentContainerStyle={memories.length === 0 ? styles.emptyContainer : null}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="images-outline" size={48} color={colors.textSecondary} />
            <Text style={styles.emptyTitle}>No memories yet</Text>
            <Text style={styles.emptySubtitle}>
              Photos and videos added to this group will appear here.
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.imageContainer}>
            <Image
              source={{ uri: item.thumbnailUrl ?? item.storageUrl }}
              style={styles.image}
              resizeMode="cover"
            />
            {item.type === 'video' && (
              <View style={styles.iconOverlay}>
                <Ionicons name="play-circle" size={24} color="#fff" />
              </View>
            )}
            {item.type === 'voice' && (
              <View style={styles.iconOverlay}>
                <Ionicons name="mic" size={24} color="#fff" />
              </View>
            )}
          </View>
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
  centered: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyContainer: {
    flex: 1,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
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
  imageContainer: {
    width: imageSize,
    height: imageSize,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.background,
  },
  image: {
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
});
