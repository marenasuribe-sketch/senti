import { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';

const DIAS = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];
const BARS = [
  { h: 26, color: '#E4E0D6' },
  { h: 40, color: '#C4886A' },
  { h: 20, color: '#E4E0D6' },
  { h: 44, color: '#C4886A' },
  { h: 16, color: '#8AB88A' },
  { h: 10, color: '#8AB88A' },
  { h: 8,  color: '#8AB88A' },
];

const MEMORIES = [
  '"Cuando te diste un momento de silencio en la mañana, tu calma subió notablemente. ¿Qué tal si lo repetimos mañana?"',
  '"Hace unos días escribiste algo que te hizo sentir bien. Esos momentos importan más de lo que crees."',
  '"Los fines de semana tu estrés baja mucho. ¿Hay algo de ese ritmo que puedas traer entre semana?"',
];

function weekLabel() {
  const hoy = new Date();
  const lunes = new Date(hoy); lunes.setDate(hoy.getDate() - hoy.getDay() + 1);
  const domingo = new Date(lunes); domingo.setDate(lunes.getDate() + 6);
  const fmt = (d: Date) => d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
  return `Semana del ${fmt(lunes)} al ${fmt(domingo)}`;
}

export default function EstadoScreen() {
  const [tab, setTab] = useState<'semana' | 'mes'>('semana');
  const [memIdx, setMemIdx] = useState(0);
  const [memResp, setMemResp] = useState<'none' | 'no' | 'si'>('none');

  return (
    <ScrollView style={S.container} contentContainerStyle={S.content}>

      {/* TopBar logo */}
      <View style={S.topBar}>
        <View style={S.logoRow}>
          <Text style={S.logoEmoji}>🌿</Text>
          <Text style={S.logoText}>Senti</Text>
        </View>
        <Text style={S.subtitle}>{weekLabel()}</Text>
      </View>

      <View style={S.section}>

        {/* Métricas */}
        <View style={S.metricRow}>
          <View style={S.metric}>
            <Text style={[S.metricVal, { color: '#8AB88A' }]}>62</Text>
            <Text style={S.metricLbl}>Bienestar</Text>
          </View>
          <View style={S.metric}>
            <Text style={[S.metricVal, { color: '#C4886A' }]}>74</Text>
            <Text style={S.metricLbl}>Estrés</Text>
          </View>
          <View style={S.metric}>
            <Text style={[S.metricVal, { color: '#2C2820' }]}>5</Text>
            <Text style={S.metricLbl}>Días seguidos</Text>
          </View>
        </View>

        {/* Card semana */}
        <View style={S.card}>
          <Text style={S.secLabel}>Tu semana de un vistazo</Text>

          {/* Tabs */}
          <View style={S.tabRow}>
            <TouchableOpacity style={[S.tabBtn, tab === 'semana' && S.tabBtnActive]} onPress={() => setTab('semana')} activeOpacity={0.8}>
              <Text style={[S.tabText, tab === 'semana' && S.tabTextActive]}>Semana</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[S.tabBtn, tab === 'mes' && S.tabBtnActive]} onPress={() => setTab('mes')} activeOpacity={0.8}>
              <Text style={[S.tabText, tab === 'mes' && S.tabTextActive]}>Mes</Text>
            </TouchableOpacity>
          </View>

          {/* Barras */}
          <View style={S.barsContainer}>
            {BARS.map((b, i) => (
              <View key={i} style={S.barCol}>
                <View style={[S.bar, { height: b.h, backgroundColor: b.color }]} />
                <Text style={S.barLbl}>{DIAS[i]}</Text>
              </View>
            ))}
          </View>

          {/* Leyenda */}
          <View style={S.legend}>
            <View style={S.legendItem}><View style={[S.legendDot, { backgroundColor: '#C4886A' }]} /><Text style={S.legendText}>Estrés alto</Text></View>
            <View style={S.legendItem}><View style={[S.legendDot, { backgroundColor: '#8AB88A' }]} /><Text style={S.legendText}>Calma</Text></View>
            <View style={S.legendItem}><View style={[S.legendDot, { backgroundColor: '#E4E0D6' }]} /><Text style={S.legendText}>Neutro</Text></View>
          </View>
        </View>

        {/* Memory card */}
        <View style={S.memCard}>
          <View style={S.memHeader}>
            <View style={S.memAvatar}>
              <Text style={{ fontSize: 12 }}>🌱</Text>
            </View>
            <Text style={S.memLabel}>Tu amigo recuerda...</Text>
          </View>
          <View style={S.memBubble}>
            <Text style={S.memText}>{MEMORIES[memIdx]}</Text>
          </View>
          {memResp === 'none' && (
            <View style={S.memBtns}>
              <TouchableOpacity style={S.memBtnNo} onPress={() => { setMemIdx((memIdx + 1) % MEMORIES.length); }} activeOpacity={0.8}>
                <Text style={S.memBtnNoText}>Ahora no</Text>
              </TouchableOpacity>
              <TouchableOpacity style={S.memBtnSi} onPress={() => setMemResp('si')} activeOpacity={0.8}>
                <Text style={S.memBtnSiText}>Sí, lo anoto →</Text>
              </TouchableOpacity>
            </View>
          )}
          {memResp === 'si' && (
            <Text style={[S.memText, { color: '#5A8A5A', fontStyle: 'italic', marginTop: 4 }]}>Anotado ✓</Text>
          )}
        </View>

        {/* Recomendaciones */}
        <View style={S.card}>
          <Text style={S.secLabel}>Para esta semana</Text>

          <View style={S.recItem}>
            <View style={[S.recDot, { backgroundColor: '#C4886A' }]} />
            <View style={{ flex: 1 }}>
              <Text style={S.recText}>Los días con más reuniones son tus momentos de mayor estrés — intenta proteger al menos un bloque libre.</Text>
              <Text style={S.recTag}>Patrón detectado</Text>
            </View>
          </View>

          <View style={[S.recItem, { borderBottomWidth: 0, paddingBottom: 0 }]}>
            <View style={[S.recDot, { backgroundColor: '#8AB88A' }]} />
            <View style={{ flex: 1 }}>
              <Text style={S.recText}>El fin de semana tu calma sube mucho. ¿Qué haces diferente que puedas traer entre semana?</Text>
              <Text style={S.recTag}>Oportunidad detectada</Text>
            </View>
          </View>
        </View>

        {/* Link consejos */}
        <TouchableOpacity style={S.consejosLink} activeOpacity={0.8}>
          <Text style={S.consejosLinkText}>Ver mis consejos guardados →</Text>
        </TouchableOpacity>

      </View>
    </ScrollView>
  );
}

const S = StyleSheet.create({
  container:      { flex: 1, backgroundColor: '#F7F5F0' },
  content:        { paddingBottom: 32 },
  topBar:         { paddingHorizontal: 20, paddingTop: 60, paddingBottom: 14, borderBottomWidth: 0.5, borderBottomColor: '#E4E0D6' },
  logoRow:        { flexDirection: 'row', alignItems: 'center', gap: 6 },
  logoEmoji:      { fontSize: 18 },
  logoText:       { fontSize: 18, fontWeight: '700', color: '#31332c' },
  subtitle:       { fontSize: 11, color: '#A09890', marginTop: 4 },
  section:        { padding: 12, paddingHorizontal: 20 },
  secLabel:       { fontSize: 10, color: '#A09890', marginBottom: 7, letterSpacing: 0.3 },

  metricRow:      { flexDirection: 'row', gap: 8, marginBottom: 10 },
  metric:         { flex: 1, backgroundColor: '#F7F5F0', borderRadius: 10, padding: 10, alignItems: 'center' },
  metricVal:      { fontSize: 18, fontWeight: '500' },
  metricLbl:      { fontSize: 9, color: '#A09890', marginTop: 3, textAlign: 'center' },

  card:           { backgroundColor: '#fff', borderWidth: 0.5, borderColor: '#E4E0D6', borderRadius: 14, padding: 14, marginBottom: 10 },

  tabRow:         { flexDirection: 'row', borderWidth: 0.5, borderColor: '#E4E0D6', borderRadius: 10, overflow: 'hidden', marginBottom: 10 },
  tabBtn:         { flex: 1, paddingVertical: 7, alignItems: 'center', backgroundColor: '#fff' },
  tabBtnActive:   { backgroundColor: '#C8BCA8' },
  tabText:        { fontSize: 11, color: '#A09890' },
  tabTextActive:  { color: '#3D2E1E', fontWeight: '500' },

  barsContainer:  { flexDirection: 'row', alignItems: 'flex-end', gap: 5, height: 52, marginBottom: 6 },
  barCol:         { flex: 1, alignItems: 'center', gap: 3 },
  bar:            { width: '100%', borderRadius: 3, borderTopLeftRadius: 3, borderTopRightRadius: 3 },
  barLbl:         { fontSize: 9, color: '#A09890' },

  legend:         { flexDirection: 'row', gap: 10, marginTop: 4 },
  legendItem:     { flexDirection: 'row', alignItems: 'center', gap: 4 },
  legendDot:      { width: 8, height: 8, borderRadius: 2 },
  legendText:     { fontSize: 9, color: '#A09890' },

  memCard:        { backgroundColor: '#FDF8F2', borderWidth: 0.5, borderColor: '#E8D8C4', borderRadius: 14, padding: 14, marginBottom: 10 },
  memHeader:      { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  memAvatar:      { width: 28, height: 28, borderRadius: 14, backgroundColor: '#E8D8C4', alignItems: 'center', justifyContent: 'center' },
  memLabel:       { fontSize: 10, color: '#8A6A4A', fontWeight: '500' },
  memBubble:      { backgroundColor: '#fff', borderWidth: 0.5, borderColor: '#E8D8C4', borderTopRightRadius: 12, borderBottomRightRadius: 12, borderBottomLeftRadius: 12, padding: 10, paddingHorizontal: 12, marginBottom: 8 },
  memText:        { fontSize: 11, color: '#4A3A2A', lineHeight: 17 },
  memBtns:        { flexDirection: 'row', gap: 6 },
  memBtnNo:       { flex: 1, paddingVertical: 7, borderRadius: 9, borderWidth: 0.5, borderColor: '#E4E0D6', backgroundColor: '#F7F5F0', alignItems: 'center' },
  memBtnNoText:   { fontSize: 10, color: '#A09890' },
  memBtnSi:       { flex: 1, paddingVertical: 7, borderRadius: 9, backgroundColor: '#E8D8C4', alignItems: 'center' },
  memBtnSiText:   { fontSize: 10, color: '#4A3020', fontWeight: '500' },

  recItem:        { flexDirection: 'row', alignItems: 'flex-start', gap: 10, paddingVertical: 8, borderBottomWidth: 0.5, borderBottomColor: '#F0EDE6' },
  recDot:         { width: 7, height: 7, borderRadius: 4, flexShrink: 0, marginTop: 3 },
  recText:        { fontSize: 11, color: '#3A3530', lineHeight: 17 },
  recTag:         { fontSize: 9, color: '#A09890', marginTop: 2 },

  consejosLink:   { paddingVertical: 6, alignItems: 'center' },
  consejosLinkText: { fontSize: 10, color: '#8AB88A' },
});
