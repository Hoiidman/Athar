import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import {
  getFamilyCircle,
  listFamilyCircleMembers,
  removeFamilyCircleMember,
  setMemberRelationship,
} from '../../../services/familyCircles';
import type { FamilyCircleMember } from '../../../types/familyCircle';
import { MemberDetailScreen } from '../MemberDetailScreen';

jest.mock('../../../services/familyCircles', () => ({
  getFamilyCircle: jest.fn(),
  listFamilyCircleMembers: jest.fn(),
  setMemberRelationship: jest.fn(),
  removeFamilyCircleMember: jest.fn(),
  MAX_RELATIONSHIP_LENGTH: 40,
}));

const onRemoved = jest.fn();

const mockGetFamilyCircle = getFamilyCircle as jest.Mock;
const mockListMembers = listFamilyCircleMembers as jest.Mock;
const mockSetRelationship = setMemberRelationship as jest.Mock;
const mockRemoveMember = removeFamilyCircleMember as jest.Mock;

const owner: FamilyCircleMember = {
  userId: 'user-1',
  displayName: 'Layla',
  role: 'owner',
  inviteCodeUsed: null,
  joinedAt: 1_000,
};

const joiner: FamilyCircleMember = {
  userId: 'user-2',
  displayName: 'Sami',
  role: 'member',
  inviteCodeUsed: 'K7M2P9XR',
  joinedAt: 2_000,
};

beforeEach(() => {
  mockGetFamilyCircle.mockReset().mockResolvedValue({
    id: 'circle-9',
    name: 'The Hennawis',
    inviteCode: 'K7M2P9XR',
    ownerId: 'user-1',
  });
  mockListMembers.mockReset().mockResolvedValue([owner, joiner]);
  mockSetRelationship.mockReset().mockResolvedValue(undefined);
  mockRemoveMember.mockReset().mockResolvedValue(undefined);
  onRemoved.mockReset();
});

describe('MemberDetailScreen', () => {
  it('shows the member and marks the row that is you', async () => {
    const { findByText, getByText } = await render(
      <MemberDetailScreen
        circleId="circle-9"
        userId="user-1"
        currentUid="user-1"
        onRemoved={onRemoved}
      />,
    );

    expect(await findByText('Layla')).toBeTruthy();
    expect(getByText('Family owner')).toBeTruthy();
    expect(getByText('This is you')).toBeTruthy();
  });

  it('says so when the member is no longer in the circle', async () => {
    const { findByText, queryByText } = await render(
      <MemberDetailScreen
        circleId="circle-9"
        userId="user-gone"
        currentUid="user-1"
        onRemoved={onRemoved}
      />,
    );

    expect(await findByText('No longer a member')).toBeTruthy();
    expect(queryByText('This is you')).toBeFalsy();
  });

  it('lets the family owner label another member', async () => {
    const { findByRole, getByLabelText, getByRole } = await render(
      <MemberDetailScreen
        circleId="circle-9"
        userId="user-2"
        currentUid="user-1"
        onRemoved={onRemoved}
      />,
    );

    await fireEvent.press(await findByRole('button', { name: 'Add relationship' }));
    await fireEvent.press(getByLabelText('Relationship'));
    await fireEvent.press(getByRole('button', { name: 'Brother' }));
    await fireEvent.press(getByRole('button', { name: 'Save' }));

    await waitFor(() =>
      expect(mockSetRelationship).toHaveBeenCalledWith('circle-9', 'user-2', 'Brother'),
    );
  });

  it('takes a relationship the list does not cover', async () => {
    const { findByRole, getByLabelText, getByRole } = await render(
      <MemberDetailScreen
        circleId="circle-9"
        userId="user-2"
        currentUid="user-1"
        onRemoved={onRemoved}
      />,
    );

    await fireEvent.press(await findByRole('button', { name: 'Add relationship' }));
    await fireEvent.press(getByLabelText('Relationship'));
    await fireEvent.press(getByRole('button', { name: 'Other' }));
    await fireEvent.changeText(getByLabelText('Other relationship'), 'Khalo');
    await fireEvent.press(getByRole('button', { name: 'Save' }));

    await waitFor(() =>
      expect(mockSetRelationship).toHaveBeenCalledWith('circle-9', 'user-2', 'Khalo'),
    );
  });

  it('does not offer an ordinary member the label of someone else', async () => {
    const { findByText, queryByRole } = await render(
      <MemberDetailScreen
        circleId="circle-9"
        userId="user-1"
        currentUid="user-2"
        onRemoved={onRemoved}
      />,
    );

    expect(await findByText('Layla')).toBeTruthy();
    expect(queryByRole('button', { name: 'Add relationship' })).toBeFalsy();
  });

  it('lets the owner remove another member once the confirmation is accepted', async () => {
    const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});

    const { findByRole } = await render(
      <MemberDetailScreen
        circleId="circle-9"
        userId="user-2"
        currentUid="user-1"
        onRemoved={onRemoved}
      />,
    );

    await fireEvent.press(await findByRole('button', { name: 'Remove Sami from circle' }));
    expect(mockRemoveMember).not.toHaveBeenCalled();

    const buttons = alert.mock.calls[0]?.[2];
    await buttons?.find((button) => button.style === 'destructive')?.onPress?.();

    await waitFor(() => expect(mockRemoveMember).toHaveBeenCalledWith('circle-9', 'user-2'));
    expect(onRemoved).toHaveBeenCalled();

    alert.mockRestore();
  });

  it('never offers removal of yourself, or by an ordinary member', async () => {
    const asOwner = await render(
      <MemberDetailScreen
        circleId="circle-9"
        userId="user-1"
        currentUid="user-1"
        onRemoved={onRemoved}
      />,
    );
    expect(await asOwner.findByText('Layla')).toBeTruthy();
    expect(asOwner.queryByRole('button', { name: 'Remove Layla from circle' })).toBeFalsy();

    const asMember = await render(
      <MemberDetailScreen
        circleId="circle-9"
        userId="user-1"
        currentUid="user-2"
        onRemoved={onRemoved}
      />,
    );
    expect(asMember.queryByRole('button', { name: 'Remove Layla from circle' })).toBeFalsy();
  });
});
