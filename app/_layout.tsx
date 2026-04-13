import { useEffect, useState } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { Stack, useRouter, useSegments, useRootNavigationState } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  useFonts,
  PlusJakartaSans_700Bold,
  PlusJakartaSans_800ExtraBold,
} from '@expo-google-fonts/plus-jakarta-sans';
import {
  Manrope_400Regular,
  Manrope_500Medium,
  Manrope_600SemiBold,
  Manrope_700Bold,
} from '@expo-google-fonts/manrope';
import { supabase } from '../lib/supabase';

SplashScreen.preventAutoHideAsync();

type AppState = 'loading' | 'no-session' | 'onboarding' | 'ready';

export default function RootLayout() {
  const router      = useRouter();
  const segments    = useSegments();
  const navState    = useRootNavigationState();   // ← clave: saber cuándo el nav está listo

  const [appState, setAppState] = useState<AppState>('loading');

  const [fontsLoaded] = useFonts({
    PlusJakartaSans_700Bold,
    PlusJakartaSans_800ExtraBold,
    Manrope_400Regular,
    Manrope_500Medium,
    Manrope_600SemiBold,
    Manrope_700Bold,
  });

  /* ── Determinar estado inicial ── */
  useEffect(() => {
    async function init() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setAppState('no-session');
        return;
      }
      const completed = await AsyncStorage.getItem('onboarding_complete');
      setAppState(completed === 'true' ? 'ready' : 'onboarding');
    }

    init();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!session) {
        setAppState('no-session');
        return;
      }
      const completed = await AsyncStorage.getItem('onboarding_complete');
      setAppState(completed === 'true' ? 'ready' : 'onboarding');
    });

    return () => subscription.unsubscribe();
  }, []);

  /* ── Redirigir cuando el nav esté listo + estado resuelto ── */
  useEffect(() => {
    if (!navState?.key) return;          // navegador aún no montado
    if (!fontsLoaded) return;
    if (appState === 'loading') return;

    const inOnboarding = segments[0] === 'onboarding';
    const inTabs       = segments[0] === '(tabs)';

    if (appState === 'no-session' && !inOnboarding) {
      router.replace('/onboarding');
    } else if (appState === 'onboarding' && !inOnboarding) {
      router.replace('/onboarding/intake');
    } else if (appState === 'ready' && !inTabs) {
      router.replace('/(tabs)');
    }
  }, [appState, fontsLoaded, navState?.key, segments]);

  /* ── Ocultar splash ── */
  useEffect(() => {
    if (fontsLoaded && appState !== 'loading') {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, appState]);

  if (!fontsLoaded || appState === 'loading') {
    return (
      <View style={{ flex: 1, backgroundColor: '#fbf9f4', justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator color="#3d6841" />
      </View>
    );
  }

  return <Stack screenOptions={{ headerShown: false }} />;
}
