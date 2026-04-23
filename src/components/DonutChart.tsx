import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { G, Circle } from 'react-native-svg';

interface ChartData {
  color: string;
  value: number;
}

interface DonutChartProps {
  data: ChartData[];
  radius?: number;
  strokeWidth?: number;
}

export const DonutChart: React.FC<DonutChartProps> = ({ 
  data, 
  radius = 50, 
  strokeWidth = 15 
}) => {
  const halfCircle = radius + strokeWidth;
  const circumference = 2 * Math.PI * radius;
  
  const total = data.reduce((sum, item) => sum + item.value, 0);

  let currentOffset = 0;

  // Jeżeli brak danych, narysuj pusty szary pierścień
  if (total === 0) {
    return (
      <View style={{ width: halfCircle * 2, height: halfCircle * 2, justifyContent: 'center', alignItems: 'center' }}>
        <Svg width={halfCircle * 2} height={halfCircle * 2} viewBox={`0 0 ${halfCircle * 2} ${halfCircle * 2}`}>
          <G rotation="-90" origin={`${halfCircle}, ${halfCircle}`}>
            <Circle
              cx="50%"
              cy="50%"
              r={radius}
              stroke="#E2E8F0"
              strokeWidth={strokeWidth}
              fill="transparent"
            />
          </G>
        </Svg>
      </View>
    );
  }

  return (
    <View style={{ width: halfCircle * 2, height: halfCircle * 2, justifyContent: 'center', alignItems: 'center' }}>
      <Svg width={halfCircle * 2} height={halfCircle * 2} viewBox={`0 0 ${halfCircle * 2} ${halfCircle * 2}`}>
        <G rotation="-90" origin={`${halfCircle}, ${halfCircle}`}>
          {data.map((item, index) => {
            const strokeDashoffset = circumference - (circumference * currentOffset) / total;
            const strokeDasharray = `${(circumference * item.value) / total} ${circumference}`;
            
            // Zwiększamy offset dla następnego elementu
            currentOffset += item.value;

            return (
              <Circle
                key={index}
                cx="50%"
                cy="50%"
                r={radius}
                stroke={item.color}
                strokeWidth={strokeWidth}
                strokeDasharray={strokeDasharray}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                fill="transparent"
              />
            );
          })}
        </G>
      </Svg>
    </View>
  );
};
