import * as WebBrowser from 'expo-web-browser';
import * as AuthSession from 'expo-auth-session';
import { supabase } from './supabase';

WebBrowser.maybeCompleteAuthSession();

export async function signInWithGoogle(): Promise<{ error: string | null }> {
  try {
    const redirectUri = AuthSession.makeRedirectUri({ scheme: 'senti' });

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: redirectUri,
        skipBrowserRedirect: true,
      },
    });

    if (error || !data.url) {
      return { error: error?.message ?? 'No se pudo iniciar el login' };
    }

    const result = await WebBrowser.openAuthSessionAsync(data.url, redirectUri);

    if (result.type !== 'success') {
      return { error: null }; // usuario canceló, no es error
    }

    const url = new URL(result.url);
    const accessToken  = url.searchParams.get('access_token');
    const refreshToken = url.searchParams.get('refresh_token');

    // Supabase devuelve los tokens en el fragmento (#) en algunos flujos
    const hash = result.url.split('#')[1] ?? '';
    const hashParams = new URLSearchParams(hash);
    const access  = accessToken  ?? hashParams.get('access_token');
    const refresh = refreshToken ?? hashParams.get('refresh_token');

    if (access && refresh) {
      await supabase.auth.setSession({ access_token: access, refresh_token: refresh });
    }

    return { error: null };
  } catch (e: any) {
    return { error: e?.message ?? 'Error inesperado' };
  }
}

export async function signOut(): Promise<void> {
  await supabase.auth.signOut();
}
