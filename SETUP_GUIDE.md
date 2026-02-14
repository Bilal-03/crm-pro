# 📖 Detailed Setup Guide

This guide will walk you through setting up CRM Pro from scratch.

## Table of Contents
1. [Prerequisites](#prerequisites)
2. [Project Setup](#project-setup)
3. [Supabase Configuration](#supabase-configuration)
4. [Database Setup](#database-setup)
5. [Running the App](#running-the-app)
6. [Troubleshooting](#troubleshooting)

---

## Prerequisites

Before you begin, ensure you have:

- **Node.js** (version 16 or higher)
  - Check: `node --version`
  - Download: https://nodejs.org/

- **npm** (comes with Node.js)
  - Check: `npm --version`

- **Git** (for cloning the repository)
  - Check: `git --version`
  - Download: https://git-scm.com/

- **A Supabase Account** (free)
  - Sign up: https://supabase.com

---

## Project Setup

### 1. Clone the Repository

```bash
git clone https://github.com/yourusername/crm-pro.git
cd crm-pro
```

### 2. Install Dependencies

```bash
npm install
```

This will install all required packages including:
- React
- Vite
- Tailwind CSS
- Supabase
- Framer Motion
- Recharts
- jsPDF
- and more...

---

## Supabase Configuration

### 1. Create a New Supabase Project

1. Go to https://supabase.com
2. Click "New Project"
3. Fill in:
   - **Name**: crm-pro (or your preferred name)
   - **Database Password**: Choose a strong password
   - **Region**: Select closest to you
4. Click "Create new project" and wait ~2 minutes

### 2. Get Your API Credentials

1. In your Supabase project dashboard, click **Settings** (gear icon)
2. Click **API** in the left sidebar
3. Copy these two values:
   - **Project URL** (under "Project URL")
   - **anon public** key (under "Project API keys")

### 3. Update crm-system.jsx

Open `crm-system.jsx` and find lines 66-67:

```javascript
const supabase = createClient(
  'YOUR_SUPABASE_URL',      // ← Paste your Project URL here
  'YOUR_SUPABASE_ANON_KEY'  // ← Paste your anon key here
);
```

Replace the placeholder strings with your actual credentials.

---

## Database Setup

### 1. Open SQL Editor

1. In your Supabase dashboard, click **SQL Editor** (in left sidebar)
2. Click **New query**

### 2. Run This SQL Script

Copy and paste this entire script, then click **Run**:

```sql
-- 1. Create leads table
CREATE TABLE leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users NOT NULL,
  name TEXT NOT NULL,
  company TEXT,
  email TEXT NOT NULL,
  phone TEXT,
  source TEXT,
  stage TEXT DEFAULT 'new',
  notes JSONB DEFAULT '[]',
  reminders JSONB DEFAULT '[]',
  quote_items JSONB DEFAULT '[]',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Create meetings table
CREATE TABLE meetings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users NOT NULL,
  lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  date_time TIMESTAMP WITH TIME ZONE NOT NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Create activities table
CREATE TABLE activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users NOT NULL,
  lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
  type TEXT NOT NULL,
  message TEXT NOT NULL,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Enable Row Level Security
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE meetings ENABLE ROW LEVEL SECURITY;
ALTER TABLE activities ENABLE ROW LEVEL SECURITY;

-- 5. Create RLS policies for leads
CREATE POLICY "Users can view their own leads" ON leads
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own leads" ON leads
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own leads" ON leads
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own leads" ON leads
  FOR DELETE USING (auth.uid() = user_id);

-- 6. Create RLS policies for meetings
CREATE POLICY "Users can view their own meetings" ON meetings
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own meetings" ON meetings
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own meetings" ON meetings
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own meetings" ON meetings
  FOR DELETE USING (auth.uid() = user_id);

-- 7. Create RLS policies for activities
CREATE POLICY "Users can view their own activities" ON activities
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own activities" ON activities
  FOR INSERT WITH CHECK (auth.uid() = user_id);
```

### 3. Verify Tables Were Created

1. Click **Table Editor** (in left sidebar)
2. You should see three tables: `leads`, `meetings`, `activities`

---

## Running the App

### 1. Start the Development Server

```bash
npm run dev
```

You should see output like:
```
VITE v5.4.21  ready in 258 ms
➜  Local:   http://localhost:5173/
```

### 2. Open Your Browser

Navigate to: **http://localhost:5173**

### 3. Create Your Account

1. Click "Don't have an account? Sign up"
2. Enter your email and password
3. Check your email for a confirmation link
4. Click the link to verify your email
5. Return to the app and log in

### 4. Start Using CRM Pro!

You can now:
- Add your first lead
- Create meetings
- Build quotes
- Track your pipeline

---

## Troubleshooting

### Issue: "Failed to add lead"

**Solution:** Check your Supabase credentials in `crm-system.jsx`. Make sure they're correct and the database tables exist.

### Issue: "Cannot find module 'X'"

**Solution:** Delete `node_modules` and reinstall:
```bash
rm -rf node_modules package-lock.json
npm install
```

### Issue: Tables don't show in Supabase

**Solution:** Make sure you ran the entire SQL script. Check for error messages in the SQL Editor.

### Issue: Can't sign up / Email not sending

**Solution:** In Supabase:
1. Go to **Authentication** → **Providers**
2. Make sure **Email** is enabled
3. For development, disable email confirmation temporarily in **Authentication** → **Email Templates**

### Issue: White screen / Nothing loads

**Solution:** 
1. Open browser console (F12)
2. Check for errors
3. Common fix: Clear cache and hard refresh (Ctrl+Shift+R or Cmd+Shift+R)

### Still Having Issues?

1. Check the browser console for errors (F12)
2. Check Supabase logs: **Logs** → **API**
3. Open an issue on GitHub with:
   - Error message
   - Steps to reproduce
   - Browser and OS info

---

## Next Steps

- ✅ Add your first lead
- ✅ Create a meeting
- ✅ Build a quote
- ✅ Customize the theme colors in `tailwind.config.js`
- ✅ Invite team members (Supabase Auth)
- ✅ Explore the analytics dashboard

**Need help?** Open an issue on GitHub or check the FAQ in the main README!

---

**Happy CRM-ing! 🚀**
