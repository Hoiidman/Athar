import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';
import { avatarFills, colors } from '../theme';

const size = 46;
const overlap = -13;

export function AvatarStack() {
  return (
    <View
      style={styles.stack}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      {avatarFills.map((fill, index) => (
        <View
          key={fill}
          // Earlier slots sit on top, so the open one reads as the end of a
          // queue rather than the thing in front of it.
          style={[
            styles.slot,
            { backgroundColor: fill, zIndex: avatarFills.length - index },
            index > 0 && styles.overlapping,
          ]}
        >
          <Ionicons name="person" size={20} color={colors.textOnAccent} />
        </View>
      ))}
      <View style={[styles.slot, styles.overlapping, styles.open]}>
        <Ionicons name="add" size={22} color={colors.uiIcon} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  stack: {
    flexDirection: 'row',
  },
  slot: {
    width: size,
    height: size,
    borderRadius: size / 2,
    borderWidth: 3,
    borderColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  overlapping: {
    marginLeft: overlap,
  },
  open: {
    backgroundColor: colors.sunken,
    zIndex: 0,
  },
});
