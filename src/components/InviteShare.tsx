import { Share, StyleSheet, Text, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { Button } from './Button';
import { InviteCodeCard } from './InviteCodeCard';
import { cardCornerRadius, cardShadow, colors, spacing, typography } from '../theme';
import { inviteMessage } from '../utils/inviteLink';

interface InviteShareProps {
  circleName: string;
  code: string;
}

export function InviteShare({ circleName, code }: InviteShareProps) {
  async function share() {
    await Share.share({ message: inviteMessage(circleName, code) }).catch(() => undefined);
  }

  return (
    <View style={styles.container}>
      <View style={styles.qr} accessibilityLabel="Invite code as a scannable code">
        <QRCode value={code} size={180} color="#000000" backgroundColor="#FFFFFF" />
        <Text style={styles.qrHint}>Or let them scan this while you are together.</Text>
      </View>

      <InviteCodeCard code={code} />

      <Button label="Share invite" onPress={share} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignSelf: 'stretch',
    gap: spacing.sm,
  },
  qr: {
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: '#FFFFFF',
    borderRadius: cardCornerRadius,
    paddingVertical: spacing.md,
    ...cardShadow,
  },
  qrHint: {
    ...typography.caption,
    color: colors.textSecondary,
    textAlign: 'center',
  },
});
