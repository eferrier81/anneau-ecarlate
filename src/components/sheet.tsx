import type { ReactNode } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { glow, radius, screenPadding, spacing, useTheme } from '@/theme';

import { ThemedText } from './themed-text';

/** Feuille modale du bas (choix ponctuels : retrait imprévu, correction de date…). */
export function Sheet({
  visible,
  onClose,
  title,
  children,
}: {
  visible: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      statusBarTranslucent
      navigationBarTranslucent
      onRequestClose={onClose}>
      <View style={styles.root}>
        <Pressable
          style={[StyleSheet.absoluteFill, { backgroundColor: colors.scrim }]}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="Fermer"
        />
        <View
          accessibilityViewIsModal
          style={{
            backgroundColor: colors.surface,
            borderTopLeftRadius: radius.lg + 6,
            borderTopRightRadius: radius.lg + 6,
            borderCurve: 'continuous',
            borderTopWidth: 1,
            borderColor: colors.ember,
            boxShadow: glow(colors.glow, 'medium'),
            paddingHorizontal: screenPadding,
            paddingTop: spacing.sm,
            paddingBottom: insets.bottom + spacing.lg,
            gap: spacing.md,
          }}>
          <View
            style={{
              alignSelf: 'center',
              width: 40,
              height: 4,
              borderRadius: 2,
              backgroundColor: colors.border,
              marginBottom: spacing.xs,
            }}
          />
          <ThemedText variant="heading" accessibilityRole="header">
            {title}
          </ThemedText>
          {children}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: 'flex-end' },
});
