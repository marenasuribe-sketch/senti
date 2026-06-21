# Auditoría Senti — Camino a Google Play
**Fecha:** 2026-06-19 (actualizada)

---

## Estado general

✅ **El código está listo para publicar.** RLS activo, sin credenciales expuestas, pagos integrados, política de privacidad actualizada según Ley 21.719. Lo único que falta son pasos externos (cuentas y configuración).

---

## Lo que está hecho al 2026-06-19

| Qué | Estado |
|---|---|
| RLS en todas las tablas (7 tablas protegidas) | ✅ SQL listo en `0001_rls_policies.sql` |
| Columna `perfiles.intake` para onboarding | ✅ SQL listo en `0002_perfiles_intake.sql` |
| RevenueCat integrado (SDK + webhook + layout) | ✅ Código completo |
| Webhook RevenueCat deployado en Supabase | ✅ Activo |
| Política de privacidad Ley 21.719 | ✅ `docs/index.html` + `app/privacidad.tsx` |
| HTML de privacidad para publicar (GitHub Pages) | ✅ `docs/index.html` |
| AvisoSenti en todas las pantallas que lo necesitan | ✅ (9 pantallas) |
| Bug audio multipart corregido (`lib/edge.ts`) | ✅ |
| Límites IA correctos (gratis=1/mes, premium=4/día) | ✅ |
| Grid Senti+ con flexWrap | ✅ |
| Textos de ficha Play Store | ✅ En `PLAYSTORE.md` |
| App funcionando en dispositivo real | ✅ Verificado con capturas |

---

## PENDIENTE — SQL en Supabase (REQUERIDO antes de publicar)

> Estos archivos ya existen en el repo pero hay que correrlos manualmente en Supabase.

### Paso 1: Ir a Supabase SQL Editor
`https://supabase.com/dashboard/project/mumtrkgnfvfstdjtyiui/sql`

### Paso 2: Correr 0001_rls_policies.sql
Pegar y ejecutar el contenido de `supabase/migrations/0001_rls_policies.sql`

### Paso 3: Correr 0002_perfiles_intake.sql
Pegar y ejecutar el contenido de `supabase/migrations/0002_perfiles_intake.sql`

### Verificar que quedó bien:
```sql
-- Debe devolver 0 filas (sin policies abiertas):
SELECT tablename, policyname, qual, with_check
FROM pg_policies
WHERE schemaname='public' AND (qual = 'true' OR with_check = 'true');

-- Debe devolver la columna intake:
SELECT column_name FROM information_schema.columns
WHERE table_name = 'perfiles' AND column_name = 'intake';
```

---

## PENDIENTE — Verificaciones externas (solo tú puedes)

### A. Probar audio en el celular
1. Abrir Descarga o Gratitud → tocar el micrófono → grabar → confirmar que transcribe el texto
2. Si falla: anotar el mensaje de error exacto y lo revisamos

### B. Edge Functions activas en Supabase
Ir a `https://supabase.com/dashboard/project/mumtrkgnfvfstdjtyiui/functions`
Confirmar que aparecen las 3:
- `analizar-journal`
- `transcribir-audio`
- `revenuecat-webhook`

Si falta `transcribir-audio`:
```
npx supabase functions deploy transcribir-audio --project-ref mumtrkgnfvfstdjtyiui
```

### C. Saldo y secrets en Supabase
- Supabase → Edge Functions → Secrets: confirmar `ANTHROPIC_API_KEY` y `OPENAI_API_KEY`
- platform.openai.com → Billing: confirmar que hay saldo

---

## Camino a Google Play — pasos en orden

### Bloque 1 — SQL y verificaciones (esta semana)
- [ ] Tú: correr `0001_rls_policies.sql` en Supabase SQL Editor
- [ ] Tú: correr `0002_perfiles_intake.sql` en Supabase SQL Editor
- [ ] Tú: probar audio en el celular
- [ ] Tú: confirmar Edge Functions activas

### Bloque 2 — Política de privacidad pública (esta semana)
El HTML ya está listo en `docs/index.html`. Solo hay que publicarlo:
- [ ] Tú: crear repo público en GitHub (ej. `sentiapp/privacy`)
- [ ] Tú: subir el archivo `docs/index.html` a ese repo
- [ ] Tú: activar GitHub Pages → Settings → Pages → Source: main → /root (o /docs)
- [ ] Tú: copiar la URL pública resultante (ej. `https://sentiapp.github.io/privacy`)

### Bloque 3 — RevenueCat (pagos)
Checklist completo en `PLAYSTORE.md`. Resumen:
- [ ] Tú: crear cuenta en revenuecat.com (gratis)
- [ ] Tú: crear cuenta Google Play Console ($25 USD)
- [ ] Tú: crear productos de suscripción en Google Play Console
- [ ] Tú: configurar RevenueCat con los productos
- [ ] Tú: copiar API key → agregar a `.env` + EAS secrets
- [ ] Tú: configurar webhook con su secret en Supabase

### Bloque 4 — Assets y build
- [ ] Tú: Feature Graphic 1024×500 en Canva (fondo #3d6841, logo blanco)
- [ ] Tú: 2-6 capturas de pantalla desde el celular
- [ ] Tú: nuevo build con keys de RevenueCat:
  ```
  npx eas build --platform android --profile production
  ```

### Bloque 5 — Publicación
- [ ] Tú: subir .aab + ficha + capturas + URL privacidad en Play Console
- [ ] Tú: clasificación de contenido (cuestionario en Play Console — todo NO)
- [ ] Tú: enviar a Internal Testing → producción
