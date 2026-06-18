/**
 * Integración con RevenueCat para pagos de Senti+.
 *
 * CÓMO ACTIVAR:
 * 1. Crear cuenta en https://app.revenuecat.com
 * 2. Agregar la app con package: cl.sentiapp.app
 * 3. Crear productos en Google Play Console:
 *    - com.sentiapp.plus.monthly  → $4.99 USD / mes
 *    - com.sentiapp.plus.annual   → $39.99 USD / año
 * 4. RevenueCat → Entitlements: crear "senti_plus" y asociar los productos
 * 5. RevenueCat → Offerings: crear "default" con los dos paquetes
 * 6. RevenueCat → Project Settings → Webhooks:
 *    URL: https://mumtrkgnfvfstdjtyiui.supabase.co/functions/v1/revenuecat-webhook
 *    Authorization: Bearer <REVENUECAT_WEBHOOK_SECRET>
 *    (Configurar el secret en Supabase: supabase secrets set REVENUECAT_WEBHOOK_SECRET=xxx)
 * 7. RevenueCat → Project Settings → API Keys → copiar la clave Android (goog_xxx)
 * 8. Agregar al .env local:
 *    EXPO_PUBLIC_REVENUECAT_ANDROID_KEY=goog_xxxxxxxxxxxx
 * 9. Agregar al proyecto EAS:
 *    npx eas secret:create --scope project --name EXPO_PUBLIC_REVENUECAT_ANDROID_KEY --value goog_xxx
 * 10. Build nativo: npx eas build --platform android --profile preview
 *
 * En Expo Go RevenueCat se deshabilita automáticamente (no hay build nativo).
 * Solo funciona en builds EAS (preview o production).
 */

import type { PurchasesPackage } from 'react-native-purchases';
import { Platform } from 'react-native';

const API_KEY_ANDROID = process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY ?? '';
const API_KEY_IOS     = process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY ?? '';
const API_KEY         = Platform.OS === 'ios' ? API_KEY_IOS : API_KEY_ANDROID;

/** true cuando hay API key configurada */
export const revenueCatActivo = !!API_KEY;

/**
 * Carga el módulo nativo de forma segura.
 * Retorna null en Expo Go (sin build nativo) o si no hay API key.
 */
function sdk() {
  if (!revenueCatActivo) return null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    return require('react-native-purchases').default as typeof import('react-native-purchases').default;
  } catch {
    return null;
  }
}

/**
 * Inicializar RevenueCat con el userId de Supabase.
 * Llamar al iniciar sesión (en _layout.tsx), antes de cualquier feature premium.
 * El app_user_id = Supabase user.id → el webhook sabe qué perfil actualizar.
 */
export async function inicializarRevenueCat(userId: string): Promise<void> {
  const P = sdk();
  if (!P) return;
  try {
    P.configure({ apiKey: API_KEY, appUserID: userId });
    await P.logIn(userId);
  } catch (e) {
    console.warn('[RevenueCat] Error al inicializar:', e);
  }
}

/**
 * Obtiene los paquetes del Offering "default".
 * Retorna null si RevenueCat no está habilitado o no hay conexión.
 */
export async function obtenerPackages(): Promise<PurchasesPackage[] | null> {
  const P = sdk();
  if (!P) return null;
  try {
    const offerings = await P.getOfferings();
    return offerings.current?.availablePackages ?? null;
  } catch (e) {
    console.warn('[RevenueCat] Error al obtener offerings:', e);
    return null;
  }
}

/**
 * Inicia la compra de un paquete.
 * Retorna true si exitoso, false si el usuario canceló.
 * Lanza Error si hay fallo técnico.
 */
export async function comprar(pkg: PurchasesPackage): Promise<boolean> {
  const P = sdk();
  if (!P) return false;
  try {
    const { customerInfo } = await P.purchasePackage(pkg);
    return !!customerInfo.entitlements.active['senti_plus'];
  } catch (e: any) {
    if (e?.userCancelled) return false;
    throw e;
  }
}

/**
 * Restaura compras anteriores (requerido por Google Play guidelines).
 * Retorna true si hay una suscripción "senti_plus" activa.
 */
export async function restaurarCompras(): Promise<boolean> {
  const P = sdk();
  if (!P) return false;
  try {
    const customerInfo = await P.restorePurchases();
    return !!customerInfo.entitlements.active['senti_plus'];
  } catch (e) {
    console.warn('[RevenueCat] Error al restaurar:', e);
    return false;
  }
}
