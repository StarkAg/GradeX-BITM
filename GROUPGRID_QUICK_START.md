# GroupGrid Quick Start Guide

## ✅ **SQL Migration Complete!**

Your database tables are now set up. Here's what to do next:

---

## 🚀 **Next Steps**

### **1. (Optional) Seed Sample Data**

If you want to test with sample sections and subjects, run:

**File:** `supabase/seed_groupgrid_data.sql`

This will add:
- Sections: A, B, C, D, E
- Sample subjects for each section

**Or add your own data:**
```sql
-- Add your sections
INSERT INTO public.sections (name) VALUES
  ('Your Section Name')
ON CONFLICT (name) DO NOTHING;

-- Add subjects for a section
INSERT INTO public.subjects (name, section_id) VALUES
  ('Subject Name', (SELECT id FROM sections WHERE name = 'Your Section Name'))
ON CONFLICT (name, section_id) DO NOTHING;
```

---

### **2. Start Your Servers**

```bash
npm run dev:all
```

This starts:
- Express API server on `http://localhost:3000`
- Vite dev server on `http://localhost:5173`

---

### **3. Test the Feature**

1. **Navigate to:** `http://localhost:5173/groupgrid`

2. **You should see:**
   - Dashboard with 4 stats badges (all zeros initially)
   - Two action buttons: "Create Group Formation" and "Join Group Formation"

3. **Test Creating a Formation:**
   - Click "Create Group Formation"
   - Select a section (if you seeded data)
   - Select a subject
   - Adjust members per team (2-8)
   - Toggle "Include group title" if desired
   - Click "Create Formation"

4. **Test Joining a Formation:**
   - Click "Join Group Formation"
   - You should see the formation you just created
   - Click "Join" to join the formation
   - You'll be auto-assigned to a group

---

## 🔍 **Verify Everything Works**

### **Check API Endpoints:**

```bash
# Test stats endpoint
curl http://localhost:3000/api/groupgrid?action=get-stats

# Test sections endpoint
curl http://localhost:3000/api/groupgrid?action=get-sections

# Test subjects endpoint (replace SECTION_ID)
curl http://localhost:3000/api/groupgrid?action=get-subjects&section_id=YOUR_SECTION_ID
```

### **Check Database:**

In Supabase SQL Editor, run:
```sql
-- Check tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('sections', 'subjects', 'group_formations', 'groups', 'group_members');

-- Check sections
SELECT * FROM public.sections;

-- Check subjects
SELECT * FROM public.subjects;
```

---

## 🐛 **Troubleshooting**

### **Stats show zeros:**
- Normal if you haven't created any formations yet
- Create a formation to see stats update

### **"User not authenticated" error:**
- Make sure you're logged in
- Check `localStorage` has `gradex_user_id`

### **Dropdowns are empty:**
- Run the seed data SQL script
- Or manually add sections and subjects

### **API returns 404:**
- Make sure Express server is running on port 3000
- Check `server.js` has the groupgrid route registered

### **Can't create formation:**
- Check you have sections and subjects in database
- Verify you're logged in (check localStorage)

---

## 📊 **What's Working Now**

✅ Database tables created  
✅ RLS policies enabled  
✅ API routes registered  
✅ Frontend components ready  
✅ Styling applied  
✅ Routes enabled in App.jsx  

**GroupGrid is ready to use!** 🎉

---

## 🎯 **Quick Test Flow**

1. **Login** (if not already logged in)
2. **Go to** `/groupgrid`
3. **Create Formation:**
   - Section: A (or your section)
   - Subject: Data Structures (or your subject)
   - Members: 3
   - Include title: ✓
4. **Join Formation:**
   - Click "Join Group Formation"
   - Click "Join" on your formation
5. **Check Stats:**
   - Should show: 1 formation, 1 group, etc.

---

## 📝 **Next Features (Optional)**

- View my formations
- View my groups
- Leave a group
- Formation details page
- Close formation (creator only)

All the core functionality is working! 🚀

