import type { User } from 'firebase/auth';
import { useState } from 'react';
import { CreateFamilyCircleScreen } from './CreateFamilyCircleScreen';
import { JoinFamilyCircleScreen } from './JoinFamilyCircleScreen';

interface FamilyCircleOnboardingScreenProps {
  user: User;
  initialInviteCode?: string | null;
  onCircleReady: (circleId: string) => void;
  onSkip?: () => void;
}

export function FamilyCircleOnboardingScreen({
  user,
  initialInviteCode,
  onCircleReady,
  onSkip,
}: FamilyCircleOnboardingScreenProps) {
  const [mode, setMode] = useState<'create' | 'join'>(initialInviteCode ? 'join' : 'create');

  if (mode === 'join') {
    return (
      <JoinFamilyCircleScreen
        user={user}
        initialCode={initialInviteCode}
        onJoined={onCircleReady}
        onSwitchToCreate={() => setMode('create')}
        onSkip={onSkip}
      />
    );
  }

  return (
    <CreateFamilyCircleScreen
      user={user}
      onContinue={onCircleReady}
      onSwitchToJoin={() => setMode('join')}
      onSkip={onSkip}
    />
  );
}
