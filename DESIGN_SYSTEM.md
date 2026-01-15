# GradeX Design System

A comprehensive design system summary for consistent styling across projects.

## 🎨 Color Palette

### Dark Theme (Default)

#### Background Colors
```css
--bg-primary: #020202;           /* Main background - Almost black */
--bg-secondary: #0a0a0a;          /* Secondary background - Very dark gray */
--card-bg: rgba(10, 10, 10, 0.7); /* Card background with transparency */
--card-bg-form: rgba(10, 10, 10, 0.6); /* Form card background */
--input-bg: rgba(0, 0, 0, 0.6);  /* Input field background */
--stat-bg: rgba(0, 0, 0, 0.4);   /* Statistics/stat card background */
--splash-bg: #020202;             /* Splash screen background */
```

#### Text Colors
```css
--text-primary: #f5f5f5;                    /* Main text - Off white */
--text-secondary: rgba(245, 245, 245, 0.5); /* Secondary text - 50% opacity */
--text-tertiary: rgba(245, 245, 245, 0.35); /* Tertiary text - 35% opacity */
--splash-text: #f5f5f5;                    /* Splash screen text */
```

#### Border & Interactive Colors
```css
--border-color: rgba(245, 245, 245, 0.12);  /* Default border - 12% opacity */
--border-hover: rgba(245, 245, 245, 0.3);   /* Hover border - 30% opacity */
--hover-bg: rgba(245, 245, 245, 0.06);      /* Hover background - 6% opacity */
--splash-overlay: rgba(245, 245, 245, 0.03); /* Splash overlay - 3% opacity */
```

### Light Theme

#### Background Colors
```css
--bg-primary: #f8f8f8;                      /* Main background - Light gray */
--bg-secondary: #ffffff;                    /* Secondary background - White */
--card-bg: rgba(255, 255, 255, 0.9);        /* Card background */
--card-bg-form: rgba(255, 255, 255, 0.8);   /* Form card background */
--input-bg: rgba(255, 255, 255, 0.9);       /* Input field background */
--stat-bg: rgba(245, 245, 245, 0.6);        /* Statistics background */
--splash-bg: #f8f8f8;                      /* Splash screen background */
```

#### Text Colors
```css
--text-primary: #1a1a1a;                    /* Main text - Dark gray */
--text-secondary: rgba(26, 26, 26, 0.6);   /* Secondary text - 60% opacity */
--text-tertiary: rgba(26, 26, 26, 0.4);    /* Tertiary text - 40% opacity */
--splash-text: #1a1a1a;                    /* Splash screen text */
```

#### Border & Interactive Colors
```css
--border-color: rgba(26, 26, 26, 0.15);     /* Default border - 15% opacity */
--border-hover: rgba(26, 26, 26, 0.3);      /* Hover border - 30% opacity */
--hover-bg: rgba(26, 26, 26, 0.08);         /* Hover background - 8% opacity */
--splash-overlay: rgba(26, 26, 26, 0.05);   /* Splash overlay - 5% opacity */
```

### Accent Colors

#### Primary Accents (Blue)
```css
/* Blue gradient for badges/buttons */
background: linear-gradient(120deg, #3b82f6, #06b6d4);
/* Blue glow effects */
rgba(59, 130, 246, 0.3)  /* Light blue glow */
rgba(59, 130, 246, 0.55) /* Medium blue glow */
rgba(59, 130, 246, 0.6)  /* Strong blue glow */
rgba(59, 130, 246, 0.15)  /* Subtle blue background */
```

#### Success Colors (Green)
```css
#34d399;                          /* Success text */
rgba(34, 197, 94, 0.7);          /* Success glow */
rgba(34, 197, 94, 0.12);         /* Success background */
```

#### Error/Danger Colors (Red)
```css
#f87171;                          /* Error text */
#fca5a5;                          /* Light error text */
rgba(239, 68, 68, 0.15);         /* Error background */
rgba(239, 68, 68, 0.4);          /* Error border */
rgba(239, 68, 68, 0.6);          /* Error border hover */
```

#### Warning/Info Colors
```css
#f472b6;                          /* Pink accent */
rgba(217, 70, 239, 0.4);         /* Pink border */
rgba(217, 70, 239, 0.12);        /* Pink background */
#93c5fd;                          /* Light blue info */
rgba(139, 92, 246, 0.4);         /* Purple glow */
```

## 📝 Typography

### Font Families
```css
/* Primary font - Modern, geometric sans-serif */
font-family: 'Space Grotesk', system-ui, -apple-system, 'Segoe UI', sans-serif;

/* Display font - Bold, condensed */
font-family: 'Bebas Neue', sans-serif;

/* Alternative - Clean, readable */
font-family: 'Inter', sans-serif;
```

### Font Weights
- **400** - Regular
- **500** - Medium
- **600** - Semi-bold
- **700** - Bold

### Font Sizes (Responsive)
```css
/* Headings */
h2: clamp(24px, 4vw, 36px);      /* Main headings */
h3: clamp(20px, 3vw, 28px);      /* Subheadings */

/* Body text */
font-size: 15px;                 /* Standard body */
font-size: 13px;                 /* Secondary text */
font-size: 12px;                 /* Small text */
font-size: 11px;                 /* Extra small */
font-size: 10px;                 /* Tiny text */
font-size: 9px;                  /* Micro text */
```

### Letter Spacing
```css
letter-spacing: 0.32em;  /* Labels */
letter-spacing: 0.24em;  /* Buttons, chips */
letter-spacing: 0.18em;  /* Secondary buttons */
letter-spacing: 0.2em;   /* Eyebrows, badges */
letter-spacing: 0.14em; /* Small text */
letter-spacing: 0.1em;  /* Values */
letter-spacing: 0.08em;  /* Compact text */
```

### Text Transform
- **Uppercase** - Used for labels, buttons, badges, navigation
- **None** - Used for body text, inputs, values

## 📐 Spacing System

### Padding
```css
/* Cards */
padding: clamp(16px, 3vw, 28px);  /* Card padding (responsive) */
padding: 20px;                     /* Form padding */
padding: 12px 24px;                /* Button padding */
padding: 10px 18px;                 /* Small button padding */
padding: 6px 12px;                  /* Tiny button padding */

/* Inputs */
padding: 12px 16px;                /* Input field padding */
```

### Gaps
```css
gap: 12px;                         /* Standard gap */
gap: 16px;                         /* Medium gap */
gap: 20px;                         /* Large gap */
gap: clamp(12px, 3vw, 32px);      /* Responsive gap */
```

### Margins
```css
margin: 0 auto;                    /* Center alignment */
max-width: 1400px;                 /* Container max width */
padding: 12px clamp(12px, 2vw, 24px); /* Container padding */
```

## 🔲 Border Radius

```css
border-radius: 999px;               /* Fully rounded (buttons, chips) */
border-radius: 16px;               /* Large radius (cards) */
border-radius: 12px;               /* Medium radius (forms, cards) */
border-radius: 10px;               /* Small radius (inputs) */
border-radius: 8px;                /* Tiny radius (small elements) */
```

## 🌑 Shadows

### Card Shadows
```css
box-shadow: 0 20px 60px rgba(0, 0, 0, 0.15);  /* Card shadow */
box-shadow: 0 10px 35px rgba(0, 0, 0, 0.2);  /* Medium shadow */
box-shadow: 0 12px 20px rgba(0, 0, 0, 0.25); /* Strong shadow */
box-shadow: 0 15px 35px rgba(0, 0, 0, 0.3);  /* Very strong shadow */
```

### Glow Effects
```css
/* Blue glow */
box-shadow: 0 0 6px rgba(59, 130, 246, 0.0);
box-shadow: 0 0 16px rgba(59, 130, 246, 0.55);
box-shadow: 0 2px 8px rgba(59, 130, 246, 0.3);
box-shadow: 0 4px 16px rgba(59, 130, 246, 0.6), 0 0 20px rgba(139, 92, 246, 0.4);

/* White glow */
box-shadow: 0 0 10px rgba(245, 245, 245, 0.5);
box-shadow: 0 0 20px rgba(245, 245, 245, 0.8);
filter: drop-shadow(0 0 30px rgba(245, 245, 245, 0.4)) drop-shadow(0 0 60px rgba(245, 245, 245, 0.2));
```

## ✨ Animations

### Keyframe Animations

#### Fade In
```css
@keyframes fadeIn {
  from {
    opacity: 0;
    transform: scale(0.8);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}
/* Usage: animation: fadeIn 0.4s ease; */
```

#### Pulse
```css
@keyframes pulse {
  0%, 100% {
    transform: scale(1);
    opacity: 1;
  }
  50% {
    transform: scale(1.1);
    opacity: 0.9;
  }
}
```

#### Glow Pulse
```css
@keyframes feedfillGlow {
  0% {
    box-shadow: 0 0 6px rgba(59, 130, 246, 0.0);
  }
  50% {
    box-shadow: 0 0 16px rgba(59, 130, 246, 0.55);
  }
  100% {
    box-shadow: 0 0 6px rgba(59, 130, 246, 0.0);
  }
}
/* Usage: animation: feedfillGlow 2.4s ease-in-out infinite; */
```

#### Live Pulse (Green)
```css
@keyframes livePulse {
  0%, 100% {
    opacity: 1;
    transform: scale(1);
    box-shadow: 0 0 0 0 rgba(34, 197, 94, 0.7);
  }
  50% {
    opacity: 0.8;
    transform: scale(1.2);
    box-shadow: 0 0 0 8px rgba(34, 197, 94, 0);
  }
}
```

### Transitions
```css
transition: all 0.2s ease;                    /* Standard transition */
transition: transform 0.2s ease, box-shadow 0.2s ease; /* Multi-property */
transition: border-color 0.2s ease;           /* Border transition */
transition: background-color 0.3s ease, color 0.3s ease; /* Theme transition */
```

## 🎯 Component Styles

### Buttons

#### Primary Button
```css
.feedfill-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 10px 18px;
  border-radius: 999px;
  border: 1px solid var(--border-hover);
  background: var(--text-primary);
  color: var(--bg-primary);
  font-weight: 600;
  font-size: 13px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}
```

#### Secondary Button
```css
.feedfill-button.secondary {
  background: transparent;
  color: var(--text-primary);
  border: 1px solid var(--border-color);
}
```

### Cards

#### Standard Card
```css
.feedfill-card {
  background: var(--card-bg);
  border: 1px solid var(--border-color);
  border-radius: 16px;
  padding: clamp(16px, 3vw, 28px);
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.15);
  display: flex;
  flex-direction: column;
  gap: 12px;
}
```

### Inputs

#### Text Input
```css
input {
  padding: 12px 16px;
  border-radius: 10px;
  border: 1px solid var(--border-color);
  background: var(--input-bg);
  color: var(--text-primary);
  font-size: 15px;
  transition: border-color 0.2s ease;
}

input:focus {
  outline: none;
  border-color: var(--border-hover);
}
```

### Badges

#### Status Badge
```css
.admin-badge.success {
  background: rgba(34, 197, 94, 0.12);
  color: #34d399;
}

.admin-badge.danger {
  background: rgba(248, 113, 113, 0.12);
  color: #f87171;
}

.admin-badge.accent {
  background: rgba(59, 130, 246, 0.12);
  color: #93c5fd;
}
```

## 📱 Responsive Design

### Breakpoints
- **Mobile**: Default styles
- **Tablet**: `clamp()` functions for fluid sizing
- **Desktop**: Max-width container (1400px)

### Responsive Utilities
```css
/* Font sizes */
font-size: clamp(24px, 4vw, 36px);  /* Responsive heading */
font-size: clamp(15px, 4vw, 16px);  /* Responsive body */

/* Padding */
padding: clamp(16px, 3vw, 28px);    /* Responsive padding */
padding: clamp(12px, 2vw, 24px);    /* Responsive container padding */

/* Gaps */
gap: clamp(12px, 3vw, 32px);         /* Responsive gap */
```

## 🎨 Design Principles

### 1. **Minimalism**
- Clean, uncluttered interfaces
- Generous white space
- Subtle borders and shadows

### 2. **Contrast**
- High contrast for readability
- Clear hierarchy with text opacity levels
- Distinct interactive states

### 3. **Consistency**
- Uniform spacing system
- Consistent border radius
- Standardized typography scale

### 4. **Accessibility**
- High contrast ratios
- Clear focus states
- Readable font sizes

### 5. **Modern Aesthetics**
- Glassmorphism effects (backdrop-filter)
- Smooth animations
- Subtle glows and shadows

## 🔧 Implementation Tips

### Using CSS Variables
```css
/* Always use CSS variables for theming */
background: var(--bg-primary);
color: var(--text-primary);
border: 1px solid var(--border-color);
```

### Theme Switching
```html
<!-- Dark theme (default) -->
<html data-theme="dark">
<!-- or -->
<html>

<!-- Light theme -->
<html data-theme="light">
```

### Backdrop Filter (Glassmorphism)
```css
background: var(--card-bg);
backdrop-filter: blur(6px);
```

### Responsive Typography
```css
/* Use clamp() for fluid typography */
font-size: clamp(min, preferred, max);
```

## 📋 Quick Reference

### Color Usage
- **Primary Text**: `var(--text-primary)`
- **Secondary Text**: `var(--text-secondary)`
- **Tertiary Text**: `var(--text-tertiary)`
- **Borders**: `var(--border-color)`
- **Hover States**: `var(--hover-bg)`

### Spacing Scale
- **4px** - Tiny gaps
- **8px** - Small gaps
- **12px** - Standard gaps
- **16px** - Medium gaps
- **20px** - Large gaps
- **24px+** - Extra large gaps

### Border Radius Scale
- **8px** - Small elements
- **10px** - Inputs
- **12px** - Forms, medium cards
- **16px** - Large cards
- **999px** - Fully rounded (buttons, chips)

---

**Note**: This design system is optimized for dark themes but includes full light theme support. The color palette emphasizes readability and modern aesthetics with subtle transparency effects.

