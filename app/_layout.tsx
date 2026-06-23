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
import { inicializarRevenueCat } from '../lib/revenuecat';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const router    = useRouter();
  const segments  = useSegments();
  const navState  = useRootNavigationState();   // ← clave: saber cuándo el nav está listo

  const [ready, setReady] = useState(false);
  // Signal para forzar re-check cuando cambia el estado de auth
  // (login, logout) — incrementarlo dispara el useEffect de navegación.
  const [authSignal, setAuthSignal] = useState(0);

  const [fontsLoaded] = useFonts({
    PlusJakartaSans_700Bold,
    PlusJakartaSans_800ExtraBold,
    Manrope_400Regular,
    Manrope_500Medium,
    Manrope_600SemiBold,
    Manrope_700Bold,
  });

  /* ── Escuchar cambios de auth (login / logout) ── */
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setAuthSignal(s => s + 1);
      if (session?.user?.id) {
        inicializarRevenueCat(session.user.id).catch(() => {});
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  /* ── Decidir adónde navegar ──
   * Re-lee sesión y AsyncStorage en cada cambio de segmentos / auth.
   * No cachea — así detecta inmediatamente cuando se completa el onboarding.
   */
  useEffect(() => {
    if (!navState?.key) return;          // navegador aún no montado
    if (!fontsLoaded) return;

    let cancelled = false;
    async function check() {
      let session = null;
      try {
        const { data } = await supabase.auth.getSession();
        session = data.session;
      } catch {
        // Si Supabase falla al arrancar, redirigir a onboarding como fallback seguro
        if (!cancelled) { setReady(true); router.replace('/onboarding'); }
        return;
      }
      if (cancelled) return;

      const inOnboarding = segments[0] === 'onboarding';

      if (!session) {
        // Sin sesión → siempre a welcome (onboarding root)
        if (!inOnboarding || segments[1]) {
          router.replace('/onboarding');
        }
        setReady(true);
        return;
      }

      // Con sesión → chequear si completó onboarding
      let completed = null;
      try {
        completed = await AsyncStorage.getItem('onboarding_complete');
      } catch { /* AsyncStorage puede fallar en primeros boots — tratar como no completado */ }
      if (cancelled) return;

      if (completed === 'true') {
        // Onboarding completo → solo redirigir si está atascada en onboarding.
        // Permitimos cualquier otra ruta autenticada (tabs, historial-gratitud,
        // futuras pantallas como /ajustes, /capsula-mensual, etc.)
        if (inOnboarding) router.replace('/(tabs)');
      } else {
        // Sesión activa pero falta onboarding
        if (!inOnboarding) {
          router.replace('/onboarding/intake');
        } else if (!segments[1]) {
          // Está en welcome con sesión activa → saltar a intake
          router.replace('/onboarding/intake');
        }
        // Si ya está en intake o planta, dejarlo terminar el flow
      }
      setReady(true);
    }
    check();
    return () => { cancelled = true; };
  }, [fontsLoaded, navState?.key, segments, authSignal]);

  /* ── Ocultar splash ── */
  useEffect(() => {
    if (fontsLoaded && ready) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, ready]);

  if (!fontsLoaded || !ready) {
    return (
      <View style={{ flex: 1, backgroundColor: '#fbf9f4', justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator color="#3d6841" />
      </View>
    );
  }

  return <Stack screenOptions={{ headerShown: false }} />;
}
