# AI Fitness Coach — Full Product Layout

## 1. Product Idea

**AI Fitness Coach** is a web app where users log meals, body weight, workouts, and goals. The app estimates calories/macros, tracks progress, predicts future weight, and gives daily coaching feedback.

The goal is not to be another calorie tracker. The goal is to help users stay consistent.

---

## 2. Core User Flow

```txt
User signs up
↓
Inputs profile:
- height
- weight
- goal weight
- target timeline
- activity level
- diet preference
↓
AI generates daily calorie + protein target
↓
User logs meals / uploads food photos
↓
AI estimates calories and macros
↓
User logs weight and workouts
↓
Dashboard updates progress
↓
AI gives daily coaching advice
```

---

## 3. MVP Features

### 3.1 User Onboarding

Collect:

- Name
- Age
- Sex, optional
- Height
- Current weight
- Goal weight
- Goal type
  - fat loss
  - muscle gain
  - maintenance
- Activity level
- Dietary preferences
- Injury limitations

Output:

```txt
Daily calorie target: 2,150 kcal
Protein target: 160 g
Expected weekly weight change: -0.5 to -0.8 kg
```

---

### 3.2 Daily Meal Logging

User can log food by text:

```txt
Breakfast: sausage egg McMuffin, hash brown, black coffee
Lunch: BCD tofu soup with galbi combo
Dinner: chicken breast, rice, vegetables
```

AI extracts:

```json
{
  "calories": 2350,
  "protein_g": 135,
  "carbs_g": 210,
  "fat_g": 95
}
```

---

### 3.3 Photo Meal Logging

User uploads a food photo.

AI estimates:

- food items
- portion size
- calories
- protein
- carbs
- fat
- confidence level

Example output:

```txt
Detected:
- grilled short rib
- rice
- tofu soup
- side dishes

Estimated calories: 1,150–1,450 kcal
Protein: 55–75 g
Confidence: medium
```

---

### 3.4 Weight Tracking

User enters daily or weekly weight.

Dashboard shows:

- current weight
- 7-day average
- 30-day trend
- projected weight in 30 days
- progress toward goal

Example:

```txt
Current: 108.0 kg
7-day average: 107.4 kg
Goal: 100.0 kg
Estimated goal date: September 15
```

---

### 3.5 AI Daily Coach

Every day, AI summarizes progress:

```txt
You are 350 kcal over target today, but your weekly average is still on track.
Try a high-protein, low-fat dinner tomorrow.
Your protein intake is slightly low, so prioritize chicken, fish, Greek yogurt, or protein shake.
```

Tone should be direct, supportive, and not overly medical.

---

## 4. Main Pages

## 4.1 Landing Page

Purpose: explain the product in 10 seconds.

Sections:

```txt
Hero:
AI fitness coach that tracks meals, weight, and progress for you.

CTA:
Start tracking

Feature blocks:
- Log meals by text or photo
- Get calorie and protein estimates
- Track weight trend
- Receive daily AI coaching
- Predict progress
```

---

## 4.2 Dashboard

Main screen after login.

Layout:

```txt
--------------------------------------------------
Top Navbar
--------------------------------------------------
Today Summary Card
- Calories eaten / target
- Protein eaten / target
- Weight trend
- Weekly status
--------------------------------------------------
AI Coach Card
- Daily feedback
- Suggested next meal
--------------------------------------------------
Charts
- Weight trend
- Calories trend
- Protein trend
--------------------------------------------------
Recent Logs
- meals
- workouts
- weight entries
--------------------------------------------------
```

---

## 4.3 Meal Log Page

Features:

- text input
- food photo upload
- edit AI estimate
- save meal
- view meal history

Layout:

```txt
[Text box]
"What did you eat?"

[Upload photo]

[Analyze Meal]

AI Result:
- calories
- protein
- carbs
- fat
- confidence

[Edit] [Save]
```

---

## 4.4 Weight Page

Features:

- add weight entry
- view weight history
- 7-day average
- prediction chart

Charts:

```txt
Weight over time
Goal progress
Projected goal date
```

---

## 4.5 Workout Page

MVP workout logging can be simple.

User logs:

- workout type
- duration
- intensity
- notes

Examples:

```txt
Strength training, 60 min, medium intensity
Walking, 30 min
Basketball, 90 min
```

AI can estimate calories burned, but it should mark it as approximate.

---

## 4.6 Coach Chat Page

A chat interface for questions like:

```txt
Can I eat Korean BBQ tonight and still stay on track?
What should I eat after a heavy lunch?
Create a 3-day meal plan with high protein.
I am hungry at night, what should I do?
```

AI should use the user's actual data:

- today's calories
- weekly average
- weight trend
- goal
- dietary preferences

---

## 5. Architecture

```txt
Next.js Frontend on Vercel
        │
        ▼
Next.js API Routes / Server Actions
        │
        ├── Auth
        ├── Meal logging
        ├── Weight logging
        ├── Workout logging
        └── AI coaching requests
        │
        ▼
Database
TiDB / Postgres / Supabase
        │
        ▼
AI Layer
OpenAI / Claude API
        │
        ├── text meal parsing
        ├── image meal estimation
        ├── daily coaching
        └── progress summary
```

Optional production architecture:

```txt
Vercel Frontend
        │
        ▼
FastAPI Backend on Render / Railway
        │
        ├── AI processing
        ├── image handling
        ├── scheduled summaries
        └── long-running jobs
        │
        ▼
Cloud Storage
Cloudflare R2 / S3
        │
        ▼
Database
TiDB / Postgres
```

---

## 6. Recommended Tech Stack

### Frontend

```txt
Next.js
TypeScript
Tailwind CSS
shadcn/ui
Recharts
```

### Backend

MVP:

```txt
Next.js API routes
```

More scalable:

```txt
FastAPI
Python
Celery / RQ / background worker
```

### Database

Good options:

```txt
TiDB Serverless
Neon Postgres
Supabase Postgres
```

### Auth

```txt
Clerk
NextAuth
Supabase Auth
```

### AI

```txt
GPT-5.5 / GPT-4.1 / Claude
Vision model for food photos
```

### Storage

```txt
Cloudflare R2
AWS S3
Supabase Storage
```

---

## 7. Database Schema

### users

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### user_profiles

```sql
CREATE TABLE user_profiles (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  height_cm INT,
  current_weight_kg DECIMAL(5,2),
  goal_weight_kg DECIMAL(5,2),
  activity_level TEXT,
  goal_type TEXT,
  target_calories INT,
  target_protein_g INT,
  dietary_preferences TEXT,
  injury_notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### meals

```sql
CREATE TABLE meals (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  meal_type TEXT,
  raw_input TEXT,
  image_url TEXT,
  calories INT,
  protein_g DECIMAL(6,2),
  carbs_g DECIMAL(6,2),
  fat_g DECIMAL(6,2),
  confidence TEXT,
  eaten_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### weight_entries

```sql
CREATE TABLE weight_entries (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  weight_kg DECIMAL(5,2),
  logged_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### workouts

```sql
CREATE TABLE workouts (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  workout_type TEXT,
  duration_min INT,
  intensity TEXT,
  estimated_calories INT,
  notes TEXT,
  logged_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### coach_messages

```sql
CREATE TABLE coach_messages (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  role TEXT,
  content TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

---

## 8. AI Prompts

### 8.1 Meal Parsing Prompt

```txt
You are a nutrition estimation assistant.
Given a user's meal description, estimate calories, protein, carbs, and fat.
Return JSON only.
If uncertain, provide a range and confidence level.
Do not claim medical certainty.
```

Expected JSON:

```json
{
  "items": [
    {
      "name": "sausage egg McMuffin",
      "estimated_calories": 480,
      "protein_g": 20,
      "carbs_g": 30,
      "fat_g": 30
    }
  ],
  "total_calories": 480,
  "total_protein_g": 20,
  "total_carbs_g": 30,
  "total_fat_g": 30,
  "confidence": "medium"
}
```

---

### 8.2 Daily Coaching Prompt

```txt
You are an AI fitness coach.
Use the user's calorie target, protein target, meal logs, workout logs, and weight trend.
Give direct but supportive advice.
Focus on consistency, not perfection.
Avoid medical diagnosis.
Keep the response under 150 words.
```

---

## 9. API Routes

### Auth

```txt
POST /api/auth/signup
POST /api/auth/login
```

### Profile

```txt
GET /api/profile
POST /api/profile
PATCH /api/profile
```

### Meals

```txt
GET /api/meals
POST /api/meals/text
POST /api/meals/image
PATCH /api/meals/:id
DELETE /api/meals/:id
```

### Weight

```txt
GET /api/weight
POST /api/weight
DELETE /api/weight/:id
```

### Workouts

```txt
GET /api/workouts
POST /api/workouts
DELETE /api/workouts/:id
```

### Coach

```txt
POST /api/coach/daily-summary
POST /api/coach/chat
```

---

## 10. MVP Roadmap

## Week 1 — Basic App

Build:

- landing page
- auth
- profile setup
- dashboard shell
- database tables

---

## Week 2 — Meal Logging

Build:

- text meal logging
- AI calorie estimation
- edit meal estimate
- daily calorie summary

---

## Week 3 — Weight Tracking

Build:

- weight input
- weight chart
- 7-day average
- basic prediction

---

## Week 4 — AI Coach

Build:

- daily summary
- coach chat
- weekly progress feedback

---

## Week 5 — Photo Logging

Build:

- upload food image
- AI image analysis
- save image meal estimate

---

## Week 6 — Polish

Build:

- mobile UI
- loading states
- error handling
- demo account
- deploy
- README
- product demo video

---

## 11. Resume Bullet Examples

```txt
Built an AI fitness coach web app using Next.js, TypeScript, TiDB, and OpenAI Vision to estimate meal calories from text and images.
```

```txt
Implemented personalized weight-loss analytics including calorie tracking, protein targets, 7-day weight trends, and goal-date prediction.
```

```txt
Designed AI coaching workflows that summarize daily nutrition behavior and generate personalized recommendations from user logs.
```

---

## 12. Demo Script

```txt
1. User signs up
2. User enters 186 cm, 108 kg, goal 100 kg
3. App generates calorie/protein target
4. User logs BCD tofu soup + galbi combo
5. AI estimates calories and protein
6. Dashboard updates daily intake
7. User logs weight
8. AI coach gives practical advice
9. Chart predicts progress toward 100 kg
```

---

## 13. Future Features

- barcode scanning
- restaurant meal database
- Apple Health integration
- wearable integration
- workout plan generator
- grocery list generator
- social accountability groups
- meal prep planner
- cheat meal budgeting
- weekly PDF report
- coach personality settings

---

## 14. Key Product Principle

The app should not shame the user.

The app should answer:

```txt
What happened today?
Am I still on track?
What should I do next?
```

That is the real value.
