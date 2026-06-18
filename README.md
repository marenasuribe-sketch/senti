# 🌱 Senti

Aplicación móvil de bienestar mental personal. Un espacio tranquilo para entender cómo estás, sin juicios y sin prisa.

---

## ¿Qué es Senti?

Senti es una app de autocuidado que combina diario emocional, gratitud diaria y descarga mental, todo envuelto en un sistema de gamificación suave: una **planta que crece contigo** cada vez que vuelves a ti misma.

- Escribe cómo te sientes → la planta crece
- Registra lo que agradeces → la planta crece
- Suelta lo que pesa → la planta crece

---

## Stack

| Capa | Tecnología |
|---|---|
| Framework | React Native + Expo SDK 54 |
| Navegación | expo-router (file-based routing) |
| Base de datos | Supabase (PostgreSQL + auth) |
| Autenticación | Google OAuth via Supabase |
| IA | Anthropic Claude (análisis emocional del diario) |
| Transcripción audio | OpenAI Whisper |
| Almacenamiento local | AsyncStorage |
| Lenguaje | TypeScript |

---

## Requisitos previos

- Node.js 18+
- Expo CLI (`npm install -g expo-cli`)
- Expo Go instalado en el dispositivo móvil
- Cuenta en [Supabase](https://supabase.com) con el proyecto configurado
- API key de [Anthropic](https://console.anthropic.com)

---

## Instalación

```bash
# Clonar el repositorio
git clone <url-del-repo>
cd senti

# Instalar dependencias
npm install

# Copiar el archivo de entorno
cp .env.example .env
# → Completar las variables en .env

# Iniciar el servidor de desarrollo
npx expo start
```

Conectar desde Expo Go escaneando el QR, o abrir directamente en:
```
exp://192.168.1.106:8081
```
> El puerto puede variar entre 8081, 8083 y 8085 según disponibilidad.

---

## Variables de entorno

Crear un archivo `.env` en la raíz del proyecto (nunca lo subas al repositorio):

```env
EXPO_PUBLIC_ANTHROPIC_API_KEY=sk-ant-...
EXPO_PUBLIC_OPENAI_API_KEY=sk-proj-...
```

> **Nota de seguridad:** El prefijo `EXPO_PUBLIC_` embebe las variables en el bundle de la app. Ver [SECURITY_AUDIT.md](SECURITY_AUDIT.md) para entender el riesgo y la solución recomendada (Edge Function proxy).

---

## Estructura del proyecto

```
senti/
├── app/
│   ├── _layout.tsx              # Root layout — auth guard + fuentes
│   ├── (tabs)/
│   │   ├── _layout.tsx          # Tab bar navigation
│   │   ├── index.tsx            # 🌱 Mi Planta (home)
│   │   ├── gratitud.tsx         # 🙏 Gratitud diaria
│   │   ├── descarga.tsx         # 💧 Descarga emocional
│   │   ├── journal.tsx          # 📓 Diario + análisis IA
│   │   └── estado.tsx           # ✨ Estado semanal
│   ├── onboarding/
│   │   ├── index.tsx            # Bienvenida + Google Login
│   │   ├── intake.tsx           # 5 preguntas emocionales
│   │   └── planta.tsx           # Selección de planta
│   ├── capsula-nueva.tsx        # Crear cápsula del tiempo
│   ├── capsula-apertura.tsx     # Abrir cápsula lista
│   ├── historial-gratitud.tsx   # Historial completo de gratitudes
│   └── upgrade.tsx              # Pantalla de Senti+
├── lib/
│   ├── supabase.ts              # Cliente Supabase
│   ├── auth.ts                  # Google OAuth
│   ├── claude.ts                # Llamadas a Anthropic
│   ├── planta.ts                # Lógica de gotas y etapas
│   ├── capsulas.ts              # CRUD cápsulas del tiempo
│   ├── logros.ts                # Sistema de 18 logros
│   └── premium.ts               # Estado Senti+ y límites
├── components/                  # Componentes reutilizables
├── hooks/                       # Custom hooks
├── assets/                      # Imágenes e iconos
└── SECURITY_AUDIT.md            # Auditoría de seguridad
```

---

## Pantallas

### 🌱 Mi Planta
La pantalla home. Muestra la planta con animación de glow, el nivel de gotas acumuladas, las etapas de crecimiento y accesos directos a las otras secciones. También gestiona las **cápsulas del tiempo**.

### 🙏 Gratitud
Tres campos de texto para registrar momentos de gratitud del día. Cada guardado suma **+2 gotas** a la planta. Incluye acceso al historial completo y la cápsula mensual (Senti+).

### 💧 Descarga
Espacio para soltar lo que pesa. Flujo de 3 pasos: desahogo → tareas pendientes → foco del día. Suma **+2 gotas**. Disponible en texto o audio (Senti+).

### 📓 Diario
Entrada de texto libre + transcripción de audio (Whisper). Al guardar, Claude analiza la entrada emocionalmente y devuelve chips de emociones detectadas, métricas de estrés/calma/energía y una frase de cierre personalizada. Suma **+3 gotas**.

### ✨ Estado
Métricas semanales, patrones emocionales y recomendaciones personalizadas basadas en el historial.

---

## Sistema de planta

La planta es el eje de gamificación de Senti. Se elige en el onboarding y **no se puede cambiar** hasta completarla.

### Plantas disponibles

| Planta | Emoji | Personalidad |
|---|---|---|
| Bambú | 🎋 | Resiliente |
| Girasol | 🌻 | Optimista |
| Lavanda | 🪻 | Introspectiva |
| Cactus | 🌵 | Independiente |
| Helecho | 🌿 | Empático |

### Gotas por acción

| Acción | Gotas |
|---|---|
| Diario | +3 |
| Gratitud | +2 |
| Descarga | +2 |

### Etapas de crecimiento

| Etapa | Label | Gotas acumuladas |
|---|---|---|
| 1 | 🌰 Semilla | 0–89 |
| 2 | 🌱 Brote | 90–179 |
| 3 | 🪴 Enraizando | 180–269 |
| 4 | 🌸 Floreciendo | 270–359 |
| 5 | Emoji de la planta | 360–449 |

Al completar las 450 gotas la planta pasa al jardín y se puede elegir una nueva.

---

## Cápsulas del tiempo

El usuario puede escribirse una carta al futuro con fecha de apertura a 1, 3, 6 o 12 meses. La cápsula aparece en el Home como tarjeta, y cuando llega la fecha se puede abrir desde la pantalla de apertura.

Plan gratuito: 1 cápsula activa a la vez. Senti+: hasta 6.

---

## Sistema de logros

18 logros organizados en 6 categorías:

| Categoría | Ejemplos |
|---|---|
| Inicio | Tu primera gota, Tres anclajes, Primera descarga |
| Sentir | Le diste nombre a la tristeza, La rabia también es información |
| Constancia | Te elegiste 7 días, Te elegiste un mes, Aquí contigo (100 días) |
| Soltar | Guardiana del silencio, Corazón agradecido (30 gratitudes) |
| Voz | Tu voz contó algo, Le diste palabras a lo que no las tenía |
| Planta | Tu primera semilla, Una vida completa |

Los logros se guardan en `logros_usuario` y aparecen como modal suave justo después de la acción que los activa.

---

## Base de datos (Supabase)

### Tablas

| Tabla | Descripción |
|---|---|
| `gratitudes` | Registros de gratitud diaria |
| `journal` | Entradas de diario con análisis IA |
| `plantas_usuario` | Planta activa y puntos (gotas) por usuario |
| `capsulas` | Cápsulas del tiempo |
| `logros_usuario` | Logros desbloqueados |
| `perfiles` | Datos del usuario + estado premium |

### Esquema SQL mínimo

```sql
-- gratitudes
create table gratitudes (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  texto_1 text, texto_2 text, texto_3 text,
  created_at timestamptz default now()
);

-- journal
create table journal (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  texto text,
  analisis_ia text,
  estres int,
  via_audio boolean default false,
  es_descarga boolean default false,
  tags text[],
  created_at timestamptz default now()
);

-- plantas_usuario
create table plantas_usuario (
  id uuid primary key default gen_random_uuid(),
  user_id text not null unique,
  nombre text,       -- 'bambu' | 'girasol' | 'lavanda' | 'cactus' | 'helecho'
  puntos int default 0,
  nivel int default 1,
  created_at timestamptz default now()
);

-- capsulas
create table capsulas (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  texto text not null,
  fecha_apertura timestamptz not null,
  abierta boolean default false,
  respuesta text,
  created_at timestamptz default now()
);

-- logros_usuario
create table logros_usuario (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  logro_id text not null,
  created_at timestamptz default now(),
  unique(user_id, logro_id)
);

-- perfiles
create table perfiles (
  id uuid primary key default gen_random_uuid(),
  user_id text not null unique,
  es_premium boolean default false,
  premium_desde timestamptz,
  premium_hasta timestamptz,
  created_at timestamptz default now()
);
```

> Activar RLS en todas las tablas. Ver [SECURITY_AUDIT.md](SECURITY_AUDIT.md) para las policies recomendadas.

---

## Onboarding

Solo se muestra la primera vez. Flujo de 3 pasos:

1. **Bienvenida** — pantalla editorial + Google Login
2. **Intake** — 5 preguntas emocionales para personalizar la experiencia
3. **Planta** — selección de la planta compañera

Al completarse se guarda `onboarding_complete = 'true'` en AsyncStorage y el usuario accede a los tabs.

---

## Modelo de negocio

### Gratuito
Diario de texto, descarga básica, gratitud diaria, estado semanal, crecimiento de planta, 1 cápsula activa.

### Senti+ — $4.99/mes
Audio (grabación + transcripción Whisper), consejos guardados, cápsula mensual, historial completo, hasta 6 cápsulas, hasta 3 plantas simultáneas, jardín de plantas completadas.

Precio early adopter: CLP $25.000 de por vida (primeras 500 personas).

Las features premium se muestran con candado suave. El modal de upgrade tiene tono cálido, nunca agresivo.

---

## Inicio rápido en Windows

```powershell
# 1. Abrir PowerShell como administrador y desactivar firewall temporalmente
netsh advfirewall set allprofiles state off

# 2. Iniciar Expo desde la terminal de VS Code
npx expo start

# 3. Conectar Expo Go en el dispositivo
# Escanear QR o abrir: exp://192.168.1.106:8081

# 4. Al terminar: reactivar firewall
netsh advfirewall set allprofiles state on
```

---

## Seguridad

Ver [SECURITY_AUDIT.md](SECURITY_AUDIT.md) para el reporte completo. Los puntos más importantes:

- Las API keys en `.env` **no deben commitearse** (ya está en `.gitignore`)
- Activar RLS en todas las tablas de Supabase
- La solución a largo plazo para las API keys es un proxy via Supabase Edge Functions

---

## Licencia

Proyecto privado — uso personal.
