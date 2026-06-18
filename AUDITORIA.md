# Auditoría Senti — Camino a Google Play
**Fecha:** 2026-06-18

Este documento lista **todo** lo que falta para publicar, sin sorpresas. Está
dividido entre lo que puede hacer Claude (código) y lo que solo puedes hacer tú
(cuentas, dashboards, dispositivo).

---

## Estado general

✅ **El código está sano.** Typecheck limpio, sin credenciales hardcodeadas, sin
TODOs colgando, RLS protegiendo los datos. Lo que falta para publicar es casi
todo **operacional** (config de cuentas externas, assets, despliegues), no código.

La razón de que "parecía lista pero siempre hay algo": los huecos estaban en
cosas que **no se ven en el código** — RLS en Supabase, si las Edge Functions
están desplegadas, si la OpenAI key tiene saldo, etc. Este documento los expone
todos de una vez.

---

## 1. Arreglado en esta sesión (ya está en el código)

| Qué | Estado |
|---|---|
| Seguridad: RLS en todas las tablas | ✅ Aplicado y verificado |
| Seguridad: API key de Anthropic rotada + historial git limpio | ✅ |
| Seguridad: webhook RevenueCat "falla cerrado" | ✅ |
| **Audio no transcribía** (multipart roto en `functions.invoke`) | ✅ Reescrito con `fetch` directo en `lib/edge.ts` |
| Modal de logro rediseñado (compacto, flotante) | ✅ |
| Componente `AvisoSenti` (avisos con diseño Senti) | ✅ Creado, aplicado en 1 pantalla |

---

## 2. Pendiente de código — lo puede hacer Claude

| Tarea | Detalle | Esfuerzo |
|---|---|---|
| Replicar `AvisoSenti` a las 8 pantallas restantes | ~38 `Alert.alert` grises del sistema → diseño Senti. Concordancia total. | Medio |
| Arreglar bug del intake | El onboarding guarda respuestas en `perfiles.intake`, columna que no existe → se pierde. Requiere migración SQL + ajustar grant. | Bajo |
| Generar política de privacidad en HTML | Ya existe el texto en `app/privacidad.tsx`. Convertirlo a HTML estático para publicar. | Bajo |
| Limpiar Alert obsoleto en `exportar-diario` | Mensaje "Paquetes faltantes" ya no aplica (expo-print/sharing están instalados). | Trivial |

---

## 3. Requiere verificación TUYA (no tengo acceso)

Estos son los que causan "sorpresas" — hay que mirarlos en los dashboards o en el
dispositivo:

### A. ¿El audio ya funciona? (probar tras el fix)
Acabo de reescribir el envío de audio. Para confirmar si quedó resuelto:
1. Recarga la app y graba un audio en Descarga.
2. Si funciona → listo.
3. Si sigue fallando, el mensaje de error ahora será claro (ya no "non-2xx").
   Anótalo y lo resolvemos. Las causas posibles restantes son B y C.

### B. ¿Está desplegada la función `transcribir-audio`?
El análisis del diario funciona, así que `analizar-journal` está desplegada. Pero
`transcribir-audio` podría no estarlo. Verifica en Supabase → Edge Functions que
aparezca en la lista. Si no, hay que desplegarla (ver paso en sección 4).

### C. ¿La OpenAI key tiene saldo y es válida?
El audio usa OpenAI Whisper. En [platform.openai.com](https://platform.openai.com)
→ Billing, confirma que la cuenta tiene saldo y la key del secret `OPENAI_API_KEY`
en Supabase es válida. Sin saldo, el audio falla aunque el código esté perfecto.

### D. ¿Están todos los secrets en Supabase?
En Supabase → Edge Functions → Secrets, confirma que existen:
`ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`,
`SUPABASE_SERVICE_ROLE_KEY`, y (cuando configures RevenueCat) `REVENUECAT_WEBHOOK_SECRET`.

---

## 4. Camino a Google Play — pasos en orden

### Bloque 1 — Dejar la app sin errores (PRIMERO)
- [ ] **Claude:** terminar `AvisoSenti` en todas las pantallas + arreglar intake
- [ ] **Tú:** verificar audio (sección 3A–C)
- [ ] **Tú:** probar el flujo completo en el dispositivo (los 5 tabs, onboarding,
      guardar gratitud/diario/descarga, que la planta sume gotas)

### Bloque 2 — RevenueCat (pagos)
Checklist completo en [PLAYSTORE.md](PLAYSTORE.md) sección RevenueCat. Resumen:
- [ ] **Tú:** crear cuenta RevenueCat + productos en Google Play
- [ ] **Tú:** copiar API key Android al `.env` y a EAS secrets
- [ ] **Tú:** configurar webhook con su secret en Supabase
- [ ] **Claude:** puede ayudar a verificar la integración en código

### Bloque 3 — Ficha de Play Store
- [ ] **Claude:** generar la política de privacidad en HTML
- [ ] **Tú:** publicarla (GitHub Pages o Vercel) y obtener la URL pública
- [ ] **Tú:** crear Feature Graphic 1024×500 (Canva)
- [ ] **Tú:** tomar capturas de pantalla (mín. 2, ideal 6)
- [x] Textos de la ficha (título, descripción) — ya están en PLAYSTORE.md

### Bloque 4 — Build y publicación
- [ ] **Tú:** desplegar Edge Functions si falta alguna:
      `npx supabase functions deploy transcribir-audio --project-ref mumtrkgnfvfstdjtyiui`
- [ ] **Tú:** cuenta Google Play Console ($25 USD, pago único)
- [ ] **Tú:** build de producción: `npx eas build --platform android --profile production`
- [ ] **Tú:** subir el .aab + completar ficha + clasificación de contenido
- [ ] **Tú:** enviar a revisión (primero Internal Testing, luego Production)

---

## 5. Resumen: qué falta de verdad

**Para que la app FUNCIONE sin errores (lo que pediste antes de subir):**
1. Confirmar que el audio quedó arreglado (probar) — sección 3A
2. Claude termina los avisos + el intake — sección 2
3. Probar el flujo completo en el dispositivo

**Para PUBLICAR (después de que funcione):**
4. RevenueCat + privacidad pública + assets + build + cuenta Play Console

Nada de esto es código roto — es configuración y pruebas. La base está sólida.
