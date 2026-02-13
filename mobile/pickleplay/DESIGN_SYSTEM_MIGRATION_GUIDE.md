# 🎨 PICKLEPLAY MOBILE - WEB DESIGN SYSTEM IMPLEMENTATION

## ✅ COMPLETED REDESIGNS (33% Complete - 10/30 Files)

### Core Components
1. **Colors.js** - Updated to slate + lime palette
2. **GlobalHeader.js** - Modern gradient header with menu
3. **GlobalFooter.js** - Clean navigation with lime active states

### Screens
4. **HomeScreen.js** - Cinematic hero with carousel
5. **NewsScreen.js** - Featured cards with bold typography
6. **FindCourtsScreen.js** - Court discovery with filters and search
7. **CourtDetailScreen.js** - Hero image, stats grid, reviews redesign
8. **BookingScreen.js** - Date/time picker, price summary, lime CTA
9. **ShopScreen.js** - Product grid, floating cart, modern categories
10. **CommunityScreen.js** - Feed/events/squads tabs, modern post cards, comments modal

---

## 🎨 DESIGN SYSTEM REFERENCE

### Color Palette
```javascript
// Primary Colors
Colors.slate950  // #020617 - Darkest backgrounds/text
Colors.slate900  // #0f172a
Colors.slate600  // #475569 - Secondary text
Colors.slate400  // #94a3b8 - Tertiary/icons
Colors.slate100  // #f1f5f9 - Light backgrounds
Colors.white     // #FFFFFF

// Accent Colors
Colors.lime400   // #a3e635 - Primary accent (CTAs, active states)
Colors.blue600   // #2563eb - Secondary accent
```

### Typography Scale
```javascript
// Headers
headerTitle: {
  fontSize: 40,
  fontWeight: '900',
  letterSpacing: -2,
  color: Colors.slate950,
}

// Section Titles
sectionTitle: {
  fontSize: 24,
  fontWeight: '800',
  letterSpacing: -1,
  color: Colors.slate950,
}

// Body Text
bodyText: {
  fontSize: 15,
  fontWeight: '600',
  color: Colors.slate600,
  lineHeight: 22,
}

// Labels
label: {
  fontSize: 11,
  fontWeight: '900',
  letterSpacing: 3,
  textTransform: 'uppercase',
  color: Colors.blue600,
}
```

### Component Patterns

#### 1. Card Pattern
```javascript
card: {
  backgroundColor: Colors.white,
  borderRadius: 24,
  padding: 20,
  shadowColor: Colors.slate950,
  shadowOffset: {width: 0, height: 4},
  shadowOpacity: 0.08,
  shadowRadius: 12,
  elevation: 6,
  borderWidth: 1,
  borderColor: Colors.slate100,
}
```

#### 2. Button Pattern (Primary)
```javascript
primaryButton: {
  backgroundColor: Colors.lime400,
  paddingHorizontal: 24,
  paddingVertical: 16,
  borderRadius: 16,
  shadowColor: Colors.lime400,
  shadowOffset: {width: 0, height: 4},
  shadowOpacity: 0.3,
  shadowRadius: 8,
  elevation: 6,
}

primaryButtonText: {
  fontSize: 15,
  fontWeight: '800',
  color: Colors.slate950,
  letterSpacing: 0.5,
}
```

#### 3. Gradient Action Card
```javascript
<TouchableOpacity style={styles.actionCard} activeOpacity={0.9}>
  <LinearGradient
    colors={['#6366f1', '#4f46e5']}
    start={{x: 0, y: 0}}
    end={{x: 1, y: 1}}
    style={styles.actionGradient}
  >
    <View style={styles.actionIconBg}>
      <MaterialIcons name="icon-name" size={32} color="#6366f1" />
    </View>
    <View style={styles.actionContent}>
      <Text style={styles.actionTitle}>Title</Text>
      <Text style={styles.actionDescription}>Description</Text>
    </View>
    <MaterialIcons name="arrow-forward" size={24} color={Colors.white} />
  </LinearGradient>
</TouchableOpacity>
```

#### 4. Section Header Pattern
```javascript
<View style={styles.section}>
  <Text style={styles.sectionLabel}>SECTION LABEL</Text>
  <Text style={styles.sectionTitle}>MAIN TITLE</Text>
  {/* Content */}
</View>
```

---

## 🚀 REMAINING SCREENS TO UPDATE

### Priority 1 - Core User Flows
- [ ] **FindCourtsScreen.js**
- [ ] **CourtDetailScreen.js**
- [ ] **BookingScreen.js**
- [ ] **BookingReceiptScreen.js**

### Priority 2 - E-commerce
- [ ] **ShopScreen.js**
- [ ] **CartScreen.js**
- [ ] **CheckoutScreen.js**
- [ ] **ProductDetailScreen.js**

### Priority 3 - Social
- [ ] **CommunityScreen.js**
- [ ] **PostScreen.js**
- [ ] **ProfileScreen.js**
- [ ] **PersonalInformationScreen.js**

### Priority 4 - Additional Features
- [ ] **MapScreen.js**
- [ ] **TournamentScreen.js**
- [ ] **CoachesScreen.js**
- [ ] **CoachScreen.js**
- [ ] **SettingsScreen.js**
- [ ] **NotificationsScreen.js**
- [ ] **FavoritesScreen.js**

---

## 📋 STEP-BY-STEP MIGRATION GUIDE

### For Each Screen:

1. **Update Imports**
```javascript
import Colors from '../constants/Colors';
// Remove old color constants
```

2. **Update Header Section**
```javascript
<View style={styles.headerSection}>
  <Text style={styles.headerLabel}>CATEGORY / DATE</Text>
  <Text style={styles.headerTitle}>MAIN</Text>
  <Text style={styles.headerTitleAccent}>TITLE.</Text>
</View>
```

3. **Replace Card Styles**
- Change: `borderRadius: 10` → `borderRadius: 20-24`
- Change: `padding: 15` → `padding: 20`
- Update: shadows to use `Colors.slate950` with `opacity: 0.08`
- Add: `borderWidth: 1, borderColor: Colors.slate100`

4. **Update Typography**
- Headers: weight 800-900, negative letter spacing
- Body: weight 600, proper line height
- Labels: weight 900, uppercase, wide letter spacing

5. **Update Colors**
- Replace: `thematicBlue` → `Colors.slate950` or `Colors.blue600`
- Replace: `activeColor` → `Colors.lime400`
- Replace: backgrounds → `Colors.white` or `Colors.slate50`

6. **Add Loading States**
```javascript
<View style={styles.loadingContainer}>
  <ActivityIndicator size="large" color={Colors.lime400} />
  <Text style={styles.loadingText}>Loading...</Text>
</View>
```

---

## 🎯 QUICK REFERENCE - Common Replacements

```javascript
// OLD → NEW
'#0A56A7' → Colors.blue600 or Colors.slate950
'#a3ff01' → Colors.lime400
'#fff' → Colors.white
'#000' → Colors.slate950
fontWeight: 'bold' → fontWeight: '800'
fontSize: 16 → fontSize: 15-18 (depend on hierarchy)
borderRadius: 12 → borderRadius: 20-24
padding: 15 → padding: 20
shadowOpacity: 0.1 → shadowOpacity: 0.08
elevation: 3 → elevation: 6-8
```

---

## 📦 REUSABLE STYLE OBJECTS

Create a `commonStyles.js` file:

```javascript
import { StyleSheet } from 'react-native';
import Colors from '../constants/Colors';

export const commonStyles = StyleSheet.create({
  // Headers
  pageHeader: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 20,
  },
  headerLabel: {
    fontSize: 10,
    fontWeight: '900',
    color: Colors.blue600,
    letterSpacing: 3,
    marginBottom: 8,
  },
  headerTitle: {
    fontSize: 40,
    fontWeight: '900',
    color: Colors.slate950,
    letterSpacing: -2,
    lineHeight: 40,
  },
  
  // Cards
  card: {
    backgroundColor: Colors.white,
    borderRadius: 24,
    padding: 20,
    shadowColor: Colors.slate950,
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 6,
    borderWidth: 1,
    borderColor: Colors.slate100,
  },
  
  // Buttons
  primaryButton: {
    backgroundColor: Colors.lime400,
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: Colors.lime400,
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  primaryButtonText: {
    fontSize: 15,
    fontWeight: '800',
    color: Colors.slate950,
    letterSpacing: 0.5,
  },
  
  // Empty States
  emptyContainer: {
    paddingVertical: 80,
    alignItems: 'center',
  },
  emptyIconBg: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.slate100,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.slate700,
    marginBottom: 4,
  },
  emptySubtext: {
    fontSize: 14,
    color: Colors.slate500,
  },
});
```

---

## ✨ COMPLETED VS REMAINING

### ✅ Completed (5 files)
1. Colors.js
2. GlobalHeader.js
3. GlobalFooter.js
4. HomeScreen.js
5. NewsScreen.js

### 📝 To Complete (~25 files)
- 15 Screen files
- 5 Component files
- 5 Specialty screens

### 📊 Progress: **17% Complete**

---

## 🎨 DESIGN PRINCIPLES

1. **Bold Typography** - Use 800-900 weight for headers
2. **High Contrast** - Slate-950 on white backgrounds
3. **Generous Spacing** - 20-24px padding, 16-24px gaps
4. **Rounded Corners** - 16-32px border radius
5. **Subtle Shadows** - 0.08 opacity, 12px blur
6. **Lime Accents** - Use sparingly for CTAs and active states
7. **Icon Backgrounds** - Colored backgrounds (40-60px) with icons
8. **Negative Letter Spacing** - For large headers (-1 to -2)

---

## 🚀 NEXT STEPS

1. Apply patterns to FindCourtsScreen (highest priority)
2. Update BookingScreen and related booking flows
3. Redesign ShopScreen and e-commerce screens
4. Update social features (Community, Profile)
5. Apply to remaining utility screens

**Estimated Time**: 2-4 hours for remaining screens using this guide

---

## 💡 TIPS

- Copy style objects from completed screens (HomeScreen, NewsScreen)
- Use Find & Replace for color constants
- Test on both iOS and Android
- Check dark mode compatibility if needed
- Maintain all existing functionality - only update styles

---

**Created**: February 9, 2026
**Status**: Phase 1 Complete (Core Components)
**Next**: Phase 2 (User Flow Screens)
