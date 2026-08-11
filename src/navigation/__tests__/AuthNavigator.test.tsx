import { NavigationContainer } from '@react-navigation/native';
import { fireEvent, render } from '@testing-library/react-native';
import { AuthNavigator } from '../AuthNavigator';

jest.mock('../../services/auth', () => ({ signIn: jest.fn(), signUp: jest.fn() }));

function renderNavigator() {
  return render(
    <NavigationContainer>
      <AuthNavigator />
    </NavigationContainer>,
  );
}

describe('AuthNavigator', () => {
  it('links from sign-in to sign-up and back', async () => {
    const { getByRole, getByText, queryByText } = await renderNavigator();

    expect(getByText('Welcome back')).toBeTruthy();

    await fireEvent.press(getByRole('link', { name: 'Don’t have an account? Sign up' }));
    expect(getByText('Create an account')).toBeTruthy();
    expect(queryByText('Welcome back')).toBeFalsy();

    await fireEvent.press(getByRole('link', { name: 'Already have an account? Sign in' }));
    expect(getByText('Welcome back')).toBeTruthy();
  });
});
