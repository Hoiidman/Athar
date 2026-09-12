import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Animated, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../hooks/useAuth';
import { useFamilyCircleMembership } from '../../hooks/useFamilyCircleMembership';
import { useMemoryGroups } from '../../hooks/useMemoryGroups';
import { MY_SPACE_GROUP_ID } from '../../types';
import { colors, spacing, typography } from '../../theme';

const SHEET_OFFSET = 320;

interface Props {
  visible: boolean;
  onClose: () => void;
  /** Currently selected destination/group id, checkmarked in the list. */
  selectedId: string;
  onSelect: (id: string, label: string) => void;
  /** Sheet heading — defaults to "Save to". */
  title?: string;
  /** Renders the sheet without its own <Modal> wrapper, for use inside a caller that's already a Modal (nesting two native Modals breaks touch handling on Android). */
  inline?: boolean;
}

export function AlbumPicker({ visible, onClose, selectedId, onSelect, title = 'Save to', inline = false }: Props) {
  const { user } = useAuth();
  const { state: membership } = useFamilyCircleMembership(user);
  const circleId = membership.status === 'ready' ? membership.circleId : null;
  const groupsState = useMemoryGroups(circleId);

  const albums = useMemo(() => {
    const groups = groupsState.status === 'ready' ? groupsState.groups : [];
    return [
      { id: MY_SPACE_GROUP_ID, label: 'My Space' },
      ...groups.map((group) => ({ id: group.id, label: group.title })),
    ];
  }, [groupsState]);

  // Kept separate from `visible` so the sheet can animate out before the
  // modal is actually torn down.
  const [mounted, setMounted] = useState(visible);
  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const sheetOffset = useRef(new Animated.Value(SHEET_OFFSET)).current;

  useEffect(() => {
    if (visible) {
      setMounted(true);
      Animated.parallel([
        Animated.timing(backdropOpacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.spring(sheetOffset, {
          toValue: 0,
          friction: 9,
          tension: 70,
          useNativeDriver: true,
        }),
      ]).start();
      return;
    }

    Animated.parallel([
      Animated.timing(backdropOpacity, { toValue: 0, duration: 160, useNativeDriver: true }),
      Animated.timing(sheetOffset, {
        toValue: SHEET_OFFSET,
        duration: 180,
        useNativeDriver: true,
      }),
    ]).start(({ finished }) => {
      if (finished) setMounted(false);
    });
  }, [visible, backdropOpacity, sheetOffset]);

  function select(id: string, label: string) {
    onSelect(id, label);
    onClose();
  }

  if (!mounted) return null;

  const sheet = (
    <View style={[styles.container, inline && styles.containerInline]}>
      <Animated.View style={[styles.backdrop, { opacity: backdropOpacity }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
      </Animated.View>

      <Animated.View style={[styles.sheet, { transform: [{ translateY: sheetOffset }] }]}>
        <View style={styles.grabber} />
        <Text style={styles.title}>{title}</Text>
        {albums.map((album) => (
          <Pressable
            key={album.id}
            style={styles.row}
            onPress={() => select(album.id, album.label)}
          >
            <Text style={styles.label}>{album.label}</Text>
            {selectedId === album.id && (
              <Ionicons name="checkmark" size={20} color={colors.primary} />
            )}
          </Pressable>
        ))}
        {groupsState.status === 'loading' && circleId && (
          <ActivityIndicator style={styles.loading} color={colors.primary} />
        )}
      </Animated.View>
    </View>
  );

  if (inline) return sheet;

  return (
    <Modal visible transparent animationType="none" onRequestClose={onClose}>
      {sheet}
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  containerInline: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 20,
    elevation: 20,
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.xs,
    paddingBottom: spacing.xl,
    gap: spacing.xs,
  },
  grabber: {
    alignSelf: 'center',
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    marginBottom: spacing.xs,
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
  loading: {
    marginTop: spacing.xs,
  },
});
