/**
 * Pantalla de upgrade a Senti+.
 * Se abre desde cualquier feature bloqueada o desde ajustes.
 * Por ahora muestra los precios y features — sin pago real todavía.
 */

import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { PRECIOS } from '../lib/premium';
import { comprar, obtenerPackages, restaurarCompras } from '../lib/revenuecat';
import AvisoSenti, { AvisoConfig } from '../components/AvisoSenti';

type Feature = {
  icono: keyof typeof Ionicons.glyphMap;
  titulo: string;
  gratis: string;
  premium: string;
};

const FEATURES: Feature[] = [
  { icono: 'create-outline',     titulo: 'Entradas al mes',       gratis: '5 en total',                premium: '30 al mes' },
  { icono: 'sparkles-outline',   titulo: 'Análisis con IA',       gratis: 'En tus 5 entradas',         premium: 'En todas tus entradas' },
  { icono: 'mic-outline',        titulo: 'Audio y voz',           gratis: 'No disponible',             premium: '40 min al mes' },
  { icono: 'leaf-outline',       titulo: 'Plantas simultáneas',   gratis: '1 planta',                  premium: '3 plantas' },
  { icono: 'flower-outline',     titulo: 'Especies de planta',    gratis: '5 especies',                premium: '13+ especies' },
  { icono: 'mail-outline',       titulo: 'Cápsulas del tiempo',   gratis: '1 total',                   premium: 'Hasta 6 activas' },
  { icono: 'analytics-outline',  titulo: 'Memoria de la IA',      gratis: 'Últimos 7 días',            premium: 'Patrones de meses' },
  { icono: 'document-outline',   titulo: 'Exportar diario',       gratis: 'No disponible',             premium: 'PDF descargable' },
];

export default function UpgradeScreen() {
  const router = useRouter();
  const [comprando, setComprando] = useState(false);
  const [aviso, setAviso] = useState<AvisoConfig | null>(null);

  async function handleComprar(tipo: 'mensual' | 'anual') {
    const packages = await obtenerPackages();
    if (!packages) {
      setAviso({
        titulo: 'Muy pronto',
        mensaje: 'Los pagos estarán disponibles en el lanzamiento oficial de Senti. ¡Gracias por tu paciencia!',
        icono: 'time-outline',
      });
      return;
    }
    setComprando(true);
    try {
      const ids: Record<typeof tipo, string> = {
        mensual: 'com.sentiapp.plus.monthly',
        anual:   'com.sentiapp.plus.annual',
      };
      const pkg = packages.find(p => p.product.identifier === ids[tipo]) ?? packages[0];
      const ok = await comprar(pkg);
      if (ok) {
        setAviso({
          titulo: '¡Bienvenida a Senti+!',
          mensaje: 'Tu suscripción está activa.',
          icono: 'sparkles', iconoBg: '#bfefbd', iconoColor: '#1e4824',
          botones: [{ texto: 'Continuar', variante: 'primario', onPress: () => router.back() }],
        });
      }
    } catch (e: any) {
      setAviso({ titulo: 'No se pudo completar', mensaje: e?.message ?? 'Intenta de nuevo.', icono: 'alert-circle-outline' });
    } finally {
      setComprando(false);
    }
  }

  async function handleRestaurar() {
    setComprando(true);
    try {
      const ok = await restaurarCompras();
      setAviso({
        titulo: ok ? '¡Restaurado!' : 'Sin compras previas',
        mensaje: ok ? 'Tu Senti+ está activo.' : 'No encontramos compras anteriores con esta cuenta.',
        icono: ok ? 'checkmark-circle-outline' : 'information-circle-outline',
        iconoBg: ok ? '#bfefbd' : '#f8f0e3', iconoColor: ok ? '#1e4824' : '#8a5010',
      });
    } finally {
      setComprando(false);
    }
  }

  return (
    <ScrollView style={S.container} contentContainerStyle={S.content}>

      {/* Botón cerrar */}
      <TouchableOpacity style={S.cerrar} onPress={() => router.back()} activeOpacity={0.7}>
        <Ionicons name="close" size={22} color="#5e6058" />
      </TouchableOpacity>

      {/* Hero */}
      <View style={S.hero}>
        <Text style={S.heroLabel}>SENTI+</Text>
        <Text style={S.heroTitle}>Más profundidad.{'\n'}Más de ti.</Text>
        <Text style={S.heroSub}>
          Senti gratis ya es poderoso. Senti+ es para quienes quieren ir más lejos.
        </Text>
      </View>

      {/* Precios */}
      <View style={S.preciosRow}>
        <TouchableOpacity style={S.precioCard} onPress={() => handleComprar('mensual')} activeOpacity={0.75} disabled={comprando}>
          <Text style={S.precioLabel}>MENSUAL</Text>
          <Text style={S.precioNum}>${PRECIOS.mensual_usd}</Text>
          <Text style={S.precioSub}>USD / mes</Text>
        </TouchableOpacity>
        <View style={S.precioDivider} />
        <TouchableOpacity style={S.precioCard} onPress={() => handleComprar('anual')} activeOpacity={0.75} disabled={comprando}>
          <Text style={S.precioLabel}>ANUAL</Text>
          <Text style={S.precioNum}>${PRECIOS.anual_usd}</Text>
          <Text style={S.precioSub}>USD / año</Text>
          <View style={S.ahorroChip}>
            <Text style={S.ahorroText}>AHORRAS 55%</Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* Comparación de features */}
      <View style={S.seccionHeader}>
        <Text style={S.seccionTitulo}>¿Qué incluye Senti+?</Text>
      </View>

      <View style={S.tablaHeader}>
        <View style={{ flex: 1 }} />
        <Text style={S.tablaColLabel}>GRATIS</Text>
        <Text style={[S.tablaColLabel, { color: '#3d6841' }]}>SENTI+</Text>
      </View>

      <View style={S.featuresCard}>
        {FEATURES.map((f, i) => (
          <View key={f.titulo} style={[S.featureRow, i < FEATURES.length - 1 && S.featureRowBorder]}>
            <View style={S.featureLeft}>
              <View style={S.featureIconWrap}>
                <Ionicons name={f.icono} size={16} color="#3d6841" />
              </View>
              <Text style={S.featureTitulo}>{f.titulo}</Text>
            </View>
            <Text style={S.featureGratis}>{f.gratis}</Text>
            <Text style={S.featurePremium}>{f.premium}</Text>
          </View>
        ))}
      </View>

      {/* Lo que nunca cambia */}
      <View style={S.siempreCard}>
        <Text style={S.siempreLabel}>SIEMPRE INCLUIDO EN EL PLAN GRATIS</Text>
        <Text style={S.siempreTitulo}>5 entradas al mes con análisis de IA.</Text>
        <Text style={S.siempreSub}>
          Sin tarjeta, sin trucos. El plan gratis es real y puedes usarlo todo el tiempo que quieras.
        </Text>
      </View>

      {/* Restaurar compras */}
      <TouchableOpacity style={S.restaurarBtn} onPress={handleRestaurar} activeOpacity={0.6} disabled={comprando}>
        <Text style={S.restaurarText}>¿Ya eres Senti+? Restaurar compra</Text>
      </TouchableOpacity>

      <View style={{ height: 32 }} />

      <AvisoSenti aviso={aviso} onClose={() => setAviso(null)} />
    </ScrollView>
  );
}

const S = StyleSheet.create({
  container:  { flex: 1, backgroundColor: '#fbf9f4' },
  content:    { paddingHorizontal: 24, paddingBottom: 48 },

  cerrar:     { alignSelf: 'flex-end', paddingTop: 56, paddingBottom: 8 },

  hero:       { gap: 10, paddingTop: 8, paddingBottom: 24 },
  heroLabel:  { fontFamily: 'Manrope_700Bold', fontSize: 11, color: '#3d6841', letterSpacing: 2 },
  heroTitle:  { fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 38, color: '#31332c', letterSpacing: -0.9, lineHeight: 44 },
  heroSub:    { fontFamily: 'Manrope_400Regular', fontSize: 15, color: '#5e6058', lineHeight: 23 },

  // Early adopter
  earlyCard:  { backgroundColor: '#3d6841', borderRadius: 28, padding: 28, gap: 12, marginBottom: 16 },
  earlyTop:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  earlyBadge: { backgroundColor: 'rgba(191,239,189,0.25)', borderRadius: 9999, paddingVertical: 5, paddingHorizontal: 12 },
  earlyBadgeText: { fontFamily: 'Manrope_700Bold', fontSize: 9, color: '#bfefbd', letterSpacing: 1.5 },
  earlyLimitado:  { fontFamily: 'Manrope_500Medium', fontSize: 12, color: 'rgba(228,255,224,0.6)' },
  earlyPrecio:    { fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 40, color: '#e4ffe0', letterSpacing: -1, lineHeight: 46 },
  earlyPeriodo:   { fontSize: 18, fontFamily: 'Manrope_400Regular', color: 'rgba(228,255,224,0.7)' },
  earlyDesc:      { fontFamily: 'Manrope_400Regular', fontSize: 13, color: 'rgba(228,255,224,0.75)', lineHeight: 20 },
  btnEarly:       { backgroundColor: '#bfefbd', borderRadius: 9999, paddingVertical: 15, alignItems: 'center', marginTop: 4 },
  btnEarlyText:   { fontFamily: 'PlusJakartaSans_700Bold', fontSize: 15, color: '#1e4824', letterSpacing: 0.3 },

  // Precios regulares
  preciosRow:   { flexDirection: 'row', backgroundColor: '#f5f4ed', borderRadius: 20, padding: 20, gap: 0, marginBottom: 32 },
  precioCard:   { flex: 1, alignItems: 'center', gap: 4 },
  precioDivider:{ width: 0.5, backgroundColor: '#d0d1c7', marginHorizontal: 16 },
  precioLabel:  { fontFamily: 'Manrope_700Bold', fontSize: 9, color: '#797c73', letterSpacing: 1.5 },
  precioNum:    { fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 28, color: '#31332c', letterSpacing: -0.5 },
  precioSub:    { fontFamily: 'Manrope_400Regular', fontSize: 11, color: '#797c73' },
  ahorroChip:   { backgroundColor: '#bfefbd', borderRadius: 9999, paddingVertical: 3, paddingHorizontal: 10, marginTop: 4 },
  ahorroText:   { fontFamily: 'Manrope_700Bold', fontSize: 9, color: '#1e4824', letterSpacing: 1 },

  // Features
  seccionHeader: { marginBottom: 12 },
  seccionTitulo: { fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 22, color: '#31332c', letterSpacing: -0.4 },

  tablaHeader:  { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 4, marginBottom: 8 },
  tablaColLabel:{ width: 90, fontFamily: 'Manrope_700Bold', fontSize: 9, color: '#797c73', letterSpacing: 1.2, textAlign: 'center' },

  featuresCard: { backgroundColor: '#ffffff', borderRadius: 20, paddingHorizontal: 20, marginBottom: 20,
    shadowColor: 'rgba(103,94,77,1)', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.06, shadowRadius: 16, elevation: 2 },
  featureRow:   { flexDirection: 'row', alignItems: 'center', paddingVertical: 16, gap: 8 },
  featureRowBorder: { borderBottomWidth: 0.5, borderBottomColor: '#efeee6' },
  featureLeft:  { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  featureIconWrap: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#bfefbd', alignItems: 'center', justifyContent: 'center' },
  featureTitulo:{ fontFamily: 'Manrope_600SemiBold', fontSize: 13, color: '#31332c', flex: 1 },
  featureGratis:{ width: 90, fontFamily: 'Manrope_400Regular', fontSize: 11, color: '#797c73', textAlign: 'center' },
  featurePremium:{ width: 90, fontFamily: 'Manrope_700Bold', fontSize: 11, color: '#3d6841', textAlign: 'center' },

  // Restaurar
  restaurarBtn: { alignItems: 'center', paddingVertical: 16, marginTop: 8 },
  restaurarText:{ fontFamily: 'Manrope_500Medium', fontSize: 13, color: '#797c73', textDecorationLine: 'underline' },

  // Siempre gratis
  siempreCard:  { backgroundColor: '#f5f4ed', borderRadius: 20, padding: 24, gap: 8 },
  siempreLabel: { fontFamily: 'Manrope_700Bold', fontSize: 9, color: '#797c73', letterSpacing: 1.5 },
  siempreTitulo:{ fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 18, color: '#31332c', letterSpacing: -0.3, lineHeight: 24 },
  siempreSub:   { fontFamily: 'Manrope_400Regular', fontSize: 13, color: '#5e6058', lineHeight: 20, marginTop: 2 },
});
