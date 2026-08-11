import { PlaceholderScreen } from '../../components/PlaceholderScreen';
import { SignOutButton } from '../../components/SignOutButton';

export function FamilyPulseScreen() {
  return (
    <PlaceholderScreen title="Family Pulse">
      {/* TODO: move sign-out into a settings screen once one exists. */}
      <SignOutButton />
    </PlaceholderScreen>
  );
}
