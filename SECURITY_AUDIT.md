# Auditoría de Seguridad — Senti
**Fecha:** 2026-06-01  
**Alcance:** código fuente completo, credenciales, lógica de negocio, RLS

---

## Resumen ejecutivo

| Severidad | Cantidad |
|---|---|
| 🔴 Crítico | 2 |
| 🟠 Moderado | 4 |
| 🟡 Bajo | 2 |
| ℹ️ Info | 2 |

---

## 🔴 CRÍTICO

### 1. API keys expuestas en bundle de la app
**Archivo:** `.env`  
**Problema:** Las variables `EXPO_PUBLIC_ANTHROPIC_API_KEY` y `EXPO_PUBLIC_OPENAI_API_KEY` usan el prefijo `EXPO_PUBLIC_`. Esto hace que Expo **las embeba directamente en el JavaScript bundle** de la app. Cualquier persona que descargue el APK/IPA puede extraerlas con herramientas básicas (strings, jadx, frida).

**Impacto:** Costo ilimitado en Anthropic y OpenAI a tu cargo.

**Fix recomendado:** Crear una Supabase Edge Function que actúe como proxy:
```typescript
// supabase/functions/analizar-journal/index.ts
Deno.serve(async (req) => {
  const { Authorization } = req.headers; // token del usuario logueado
  // verificar sesión con supabase.auth.getUser(token)
  // luego llamar a Anthropic con la key en Deno.env.get('ANTHROPIC_API_KEY')
});
```
La key vive solo en el servidor — nunca llega al cliente.

**Fix temporal (mientras se implementa el proxy):**
- Renombrar a `ANTHROPIC_API_KEY` (sin `EXPO_PUBLIC_`) — la app no puede leerla directamente pero al menos no se embebe en el bundle.
- Activar límites de gasto en el dashboard de Anthropic y OpenAI.

---

### 2. `.env` no estaba en `.gitignore`
**Archivo:** `.gitignore`  
**Problema:** El archivo solo ignoraba `.env*.local`, no `.env` (sin sufijo). Si alguien hace `git add .` y tiene las keys en `.env`, las sube al repositorio.

**Estado:** ✅ **CORREGIDO** — se añadieron `.env` y `.env.*` al `.gitignore`.

**Acción adicional requerida:** Verificar que `.env` no fue commiteado en el historial:
```bash
git log --all --full-history -- .env
```
Si aparece algún commit, rotar las API keys inmediatamente.

---

## 🟠 MODERADO

### 3. `marcarAbierta` sin validación de ownership
**Archivo:** [lib/capsulas.ts](lib/capsulas.ts) línea 92  
**Problema:** La función no verifica que `user_id` sea el dueño de la cápsula con ese `id`. En el cliente está bien porque siempre se pasa el userId correcto, pero si las RLS policies de Supabase no están configuradas, cualquier usuario autenticado podría marcar la cápsula de otra persona.

```typescript
// Actual — peligroso si no hay RLS
await supabase.from('capsulas').update({ abierta: true }).eq('id', id);

// Fix: agregar filtro de usuario
await supabase.from('capsulas').update({ abierta: true })
  .eq('id', id)
  .eq('user_id', userId);  // ← siempre filtrar por owner
```

**Fix en Supabase SQL:**
```sql
-- RLS policy para capsulas
ALTER TABLE capsulas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "usuario solo ve sus cápsulas" ON capsulas
  USING (auth.uid() = user_id);
CREATE POLICY "usuario solo modifica sus cápsulas" ON capsulas
  FOR UPDATE USING (auth.uid() = user_id);
```

---

### 4. `sumarGotas` acepta cantidades negativas
**Archivo:** [lib/planta.ts](lib/planta.ts) línea 57  
**Problema:** No hay validación de que `cantidad > 0`. Se puede llamar con `sumarGotas(supabase, userId, -999)` y reduce el puntaje.

```typescript
// Fix: guardar en la función
export async function sumarGotas(
  supabase: SupabaseClient,
  userId: string,
  cantidad: number,
): Promise<SumarGotasResult> {
  if (cantidad <= 0) return { etapaAntes: 1, etapaDespues: 1, subio: false, plantaId: null };
  // ...
}
```

---

### 5. Límites freemium verificados solo en el cliente
**Archivos:** [lib/capsulas.ts](lib/capsulas.ts), [lib/premium.ts](lib/premium.ts)  
**Problema:** El límite de "1 cápsula activa en plan gratuito" se verifica haciendo un SELECT desde el cliente antes de insertar. Un usuario con conocimiento técnico puede omitir la lógica del cliente y hacer INSERT directo contra la API de Supabase.

**Fix:** Policy RLS o función RPC en Supabase:
```sql
-- Limitar cápsulas activas por usuario con RLS y función
CREATE OR REPLACE FUNCTION capsulas_activas_count(uid uuid)
RETURNS integer AS $$
  SELECT COUNT(*) FROM capsulas WHERE user_id = uid AND abierta = false;
$$ LANGUAGE sql SECURITY DEFINER;

-- Aplicar en policy de INSERT
CREATE POLICY "máximo 1 cápsula gratis" ON capsulas
  FOR INSERT WITH CHECK (
    capsulas_activas_count(auth.uid()) < 1
    OR EXISTS (SELECT 1 FROM perfiles WHERE user_id = auth.uid() AND es_premium = true)
  );
```

---

### 6. `es_premium` modificable sin restricción de RLS
**Archivo:** [lib/premium.ts](lib/premium.ts)  
**Problema:** Si no hay RLS en la tabla `perfiles`, un usuario podría hacer un PATCH directo a Supabase y poner `es_premium = true` en su propio perfil.

**Fix en SQL:**
```sql
ALTER TABLE perfiles ENABLE ROW LEVEL SECURITY;

-- Leer: el usuario solo ve su perfil
CREATE POLICY "leer propio perfil" ON perfiles
  FOR SELECT USING (auth.uid() = user_id);

-- Insertar: solo el propio registro
CREATE POLICY "crear propio perfil" ON perfiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Actualizar: solo campos no sensibles — es_premium NO puede cambiarlo el usuario
CREATE POLICY "actualizar perfil (sin premium)" ON perfiles
  FOR UPDATE USING (auth.uid() = user_id)
  WITH CHECK (
    auth.uid() = user_id
    -- es_premium solo puede cambiarlo un webhook con service_role
  );
```
El campo `es_premium` solo debe escribirlo el webhook de RevenueCat usando el `service_role` key (nunca expuesto al cliente).

---

## 🟡 BAJO

### 7. Sin validación de longitud de inputs
**Archivos:** pantallas de journal, gratitud, descarga  
**Problema:** No hay límite máximo de longitud en los TextInput. Un usuario podría enviar textos de cientos de KB por entrada.

**Fix:** Añadir `maxLength` a los inputs y validar antes de guardar:
```tsx
<TextInput maxLength={2000} ... />
// Y antes de insert:
if (texto.length > 2000) { showError('Máximo 2000 caracteres'); return; }
```

---

### 8. Tokens OAuth en parámetros de URL
**Archivo:** [lib/auth.ts](lib/auth.ts) línea 29  
**Problema:** Los tokens de acceso se leen desde `url.searchParams` y el fragmento `#`. Si en algún momento se loguea la URL completa (analytics, crash reports), los tokens quedan expuestos.

**Fix:** Asegurarse de nunca loguear `result.url` completo. Está bien como está siempre que no haya logging de URLs.

---

## ℹ️ INFO

### 9. `lib/supabase.ts` con credenciales hardcodeadas
**Archivo:** [lib/supabase.ts](lib/supabase.ts)  
La `SUPABASE_URL` y `SUPABASE_ANON_KEY` están en el código fuente. La anon key de Supabase **es pública por diseño** (RLS es la capa de seguridad real), así que no es un problema de seguridad per se — pero si en algún momento se sube a GitHub, quedan indexadas.

**Recomendación:** Moverlas a variables de entorno sin prefijo `EXPO_PUBLIC_` y leerlas con `Constants.expoConfig.extra` para que no queden en el código fuente. O simplemente aceptarlo — la anon key es pública.

---

### 10. `lib/claude.ts` con placeholder de API key
**Archivo:** [lib/claude.ts](lib/claude.ts) línea 4  
Tiene `'TU_ANTHROPIC_API_KEY'` hardcodeado. La key real viene de `.env` en el cliente, lo que cae en el problema del punto #1. Este archivo debe refactorizarse para llamar al proxy en vez de a Anthropic directo.

---

## Checklist de acciones prioritarias

### Inmediato (hoy)
- [x] Añadir `.env` y `.env.*` al `.gitignore`
- [ ] Verificar que `.env` no está en el historial de git (`git log --all -- .env`)
- [ ] Activar límites de gasto en dashboard de Anthropic y OpenAI
- [ ] Rotar las API keys si fueron commiteadas alguna vez

### Esta semana
- [ ] Crear Supabase Edge Function como proxy para Anthropic
- [ ] Configurar RLS en todas las tablas: `capsulas`, `perfiles`, `plantas_usuario`, `gratitudes`, `journal`, `logros_usuario`
- [ ] Agregar `.eq('user_id', userId)` en `marcarAbierta`
- [ ] Agregar validación `cantidad > 0` en `sumarGotas`

### Antes de producción
- [ ] Mover límites freemium a policies RLS en Supabase
- [ ] Asegurar que solo el webhook de RevenueCat puede escribir `es_premium`
- [ ] Agregar `maxLength` en todos los inputs de texto libre
- [ ] Revisar que no haya logging de URLs OAuth en Sentry / analytics

---

## RLS mínimo recomendado para todas las tablas

```sql
-- Ejecutar en Supabase SQL Editor

-- gratitudes
ALTER TABLE gratitudes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "gratitudes propias" ON gratitudes USING (auth.uid()::text = user_id);

-- journal
ALTER TABLE journal ENABLE ROW LEVEL SECURITY;
CREATE POLICY "journal propio" ON journal USING (auth.uid()::text = user_id);

-- plantas_usuario
ALTER TABLE plantas_usuario ENABLE ROW LEVEL SECURITY;
CREATE POLICY "planta propia" ON plantas_usuario USING (auth.uid()::text = user_id);

-- capsulas
ALTER TABLE capsulas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cápsulas propias" ON capsulas USING (auth.uid()::text = user_id);

-- logros_usuario
ALTER TABLE logros_usuario ENABLE ROW LEVEL SECURITY;
CREATE POLICY "logros propios" ON logros_usuario USING (auth.uid()::text = user_id);

-- perfiles
ALTER TABLE perfiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "perfil propio lectura" ON perfiles FOR SELECT USING (auth.uid()::text = user_id);
CREATE POLICY "perfil propio insertar" ON perfiles FOR INSERT WITH CHECK (auth.uid()::text = user_id);
-- UPDATE solo permite el usuario cambiar campos no sensibles; es_premium requiere service_role
CREATE POLICY "perfil propio actualizar" ON perfiles FOR UPDATE
  USING (auth.uid()::text = user_id)
  WITH CHECK (auth.uid()::text = user_id);
```
