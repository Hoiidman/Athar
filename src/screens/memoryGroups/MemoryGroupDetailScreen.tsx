import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography } from '../../theme';

interface MemoryGroupDetailScreenProps {
  groupId: string;
}

export function MemoryGroupDetailScreen({ groupId }: MemoryGroupDetailScreenProps) {
  return (
    <SafeAreaView style={styles.screen} edges={['bottom']}>
      <View style={styles.emptyState}>
        <Ionicons name="images-outline" size={48} color={colors.textSecondary} />
        <Text style={styles.emptyTitle}>No memories yet</Text>
        <Text style={styles.emptySubtitle}>
          Photos and videos added to this group will appear here.
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
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
});
