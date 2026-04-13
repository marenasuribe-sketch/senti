# Senti — Contexto para Claude Code

## Lo primero al iniciar sesión
1. PowerShell administrador: `netsh advfirewall set allprofiles state off`
2. Terminal VS Code: `npx expo start`
3. Conectar Expo Go: `exp://192.168.1.106:8081` (puerto puede variar: 8081/8083/8085)
4. Al cerrar: volver a activar el firewall

## Proyecto
- **Ruta:** `C:\Projects\senti`
- **Framework:** React Native + Expo SDK 54
- **Navegación:** expo-router con tabs
- **Supabase URL:** `https://mumtrkgnfvfstdjtyiui.supabase.co`
- **Tablas:** `gratitudes`, `journal`, `plantas_usuario` (columnas: user_id, planta_id, gotas)
- **Variables de entorno:** `EXPO_PUBLIC_ANTHROPIC_API_KEY`, `EXPO_PUBLIC_OPENAI_API_KEY`

## Reglas de código que SIEMPRE se aplican
- Nunca copiar y pegar código manualmente — siempre editar archivos directamente
- Todas las pantallas tienen opción texto Y audio (Whisper para transcripción)
- Respetar el design system completo en cada componente
- Tono de voz: amiga cercana, nunca clínico ni genérico

---

## Design System

### Colores
```
background:               #fbf9f4  (fondo base — nunca usar blanco puro)
surface-container-low:    #f5f4ed  (secciones secundarias)
surface-container:        #efeee6  (inputs, áreas de escritura)
surface-container-highest:#e2e3d9  (bordes suaves)
surface-container-lowest: #ffffff  (cards elevados — solo para alta prioridad)
primary:                  #3d6841  (verde sage — botón principal, iconos activos)
primary-container:        #bfefbd  (verde claro — tab activo, chips seleccionados)
secondary-container:      #eee1cc  (botón secundario, beige dorado)
on-secondary-container:   #595141  (texto sobre botón secundario)
tertiary-container:       #f8f0e3  (cards de acento cálido)
on-surface:               #31332c  (títulos — negro cálido)
on-surface-variant:       #5e6058  (texto secundario)
outline:                  #797c73  (placeholders, labels)
outline-variant:          #b1b3a9  (bordes fantasma al 15% opacidad)
secondary:                #675e4d  (sombras tonales)
on-primary:               #e4ffe0  (texto sobre botón verde)
```

### Tipografía
```
Headline / Títulos:  Plus Jakarta Sans — weights 700, 800
Body / Labels:       Manrope — weights 400, 500, 600
```

| Uso | Fuente | Peso | Tamaño |
|---|---|---|---|
| Display hero | Plus Jakarta Sans | 800 | 3.5rem / 56px |
| Título pantalla | Plus Jakarta Sans | 700 | 2rem / 32px |
| Título card | Plus Jakarta Sans | 700 | 1.125rem / 18px |
| Body | Manrope | 400 | 1rem / 16px, line-height 1.6 |
| Label uppercase | Manrope | 700 | 10px, letter-spacing 0.1em |

### Espaciado
```
Padding horizontal pantalla:  24px
Entre secciones principales:  32px–48px
Padding interno de cards:     24px
Entre items de lista:         16px mínimo
Padding de inputs:            16px
```

### Border radius
```
Cards principales:    12px
Cards hero:           24px
Botones:              9999px (pill)
Inputs:               12px
Chips / tags:         9999px (pill)
Tab activo nav:       9999px (pill)
```

### Sombras (siempre tonales, nunca grises)
```
Cards:    box-shadow: 0 4px 24px -4px rgba(103, 94, 77, 0.06)
Nav bar:  box-shadow: 0 -4px 20px rgba(103, 94, 77, 0.04)
```

### Reglas de diseño — NUNCA romper estas reglas
1. Sin bordes sólidos de 1px — separar secciones solo con cambio de color de fondo
2. Sin dividers entre items — usar espacio vertical (16px+) o tonos alternos
3. Sin blanco puro de fondo — siempre #fbf9f4
4. Sin sombras grises — solo sombras tonales cálidas
5. Sin esquinas sharp — todo redondeado
6. Transiciones mínimo 300ms con ease
7. Espaciado generoso — 32px+ entre secciones

### Componentes

**Botón primario**
```jsx
style={{
  backgroundColor: '#3d6841',
  color: '#e4ffe0',
  borderRadius: 9999,
  paddingVertical: 16,
  paddingHorizontal: 24,
  fontFamily: 'PlusJakartaSans_700Bold',
  width: '100%'
}}
```

**Botón secundario**
```jsx
style={{
  backgroundColor: '#eee1cc',
  color: '#595141',
  borderRadius: 9999,
  paddingVertical: 16,
  paddingHorizontal: 24,
  fontFamily: 'PlusJakartaSans_700Bold',
  width: '100%'
}}
```

**Card elevado**
```jsx
style={{
  backgroundColor: '#ffffff',
  borderRadius: 12,
  padding: 24,
  shadowColor: 'rgba(103, 94, 77, 1)',
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.06,
  shadowRadius: 24,
}}
```

**Input field**
```jsx
style={{
  backgroundColor: '#e2e3d9',
  borderRadius: 12,
  padding: 16,
  fontFamily: 'Manrope_400Regular',
  fontSize: 16,
  color: '#31332c',
  borderWidth: 0,
}}
```

**Bottom Navigation**
```jsx
// Nav bar container
style={{
  backgroundColor: 'rgba(251, 249, 244, 0.92)',
  borderTopWidth: 0.5,
  borderTopColor: '#e2e3d9',
  borderTopLeftRadius: 24,
  borderTopRightRadius: 24,
}}
// Icono activo
style={{ backgroundColor: '#bfefbd', borderRadius: 9999, padding: 10 }}
// Icono inactivo: color #5e6058
```

---

## Las 5 pantallas

### 1. Mi Planta (tab home)
- Ilustración grande de la planta centrada
- Card con gotas acumuladas + racha de días
- Botón "Regar hoy" (suma gotas)
- Mensaje de personalidad según la planta elegida
- Celebración modal cada 5 gotas

### 2. Gratitud
- Título display grande editorial
- 3 inputs con labels uppercase
- Botón "Guardar reflexiones"
- Sección "Esta semana" + botón "Ver historial →"
- Card Cápsula Mensual bloqueada (premium)
- Opción audio en cada input

### 3. Descarga
- Header fondo #EEF0F5 con nube
- Flujo 3 pasos: Desahogo → Tareas → Foco
- Botón urgente: "Necesito descargar este sentimiento 🌊"
- Tono: amiga cercana, no clínico
- Opción texto o audio

### 4. Diario
- Input texto libre + botón audio
- Llamada a Claude API para análisis emocional
- Chips de emociones detectadas
- Barras estrés / calma / energía
- Frase de cierre personalizada
- Guardar en tabla `journal`

### 5. Estado
- Métricas semanales
- Gráfico suave de patrones emocionales
- Fragmentos de memoria del agente
- Recomendaciones personalizadas

---

## Sistema de plantas

Planta permanente — se guarda en `plantas_usuario`. No se puede cambiar hasta completarla.

| Planta | Emoji | Personalidad |
|---|---|---|
| Bambú | 🎋 | Resiliente |
| Girasol | 🌻 | Optimista |
| Lavanda | 🪻 | Introspectiva |
| Cactus | 🌵 | Independiente |
| Helecho | 🌿 | Empático |

### Gotas por acción
```
Diario:   +3 gotas
Gratitud: +2 gotas
Descarga: +2 gotas
```

### Etapas de crecimiento
```
0–20   → semilla 🌰
21–50  → brote 🌱
51–100 → raíces 🌿
101–160→ floreciendo 🌸
161–200→ completa 🌳 → va al jardín + usuario elige nueva planta
```

---

## Gamificación (V2 — no codear aún)
- Logros desbloqueables (primera semilla, raíces profundas, corazón agradecido, etc.)
- Rituales diarios con notificaciones mañana / tarde / noche
- Sorpresas por consistencia (día 3, 7, 14, 30)
- Jardín de plantas completadas

## Freemium (implementar al final)
**Gratis:** diario texto, descarga básica, gratitud, estado semanal, crecimiento planta
**Premium $4.99/mes:** audio, consejos guardados, cápsula mensual, historial completo, jardín completo
- Mostrar candado sutil en features premium
- Modal de upgrade en tono cálido, nunca agresivo

---

## Onboarding (solo primera vez)
1. Pantalla bienvenida + Google Login via Supabase Auth
2. 5 preguntas emocionales de intake
3. Selección de planta con descripción de personalidad
