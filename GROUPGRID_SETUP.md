# GroupGrid Setup Guide

## ✅ **What's Been Created**

### **1. Database Schema**
- **File:** `supabase/migrations/012_groupgrid_schema.sql`
- **Tables Created:**
  - `sections` - Section names
  - `subjects` - Subject names (linked to sections)
  - `group_formations` - Formation configurations
  - `groups` - Individual groups within formations
  - `group_members` - Members assigned to groups

### **2. API Routes**
- **File:** `api/groupgrid.js`
- **Endpoints:**
  - `GET /api/groupgrid?action=get-stats` - Get dashboard statistics
  - `GET /api/groupgrid?action=get-sections` - Get all sections
  - `GET /api/groupgrid?action=get-subjects&section_id=xxx` - Get subjects for a section
  - `POST /api/groupgrid?action=create-formation` - Create new formation
  - `GET /api/groupgrid?action=get-formations&status=open` - Get formations
  - `POST /api/groupgrid?action=join-formation` - Join a formation
  - `POST /api/groupgrid?action=close-formation` - Close a formation (creator only)

### **3. React Components**
- **Main Component:** `src/components/GroupGrid.jsx`
- **Sub-components:**
  - `src/components/groupgrid/CreateFormationModal.jsx`
  - `src/components/groupgrid/JoinFormationModal.jsx`

### **4. Styling**
- All GroupGrid styles added to `src/styles.css`
- Uses same font (AmericanCaptain/Bebas Neue) and icon as legacy version

---

## 🚀 **Setup Steps**

### **Step 1: Run Database Migration**

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Click **New Query**
4. Copy and paste the contents of `supabase/migrations/012_groupgrid_schema.sql`
5. Click **Run** to execute

**Verify:**
- All 5 tables should be created
- RLS policies should be enabled
- Permissions should be granted

### **Step 2: Seed Initial Data (Optional)**

You may want to add some initial sections and subjects:

```sql
-- Add sample sections
INSERT INTO public.sections (name) VALUES
  ('A'),
  ('B'),
  ('C'),
  ('D')
ON CONFLICT (name) DO NOTHING;

-- Add sample subjects (adjust section_id based on your data)
INSERT INTO public.subjects (name, section_id) VALUES
  ('Data Structures', (SELECT id FROM sections WHERE name = 'A')),
  ('Algorithms', (SELECT id FROM sections WHERE name = 'A')),
  ('Database Systems', (SELECT id FROM sections WHERE name = 'B'))
ON CONFLICT (name, section_id) DO NOTHING;
```

### **Step 3: Verify API Route**

The API route is already registered in `server.js`. Make sure your Express server is running:

```bash
npm run server
```

Test the API:
```bash
curl http://localhost:3000/api/groupgrid?action=get-stats
```

### **Step 4: Test the Frontend**

1. Start the development server:
   ```bash
   npm run dev:all
   ```

2. Navigate to: `http://localhost:5173/groupgrid`

3. You should see:
   - Dashboard with stats (all zeros initially)
   - Two action buttons: "Create Group Formation" and "Join Group Formation"

---

## 📋 **Feature Flow**

### **Creating a Formation:**

1. User clicks "Create Group Formation"
2. Modal opens with form:
   - Select Section (dropdown)
   - Select Subject (dropdown, filtered by section)
   - Set Members per Team (2-8, adjustable with arrows)
   - Toggle "Include group title" checkbox
3. On submit:
   - Validates inputs
   - Creates formation with status "open"
   - User becomes formation owner

### **Joining a Formation:**

1. User clicks "Join Group Formation"
2. Modal shows list of active formations
3. Each card displays:
   - Subject name
   - Section name
   - Members per team
   - Slots filled / total slots
   - Status (Open/Full)
4. User clicks "Join" on a formation
5. System:
   - Checks if user already joined
   - Finds group with least members
   - Creates new group if all are full
   - Auto-assigns user to group
   - Shows success/error feedback

---

## 🔒 **Security & Business Rules**

### **Implemented:**
- ✅ Only authenticated users can create/join
- ✅ Formation creator can close formation
- ✅ Closed formations cannot accept new joins
- ✅ Prevents duplicate joins (user can only join once per formation)
- ✅ Auto-assignment to group with least members
- ✅ Prevents overfilling groups
- ✅ RLS policies enabled on all tables
- ✅ Application-level validation for creator checks

### **Database Constraints:**
- `members_per_team` must be between 2 and 8
- `status` must be 'open' or 'closed'
- Unique constraint on `(group_id, user_id)` prevents duplicate memberships
- Foreign key constraints ensure data integrity

---

## 🎨 **UI Features**

- **Same styling as legacy GroupGrid:**
  - Font: AmericanCaptain / Bebas Neue
  - Icon: Grid icon (4 squares)
  - Color scheme matches app theme
  - Responsive design for mobile

- **Stats Dashboard:**
  - Groups Formed (total)
  - Sections Involved (distinct count)
  - Total Formations
  - Active Formations (open status)

---

## 🐛 **Troubleshooting**

### **Issue: Stats show zeros**
- **Solution:** Make sure you've run the database migration and seeded some data

### **Issue: "User not authenticated"**
- **Solution:** User must be logged in. Check `localStorage` for `gradex_user_id`

### **Issue: API returns 404**
- **Solution:** Make sure Express server is running on port 3000

### **Issue: Dropdowns are empty**
- **Solution:** Seed sections and subjects data in Supabase

### **Issue: Can't join formation**
- **Check:**
  - Formation status is "open"
  - User hasn't already joined
  - User is authenticated

---

## 📝 **Next Steps (Optional Enhancements)**

1. **View My Formations:** Show formations created by current user
2. **View My Groups:** Show groups user has joined
3. **Leave Group:** Allow users to leave a group
4. **Formation Details:** View detailed breakdown of groups and members
5. **Notifications:** Notify when groups are full or formations close
6. **Admin Panel:** Manage sections and subjects

---

## ✅ **Status**

- ✅ Database schema created
- ✅ API routes implemented
- ✅ Frontend components created
- ✅ Styling applied
- ✅ Routes enabled in App.jsx
- ✅ Navigation item enabled

**GroupGrid is ready to use!** 🎉

