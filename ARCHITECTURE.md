# RAVEN App — Frontend Architecture Documentation

## Overview

**RAVEN** is a React + TypeScript mobile health monitoring app for POTS (Postural Orthostatic Tachycardia Syndrome) patients. It provides real-time vital sign monitoring, nutrition/hydration tracking, trend analysis, and a smart alert system.

**Stack:**
- Frontend: React 18 + TypeScript + Vite
- Backend-as-a-Service: Supabase (PostgreSQL + Auth + Realtime + Storage + Edge Functions)
- UI: Radix UI + Tailwind CSS + Framer Motion
- Charts: Recharts
- Notifications: Firebase Cloud Messaging (FCM)
- Mobile: Capacitor (Android/iOS)

---

## Project Structure

```
MDD-RAVEN-APP/
├── src/
│   ├── components/          # React pages and UI components
│   ├── contexts/            # Auth context
│   ├── context/             # Alert context
│   ├── hooks/               # Custom hooks (usePotsAlerts)
│   ├── services/            # Notification & FCM services
│   ├── lib/                 # Firebase config
│   ├── types/               # TypeScript interfaces (pots.ts)
│   └── utils/               # syncopeDetector utility
├── supabase/
│   ├── functions/           # Edge functions (Deno)
│   └── migrations/          # DB migrations
├── backend/                 # Python backend for food image detection
├── android/                 # Capacitor Android build
├── lib/supabase.ts          # Supabase client initialization
├── supabase_setup.sql       # Full database schema
└── package.json
```

---

## Database Schema

### Table: `public.profiles`

Stores basic user identity. Created automatically via trigger when a user signs up via Supabase Auth.

| Column | Type | Description |
|---|---|---|
| `id` | uuid (PK) | References `auth.users.id` |
| `username` | text | Display username |
| `full_name` | text | Full name |
| `avatar_url` | text | Profile picture URL |
| `created_at` | timestamptz | |
| `updated_at` | timestamptz | |

**RLS:** Users can only read/update their own row.

---

### Table: `public.user_settings`

User-specific app preferences and health goals.

| Column | Type | Default | Description |
|---|---|---|---|
| `id` | uuid (PK) | | References `profiles.id` |
| `sodium_goal` | integer | 2300 | Daily sodium target (mg) |
| `fluid_goal` | integer | 2000 | Daily fluid target (ml) |
| `dark_mode` | boolean | false | UI dark mode preference |
| `vital_alerts` | boolean | true | Enable vital sign alerts |
| `hydration_reminders` | boolean | true | Hydration reminder push notifications |
| `meal_tracking_reminders` | boolean | false | Meal reminder push notifications |
| `created_at` | timestamptz | | |
| `updated_at` | timestamptz | | |

**RLS:** Users can only read/update their own row.

---

### Table: `public.health_profile`

Biometric data collected during onboarding. Used by the alert engine to compute age-adjusted thresholds.

| Column | Type | Description |
|---|---|---|
| `user_id` | uuid (PK) | References `profiles.id` |
| `date_of_birth` | text | ISO date string |
| `biological_sex` | text | `'male'` \| `'female'` \| `'other'` |
| `height_cm` | numeric | Height in centimeters |
| `weight_kg` | numeric | Weight in kilograms |
| `bmi` | numeric | Calculated BMI |
| `updated_at` | timestamptz | |

**Upsert key:** `user_id`

---

### Table: `public.food_logs`

Every food item a user logs. Central table for the Nutrition section.

| Column | Type | Description |
|---|---|---|
| `id` | bigint (PK) | Auto-generated identity |
| `profile_id` | uuid | **FK → `profiles.id`** |
| `created_at` | timestamptz | Log timestamp |
| `food_name` | text | Identified food name |
| `portion_g` | numeric | Portion size in grams |
| `energy_kcal` | numeric | Calories |
| `sodium_mg` | numeric | Sodium content |
| `protein_g` | numeric | Protein |
| `carbs_g` | numeric | Carbohydrates |
| `fat_g` | numeric | Fat |
| `fiber_g` | numeric | Fiber |
| `sugar_g` | numeric | Sugar |
| `potassium_mg` | numeric | Potassium |
| `magnesium_mg` | numeric | Magnesium |
| `calcium_mg` | numeric | Calcium |
| `fluid_ml` | numeric | Fluid content of food |
| `caffeine_mg` | numeric | Caffeine content |
| `image_url` | text | Path in `food-images` storage bucket |
| `confidence` | double | AI detection confidence score |
| `serving_desc` | text | `'untouched'` \| `'quarter'` \| `'half'` \| `'three quarters'` \| `'full'` |
| `food_status` | boolean | Whether food was actually consumed |
| `utensil` | boolean | Whether utensil was detected in image |

**RLS:** Users can only CRUD their own rows (via `profile_id`).

---

### Table: `public.daily_intake`

Aggregated daily nutrition totals — updated when food logs change.

| Column | Type | Description |
|---|---|---|
| `user_id` | uuid | References `profiles.id` |
| `date` | text | Date string (e.g. `'2026-03-23'`) |
| `daily_sodium_goal` | number | Sodium goal for that day |

**Queried by:** HomeDashboard & NutritionSection to show daily goal progress.

---

### Table: `public.processed_vitals`

Real-time vital signs streamed from the wearable device.

| Column | Type | Description |
|---|---|---|
| `id` | text (PK) | Reading ID |
| `created_at` | text | Timestamp of reading |
| `heart_rate` | number | Heart rate (bpm) |
| `systolic` | number | Systolic blood pressure (mmHg) |
| `diastolic` | number | Diastolic blood pressure (mmHg) |
| `ptt_ms` | number \| null | Pulse Transit Time (ms) |
| `status` | text | Reading status |
| `session_id` | text | Monitoring session identifier |

**Real-time:** Supabase Realtime subscription listens for `INSERT` events filtered by `session_id`. This drives the POTS alert system.

---

### Table: `public.fcm_tokens`

Stores Firebase Cloud Messaging tokens per device for push notifications.

| Column | Type | Description |
|---|---|---|
| `id` | uuid (PK) | |
| `user_id` | uuid | References `profiles.id` |
| `token` | text | FCM token string |
| `platform` | text | `'web'` \| `'android'` |
| `created_at` | timestamptz | |
| `updated_at` | timestamptz | |

**Unique constraint:** `(user_id, token)` — upserted on conflict.

---

### Storage: `food-images` (Supabase Storage Bucket)

Stores food photos uploaded by the user. Public URLs are saved in `food_logs.image_url`.

---

## Table Relationships

```
auth.users
    │
    └── profiles (id = auth.users.id)
            │
            ├── user_settings (id = profiles.id)
            │
            ├── health_profile (user_id = profiles.id)
            │
            ├── food_logs (profile_id = profiles.id)
            │       │
            │       └── [image_url] → food-images bucket
            │
            ├── daily_intake (user_id = profiles.id)
            │
            └── fcm_tokens (user_id = profiles.id)

processed_vitals (standalone — inserted by wearable device)
    └── session_id → links to active monitoring session
```

---

## Application Pages & Components

### `LoginPage.tsx`
Handles both **Sign In** and **Sign Up** in a tabbed layout.

- Sign In → `supabase.auth.signInWithPassword()` → redirects to `/dashboard`
- Sign Up → `supabase.auth.signUp()` with username/full_name metadata → redirects to `/onboarding`
- Demo mode: sets `localStorage.demoMode = 'true'` and bypasses auth

---

### `BiodataOnboarding.tsx`
Multi-step health profile form shown only once after registration.

- Step 1: Full name, date of birth (auto-calculates age)
- Step 2: Biological sex, height (cm or ft/in), weight (kg or lbs), BMI auto-calculated
- Step 3: Summary review
- On save: **upserts** into `health_profile` → redirects to `/dashboard`

---

### `HomeDashboard.tsx`
The main landing page after login.

**Reads from:**
- `processed_vitals` — most recent 30 readings for current HR/BP display
- `food_logs` — today's entries, summed for sodium and fluid intake
- `daily_intake` — today's sodium goal

**Real-time:** Subscribes to `processed_vitals` INSERT events → triggers local `SyncopeDetector` for on-device alert logic.

**Displays:**
- Current heart rate, systolic and diastolic BP
- Daily sodium progress bar (vs. goal from `user_settings`)
- Daily fluid progress bar
- Alert banner if a POTS event is detected

---

### `NutritionSection.tsx`
Full nutrition tracking page with date filtering.

**Reads from:**
- `food_logs` — filtered by selected date range (today / yesterday / this week)
- `daily_intake` — sodium goal for selected day
- `food-images` storage bucket — displays uploaded food photos

**Features:**
- Nutrition plate (pie chart of macros)
- Editable portion sizes per log entry (`serving_desc` column)
- Daily sodium/sugar/calorie progress
- Adjustable sodium goal slider (3,000–10,000 mg)
- Food image gallery

---

### `HydrationTracker.tsx`
Visualises daily fluid intake.

**Reads from:** `food_logs` (sums `fluid_ml` column for today)

**Displays:**
- Animated water bottle SVG showing fill % toward `fluid_goal`
- Status badges: Goal Achieved / Good Hydration / Below Target

---

### `TrendsView.tsx`
Analytics and historical charts.

**Reads from:**
- `processed_vitals` — 7-day and 30-day HR and BP trends
- `food_logs` — historical sodium and hydration trends

**Features:**
- Line charts (Recharts) for HR, BP, sodium, hydration
- Event markers (dizzy episodes, medication, low hydration)
- Correlation insights (e.g. sodium + hydration impact)
- Export stubs (CSV, PDF)

---

### `SettingsView.tsx`
User profile and app preferences.

**Reads/updates:**
- `profiles` — display and edit username, full_name
- `user_settings` — sodium goal, fluid goal, alert toggles, notification toggles

**Features:**
- Dark mode toggle (also stored in `localStorage.darkMode`)
- Sign out (clears FCM token, calls `supabase.auth.signOut()`)

---

## Routing

```
/                     → redirects to /dashboard or /login
/login                → LoginPage (public)
/onboarding           → BiodataOnboarding (protected)
/dashboard/*          → MainApp shell with bottom tab nav (protected)
  /dashboard/home     → HomeDashboard
  /dashboard/nutrition → NutritionSection
  /dashboard/fluids   → HydrationTracker
  /dashboard/trends   → TrendsView
  /dashboard/settings → SettingsView
```

**`ProtectedRoute.tsx`** guards all `/dashboard` and `/onboarding` routes. If no authenticated user and no demo mode, redirects to `/login`.

---

## State Management

### `AuthContext` (`src/contexts/AuthContext.tsx`)

Provides global authentication state via React Context.

| Exported | Type | Description |
|---|---|---|
| `user` | `User \| null` | Current Supabase auth user |
| `loading` | `boolean` | Auth check in progress |
| `signIn(email, password)` | function | Calls `supabase.auth.signInWithPassword` |
| `signUp(email, password, ...)` | function | Calls `supabase.auth.signUp` |
| `signOut()` | function | Clears FCM token + calls `supabase.auth.signOut` |
| `supabase` | client | Exported Supabase client instance |

On `signIn` success, automatically calls `registerAndStoreFcmToken()` to store the device's push token in `fcm_tokens`.

---

### `AlertContext` (`src/context/AlertContext.tsx`)

Provides POTS alert state throughout the app.

| Exported | Type | Description |
|---|---|---|
| `activeAlert` | `PotsAlert \| null` | Currently displayed alert |
| `history` | `PotsAlert[]` | Last 20 alerts |
| `isLoading` | `boolean` | |
| `error` | `string \| null` | |
| `dismissAlert()` | function | Clears `activeAlert` (keeps in history) |

On new alert:
1. Plays audio tone (`playAlertTone()`)
2. Triggers vibration (`triggerVibration()`)
3. Sends push notification via `send-pots-alert` edge function
4. Auto-dismisses after 15 s (warning) or 30 s (critical)

---

## Alert Detection Engine

### `usePotsAlerts` (`src/hooks/usePotsAlerts.ts`)

The core clinical algorithm. Called by `AlertContext`.

**Flow:**
1. Fetches `health_profile` → computes patient age and sex
2. Subscribes to `processed_vitals` realtime channel filtered by `session_id`
3. Maintains a 10-minute rolling buffer of `VitalsReading[]`
4. On each new reading, calls `evaluateAlert()`:
   - Computes baseline from readings older than 5 minutes
   - Checks HR delta ≥ 20 bpm (warn) or ≥ 30 bpm (crit) — the clinical POTS definition
   - Checks absolute HR > 100–120 bpm
   - Checks SBP drop ≥ 20 mmHg
   - Checks HR/SBP trends via linear regression (slope per minute)
   - Age-adjusts thresholds: factor 0.75 (>60 y), 1.0 (adult), 1.1 (<20 y)
5. Debounces: suppresses identical alerts for 60 seconds
6. Returns a `PotsAlert` object if triggered, otherwise `null`

---

## Key TypeScript Types (`src/types/pots.ts`)

```typescript
interface VitalsReading {
  id: string
  timestamp: number           // Unix ms
  heartRate: number
  systolicBP: number
  diastolicBP: number
  pttMs: number | null
}

type TriggeredBy =
  | 'hr_delta'        // HR change from baseline
  | 'hr_absolute'     // Absolute HR threshold crossed
  | 'hr_trend'        // HR rising trend
  | 'sbp_drop'        // Systolic BP drop from baseline
  | 'sbp_absolute'    // Absolute SBP threshold crossed
  | 'sbp_trend'       // SBP falling trend

interface PotsAlert {
  severity: 'warning' | 'critical'
  triggeredBy: TriggeredBy[]
  currentHR: number
  currentSBP: number
  deltaHR: number             // Current minus baseline
  deltaSBP: number            // Baseline minus current (positive = drop)
  hrTrendBpmPerMin: number
  sbpTrendMmhgPerMin: number  // Positive = falling
  thresholds: AlertThresholds
  timestamp: number
}
```

---

## Data Flow Summaries

### Food Logging

```
User captures image
    → Image uploaded to food-images storage bucket
    → Python backend (backend/) runs food detection
    → Nutrition calculated
    → INSERT into food_logs (profile_id, food_name, sodium_mg, fluid_ml, ...)
    → daily_intake aggregate updated
    → NutritionSection & HomeDashboard re-fetch and display updated totals
```

### POTS Alert

```
Wearable device
    → INSERT into processed_vitals (heart_rate, systolic, diastolic, session_id)
    → Supabase Realtime broadcasts INSERT event
    → usePotsAlerts hook receives new reading
    → evaluateAlert() checks thresholds
    → PotsAlert created if triggered
    → AlertContext: plays tone + vibration + push notification
    → AlertBanner renders on screen
    → Auto-dismissed after 15–30 s
```

### Authentication

```
User registers
    → supabase.auth.signUp() creates auth.users row
    → DB trigger creates profiles row
    → Redirect to /onboarding
    → BiodataOnboarding upserts health_profile
    → Redirect to /dashboard

User logs in
    → supabase.auth.signInWithPassword()
    → FCM token registered and stored in fcm_tokens
    → Redirect to /dashboard

User logs out
    → FCM token deleted from fcm_tokens
    → supabase.auth.signOut()
    → Redirect to /login
```

---

## Services

### `notificationService.ts`

| Function | Description |
|---|---|
| `playAlertTone(severity)` | Web Audio API: 440 Hz × 2 beeps (warn), 880 Hz × 3 beeps (crit) |
| `triggerVibration(severity)` | Vibration API: `[200,100,200]` ms (warn), `[300,100,300,100,300]` ms (crit) |
| `dispatchPushNotification(alert)` | Calls `send-pots-alert` edge function; browser Notification on web |
| `initAndroidPushListeners(cb)` | Listens for FCM messages on Android via Capacitor Firebase plugin |

### `fcmTokenService.ts`

| Function | Description |
|---|---|
| `registerAndStoreFcmToken()` | Gets FCM token (web SW or Android native), upserts into `fcm_tokens` |
| `removeFcmToken(token)` | Deletes token row from `fcm_tokens` on logout |

---

## Edge Functions (`supabase/functions/`)

### `send-pots-alert`

Deno function invoked by `dispatchPushNotification()`.

- Receives a `PotsAlert` payload
- Queries `fcm_tokens` for all tokens belonging to the user
- Sends FCM push notification to each token via Firebase Admin SDK
- Returns delivery results

---

## Dark Mode

- Toggled in `SettingsView`
- Stored in `localStorage.darkMode` (`'true'` / `'false'`)
- Also persisted in `user_settings.dark_mode` on Supabase
- Passed as `darkMode: boolean` prop to all major page components
- Tailwind conditional classes applied inline throughout components
