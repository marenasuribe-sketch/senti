# Ficha de Play Store — Senti

## Nombre de la app
Senti — Diario de bienestar

## Nombre corto (30 caracteres máx)
Senti

## Descripción corta (80 caracteres máx)
Tu espacio para escribir, soltar y crecer. Con IA que te escucha de verdad.

## Descripción larga (4000 caracteres máx)

Senti es tu compañera de bienestar emocional. Un espacio íntimo para escribir lo que sientes, soltar lo que pesa y ver cómo creces con el tiempo.

**Tu diario inteligente**
Escribe libremente cada día. Senti analiza tus palabras y te devuelve perspectivas emocionales reales: qué tan estresada, calmada o energizada estás. No es un diagnóstico — es un espejo honesto.

**Descarga emocional**
Cuando algo te agobia, Senti te acompaña en tres pasos simples: primero te deja desahogarse, luego ordena lo que puedes hacer, y finalmente te ayuda a enfocarte en lo que importa.

**Gratitud diaria**
Tres preguntas simples cada día para entrenar tu mente a ver lo bueno: un momento que disfrutaste, una persona que te importa, una pequeña victoria tuya.

**Tu planta crece contigo**
Cada vez que usas Senti, tu planta gana gotas de agua. Cuanto más constante seas, más florece. Es una forma visual de ver tu progreso real. Elige entre 5 especies gratuitas.

**Patrones que importan**
Tu pantalla de Estado muestra la semana con gráficos suaves: tu nivel de bienestar, tus días de racha, y perspectivas sobre tus patrones emocionales.

---

**Senti+ — Para ir más profundo**
- Análisis con IA: 4 por día con Claude Sonnet (el más potente)
- Audio en todas las pantallas con transcripción automática
- 13 plantas exclusivas adicionales
- Cápsulas del tiempo (hasta 6 activas)
- Consejos de IA guardados
- Exportar tu diario a PDF
- Memoria de IA extendida: patrones de meses, no solo días

---

Senti no reemplaza la terapia. Es el espacio entre sesiones, el lugar donde procesas el día, donde te escuchas antes de escuchar a los demás.

Empieza con tu planta. Riégala cada día. Lo demás viene solo.

## Categoría
Salud y bienestar

## Etiquetas
diario, bienestar, salud mental, gratitud, mindfulness, emociones, autoconocimiento, inteligencia artificial

## Clasificación de contenido
Para todos (PEGI 3 / Everyone)
Sin contenido violento, sin compras agresivas, sin datos de menores.

---

## Política de privacidad — URL PÚBLICA (REQUERIDA POR PLAY STORE)

**Opción más rápida — GitHub Pages (gratis):**
1. Crear repo público en GitHub: `sentiapp/privacy`
2. En Settings → Pages → Source: main branch, /docs folder
3. Crear `docs/index.html` con el contenido de `app/privacidad.tsx`
4. URL final: `https://sentiapp.github.io/privacy`

**Alternativa — Vercel (también gratis):**
1. Crear proyecto Next.js mínimo o HTML estático en Vercel
2. Pegar el contenido de la pantalla privacidad como HTML
3. Publicar en vercel.app

**URL a colocar en Play Console:** _(rellenar cuando esté publicada)_

---

## Assets requeridos

### Ícono
- `assets/icon.png` ✅ (ya configurado, 1024×1024px)

### Feature Graphic (1024×500px) — PENDIENTE
Banner horizontal para la ficha de Play Store.
- Fondo: `#3d6841` (verde sage)
- Logo "Senti" en blanco centrado + eslogan corto
- Hacerlo en Canva: nuevo diseño → tamaño personalizado 1024×500

### Capturas de pantalla (mínimo 2, recomendado 6)
Tamaño: 1080×1920px (portrait). Tomar desde Expo Go con datos reales:

1. **Tab Planta** — planta en etapa 2 o 3, con gotas y racha visibles
2. **Tab Gratitud** — con los 3 campos llenos y diseño editorial completo
3. **Tab Diario** — con análisis emocional desplegado (chips + barras)
4. **Tab Descarga** — flujo de 3 pasos visible
5. **Tab Estado** — gráfico de ola emocional + métricas de semana
6. **Pantalla Upgrade** — mostrando Senti+ (opcional)

Herramienta gratis para mockups bonitos: mockuphone.com o previewed.app

---

## RevenueCat — Checklist para activar pagos reales

El código está 100% integrado. Solo falta configurar las cuentas:

- [ ] Crear cuenta RevenueCat en https://app.revenuecat.com
- [ ] Agregar app Android con package `cl.sentiapp.app`
- [ ] Crear productos en Google Play Console:
  - `com.sentiapp.plus.monthly` → $4.99 USD / mes
  - `com.sentiapp.plus.annual` → $39.99 USD / año
- [ ] En RevenueCat → Entitlements: crear `senti_plus`, asociar los dos productos
- [ ] En RevenueCat → Offerings: crear "default" con los dos paquetes
- [ ] Copiar la API key Android (`goog_xxx`) desde RevenueCat → Project Settings → API Keys
- [ ] Agregar al .env local: `EXPO_PUBLIC_REVENUECAT_ANDROID_KEY=goog_xxx`
- [ ] Agregar como secreto EAS: `npx eas secret:create --scope project --name EXPO_PUBLIC_REVENUECAT_ANDROID_KEY --value goog_xxx`
- [ ] Configurar webhook en RevenueCat → Project Settings → Webhooks:
  - URL: `https://mumtrkgnfvfstdjtyiui.supabase.co/functions/v1/revenuecat-webhook`
  - Authorization: `Bearer <tu_webhook_secret>`
- [ ] Guardar el webhook secret en Supabase: `npx supabase secrets set REVENUECAT_WEBHOOK_SECRET=xxx --project-ref mumtrkgnfvfstdjtyiui`
- [ ] Build nativo con las keys: `npx eas build --platform android --profile preview`

---

## Checklist de QA antes de subir

### Flujo crítico
- [ ] Registro con Google funciona
- [ ] Onboarding completo (intake + selección de planta)
- [ ] Tab Planta: se ven gotas, racha, emoji correcto por etapa
- [ ] Tab Gratitud: guardar 3 campos suma gotas (+2)
- [ ] Tab Diario: escribir + analizar con IA funciona
- [ ] Tab Descarga: flujo 3 pasos funciona
- [ ] Tab Estado: se ven métricas de la semana y gráfico
- [ ] Cerrar sesión y volver a entrar: datos persisten

### Seguridad
- [ ] Usuario A no puede ver datos de Usuario B (RLS activo)
- [ ] Análisis de IA respeta el límite (gratis: 1/mes, premium: 4/día)

### Senti+
- [ ] Sin premium: features bloqueadas muestran candado
- [ ] Pantalla /upgrade se abre correctamente
- [ ] "Restaurar compra" funciona (una vez RevenueCat esté activo)

---

## Play Console — Pasos para publicar

1. Crear cuenta Google Play Console: https://play.google.com/console ($25 USD, pago único)
2. Crear nueva app → Android
3. Rellenar ficha: título, descripción corta, descripción larga (arriba)
4. Subir el .aab de producción:
   - Build existente: https://expo.dev/accounts/marenasu/projects/senti/builds/5680bf9c-5efb-4cc2-8df5-c5f1d6309622
   - O generar uno nuevo con keys de RevenueCat: `npx eas build --platform android --profile production`
5. Subir Feature Graphic (1024×500) y capturas de pantalla
6. Configurar precios de la suscripción Senti+ ($4.99 mensual, $39.99 anual)
7. Clasificación de contenido: completar cuestionario (respuestas: todo NO)
8. Política de privacidad: pegar URL pública
9. Enviar a revisión (Internal Testing primero, luego Production)
