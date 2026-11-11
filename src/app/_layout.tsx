import { Cinzel_400Regular, Cinzel_600SemiBold, Cinzel_700Bold } from '@expo-google-fonts/cinzel';
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
} from '@expo-google-fonts/inter';
import { useFonts } from 'expo-font';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useMemo } from 'react';

import { installForegroundHandler } from '@/notifications/scheduler';
import { AppStoreProvider, useAppStore } from '@/state/app-store';
import { AppThemeProvider, useTheme } from '@/theme';

SplashScreen.preventAutoHideAsync();
installForegroundHandler();

function RootNavigator({ fontsLoaded }: { fontsLoaded: boolean }) {
  const { ready, events } = useAppStore();
  const { colors, scheme } = useTheme();
  const initialized = events.some((e) => e.type === 'pose' || e.type === 'retrait');

  useEffect(() => {
    if (ready && fontsLoaded) SplashScreen.hideAsync();
  }, [ready, fontsLoaded]);

  const navTheme = useMemo(() => {
    const base = scheme === 'dark' ? DarkTheme : DefaultTheme;
    return {
      ...base,
      colors: {
        ...base.colors,
        primary: colors.ember,
        background: colors.bg,
        card: colors.surface,
        text: colors.text,
        border: colors.border,
        notification: colors.ember,
      },
    };
  }, [colors, scheme]);

  if (!ready || !fontsLoaded) return null;

  return (
    <ThemeProvider value={navTheme}>
      <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.bg },
          animation: 'fade',
        }}>
        <Stack.Protected guard={initialized}>
          <Stack.Screen name="(tabs)" />
        </Stack.Protected>
        <Stack.Protected guard={!initialized}>
          <Stack.Screen name="onboarding" />
        </Stack.Protected>
      </Stack>
    </ThemeProvider>
  );
}

function ThemedRoot({ fontsLoaded }: { fontsLoaded: boolean }) {
  const { settings } = useAppStore();
  return (
    <AppThemeProvider preference={settings.theme}>
      <RootNavigator fontsLoaded={fontsLoaded} />
    </AppThemeProvider>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Cinzel_400Regular,
    Cinzel_600SemiBold,
    Cinzel_700Bold,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
  });

  return (
    <AppStoreProvider>
      <ThemedRoot fontsLoaded={fontsLoaded || !!fontError} />
    </AppStoreProvider>
  );
}
