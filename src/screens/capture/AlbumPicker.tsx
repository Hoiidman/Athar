import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useCaptureDestinationStore } from '../../store/captureDestinationStore';
import { MY_SPACE_GROUP_ID } from '../../types';
import { colors, spacing, typography } from '../../theme';

const ALBUMS = [{ id: MY_SPACE_GROUP_ID, label: 'My Space' }];

interface Props {
  visible: boolean;
  onClose: () => void;
}

export function AlbumPicker({ visible, onClose }: Props) {
  const { destinationId, setDestination } = useCaptureDestinationStore();

  function select(id: string) {
    setDestination(id);
    onClose();
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <View style={styles.sheet}>
        <Text style={styles.title}>Save to</Text>
        {ALBUMS.map((album) => (
          <Pressable key={album.id} style={styles.row} onPress={() => select(album.id)}>
            <Text style={styles.label}>{album.label}</Text>
            {destinationId === album.id && (
              <Ionicons name="checkmark" size={20} color={colors.primary} />
            )}
          </Pressable>
        ))}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.xl,
    gap: spacing.xs,
  },
  title: {
    ...typography.heading,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  label: {
    ...typography.body,
    color: colors.textPrimary,
  },
});
