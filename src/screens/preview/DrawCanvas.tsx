import { useRef, useState } from 'react';
import { PanResponder, StyleSheet, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

export interface Stroke {
  d: string;
  color: string;
  width: number;
}

interface Props {
  strokes: Stroke[];
  color: string;
  width: number;
  drawing: boolean;
  onAddStroke: (stroke: Stroke) => void;
}

export function DrawCanvas({ strokes, color, width, drawing, onAddStroke }: Props) {
  const [current, setCurrent] = useState('');
  const currentRef = useRef('');

  // Read through refs so the responder, created once, always draws with the
  // colour and width selected right now.
  const settings = useRef({ color, width, onAddStroke });
  settings.current = { color, width, onAddStroke };

  const responder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (event) => {
        const { locationX, locationY } = event.nativeEvent;
        currentRef.current = `M${locationX.toFixed(1)},${locationY.toFixed(1)}`;
        setCurrent(currentRef.current);
      },
      onPanResponderMove: (event) => {
        const { locationX, locationY } = event.nativeEvent;
        currentRef.current += ` L${locationX.toFixed(1)},${locationY.toFixed(1)}`;
        setCurrent(currentRef.current);
      },
      onPanResponderRelease: () => {
        if (currentRef.current.includes('L')) {
          settings.current.onAddStroke({
            d: currentRef.current,
            color: settings.current.color,
            width: settings.current.width,
          });
        }
        currentRef.current = '';
        setCurrent('');
      },
    }),
  ).current;

  return (
    <View
      style={StyleSheet.absoluteFill}
      pointerEvents={drawing ? 'auto' : 'none'}
      {...(drawing ? responder.panHandlers : {})}
    >
      <Svg style={StyleSheet.absoluteFill}>
        {strokes.map((stroke, index) => (
          <Path
            key={index}
            d={stroke.d}
            stroke={stroke.color}
            strokeWidth={stroke.width}
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
        ))}
        {current !== '' && (
          <Path
            d={current}
            stroke={color}
            strokeWidth={width}
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
        )}
      </Svg>
    </View>
  );
}
