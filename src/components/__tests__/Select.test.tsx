import { fireEvent, render } from '@testing-library/react-native';
import { Select } from '../Select';

const options = [
  { value: 'dad', label: 'Dad' },
  { value: 'grandma', label: 'Grandma' },
];

describe('Select', () => {
  it('shows the placeholder until something is chosen', async () => {
    const { getByLabelText, queryByLabelText } = await render(
      <Select label="Relationship" value={null} options={options} onSelect={jest.fn()} />,
    );

    expect(getByLabelText('Relationship').props.accessibilityValue).toEqual({
      text: 'Choose one',
    });
    expect(queryByLabelText('Grandma')).toBeNull();
  });

  it('reports the option that was picked and closes the sheet', async () => {
    const onSelect = jest.fn();
    const { getByLabelText, queryByLabelText } = await render(
      <Select label="Relationship" value="dad" options={options} onSelect={onSelect} />,
    );

    await fireEvent.press(getByLabelText('Relationship'));
    await fireEvent.press(getByLabelText('Grandma'));

    expect(onSelect).toHaveBeenCalledWith('grandma');
    expect(queryByLabelText('Grandma')).toBeNull();
  });
});
