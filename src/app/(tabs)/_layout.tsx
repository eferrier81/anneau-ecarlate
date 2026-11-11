import { NativeTabs } from 'expo-router/native-tabs';

import { fonts, useTheme } from '@/theme';

export default function TabsLayout() {
  const { colors } = useTheme();
  return (
    <NativeTabs
      backgroundColor={colors.surface}
      indicatorColor={colors.scarlet}
      rippleColor={colors.scarlet}
      iconColor={{ default: colors.textMuted, selected: colors.onAccent }}
      labelStyle={{
        default: { color: colors.textMuted, fontFamily: fonts.bodyMedium },
        selected: { color: colors.text, fontFamily: fonts.bodySemiBold },
      }}
      tintColor={colors.ember}>
      <NativeTabs.Trigger name="index">
        <NativeTabs.Trigger.Label>Accueil</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="circle.circle" md="radio_button_checked" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="calendrier">
        <NativeTabs.Trigger.Label>Calendrier</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="calendar" md="calendar_month" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="reglages">
        <NativeTabs.Trigger.Label>Réglages</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="gearshape" md="settings" />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
