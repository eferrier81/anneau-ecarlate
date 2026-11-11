/**
 * Cercle lumineux de l'accueil : halo rouge qui « respire », anneau de runes
 * géométriques originales qui tourne très lentement, hexagone fin.
 * Animations : Reanimated CSS (thread UI), coupées si « réduire les animations ».
 */
import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { useReducedMotion } from 'react-native-reanimated';
import Svg, { Circle, Defs, G, Path, Polygon, RadialGradient, Stop } from 'react-native-svg';

import { motion, useTheme } from '@/theme';

/** Glyphes runiques inventés (traits simples sur une hauteur de 10). */
const GLYPHS = [
  'M0,-5 L0,5 M-3,-2 L3,-2',
  'M-3,5 L0,-5 L3,5',
  'M0,-5 L0,5 M0,0 L3,-3 M0,2 L-3,-1',
  'M0,-5 L3,0 L0,5 L-3,0 Z',
  'M-3,-5 L3,-5 M0,-5 L0,5 M-2,5 L2,5',
  'M0,-5 L0,-1 M-2,3 a2,2 0 1,0 4,0 a2,2 0 1,0 -4,0',
  'M-3,-5 L3,5 M3,-5 L0,0',
  'M-3,-4 L0,-1 L3,-4 M0,-1 L0,5',
];

function hexagonPoints(cx: number, cy: number, r: number, rotationDeg = 0): string {
  return Array.from({ length: 6 }, (_, i) => {
    const a = ((60 * i + rotationDeg) * Math.PI) / 180;
    return `${(cx + r * Math.cos(a)).toFixed(2)},${(cy + r * Math.sin(a)).toFixed(2)}`;
  }).join(' ');
}

const breathe = {
  from: { transform: [{ scale: 0.93 }], opacity: 0.6 },
  to: { transform: [{ scale: 1.05 }], opacity: 1 },
};

const spin = {
  from: { transform: [{ rotate: '0deg' }] },
  to: { transform: [{ rotate: '360deg' }] },
};

const spinReverse = {
  from: { transform: [{ rotate: '0deg' }] },
  to: { transform: [{ rotate: '-360deg' }] },
};

export function MagicCircle({
  size,
  intensity = 'calm',
  children,
}: {
  size: number;
  /** « urgent » : halo plus vif et respiration plus rapide (action à faire). */
  intensity?: 'calm' | 'urgent';
  children: ReactNode;
}) {
  const { colors, scheme } = useTheme();
  const reduced = useReducedMotion();
  const c = size / 2;
  const runeR = size * 0.43;
  const urgent = intensity === 'urgent';

  const animate = (name: object, duration: number, extra: object = {}) =>
    reduced
      ? {}
      : {
          animationName: name,
          animationDuration: `${duration}ms`,
          animationIterationCount: 'infinite' as const,
          ...extra,
        };

  return (
    <View
      style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}
      accessibilityRole="none">
      {/* Halo qui respire */}
      <Animated.View
        pointerEvents="none"
        style={[
          StyleSheet.absoluteFill,
          animate(breathe, urgent ? motion.breathe / 2 : motion.breathe, {
            animationDirection: 'alternate',
            animationTimingFunction: 'ease-in-out',
          }),
        ]}>
        <Svg width={size} height={size}>
          <Defs>
            <RadialGradient id="halo" cx="50%" cy="50%" r="50%">
              <Stop offset="0.45" stopColor={colors.glow} stopOpacity={scheme === 'dark' ? 0.55 : 0.32} />
              <Stop offset="0.7" stopColor={colors.glow} stopOpacity={urgent ? 0.3 : 0.18} />
              <Stop offset="1" stopColor={colors.glow} stopOpacity={0} />
            </RadialGradient>
          </Defs>
          <Circle cx={c} cy={c} r={c} fill="url(#halo)" />
        </Svg>
      </Animated.View>

      {/* Anneau de runes (rotation très lente) */}
      <Animated.View
        pointerEvents="none"
        style={[
          StyleSheet.absoluteFill,
          animate(spin, motion.runeRotation, { animationTimingFunction: 'linear' }),
        ]}>
        <Svg width={size} height={size}>
          <Circle cx={c} cy={c} r={size * 0.475} stroke={colors.ember} strokeOpacity={0.35} strokeWidth={0.8} fill="none" />
          <Circle cx={c} cy={c} r={size * 0.385} stroke={colors.ember} strokeOpacity={0.45} strokeWidth={0.8} fill="none" />
          {Array.from({ length: 24 }, (_, i) => {
            const angle = i * 15;
            if (i % 2 === 0) {
              const glyph = GLYPHS[(i / 2) % GLYPHS.length];
              return (
                <G key={i} transform={`translate(${c} ${c}) rotate(${angle}) translate(0 ${-runeR})`}>
                  <Path d={glyph} stroke={colors.ember} strokeWidth={1.3} strokeLinecap="round" strokeLinejoin="round" fill="none" opacity={0.9} />
                </G>
              );
            }
            return (
              <G key={i} transform={`translate(${c} ${c}) rotate(${angle})`}>
                <Circle cx={0} cy={-runeR} r={1.2} fill={colors.ember} opacity={0.7} />
              </G>
            );
          })}
        </Svg>
      </Animated.View>

      {/* Hexagones (contre-rotation, encore plus lente) */}
      <Animated.View
        pointerEvents="none"
        style={[
          StyleSheet.absoluteFill,
          animate(spinReverse, motion.runeRotation * 1.6, { animationTimingFunction: 'linear' }),
        ]}>
        <Svg width={size} height={size}>
          <Polygon points={hexagonPoints(c, c, size * 0.355, 30)} stroke={colors.ember} strokeOpacity={0.55} strokeWidth={1} fill="none" />
          <Polygon points={hexagonPoints(c, c, size * 0.355, 0)} stroke={colors.ember} strokeOpacity={0.22} strokeWidth={0.8} fill="none" />
        </Svg>
      </Animated.View>

      {/* Disque central */}
      <View
        style={{
          width: size * 0.6,
          height: size * 0.6,
          borderRadius: size,
          backgroundColor: colors.surface,
          borderWidth: 1.5,
          borderColor: colors.ember,
          boxShadow: `0 0 ${urgent ? 34 : 22}px 2px ${colors.glow}88, inset 0 0 26px 0 ${colors.glow}44`,
          alignItems: 'center',
          justifyContent: 'center',
        }}>
        {children}
      </View>
    </View>
  );
}
