# PicklePlay Philippines Mobile App Documentation

**Version:** 1.0.0  
**Last Updated:** January 29, 2026  
**Platform:** React Native (Expo)

---

## Table of Contents

1. [Overview](#overview)
2. [Technology Stack](#technology-stack)
3. [Project Structure](#project-structure)
4. [Navigation Architecture](#navigation-architecture)
5. [Screens Reference](#screens-reference)
6. [Components](#components)
7. [API Reference](#api-reference)
8. [State Management](#state-management)
9. [Configuration](#configuration)
10. [Development Guidelines](#development-guidelines)

---

## Overview

PicklePlay Philippines is a mobile application designed to help users find pickleball courts, book sessions, shop for equipment, and connect with the local pickleball community in the Philippines.

### Core Features

| Feature | Description |
|---------|-------------|
| **Court Finder** | Search and discover pickleball courts near you |
| **Court Booking** | Book court sessions with date/time selection |
| **Quick Matching** | Find available courts and players instantly |
| **Community** | Connect with local pickleball enthusiasts |
| **Shop** | Browse and purchase pickleball equipment |
| **Profile Management** | Manage personal information and preferences |
| **Interactive Map** | View courts on an interactive map |

---

## Technology Stack

| Category | Technology | Version |
|----------|------------|---------|
| **Framework** | React Native | 0.81.5 |
| **Runtime** | Expo SDK | ~54.0.31 |
| **JavaScript** | React | 19.1.0 |
| **Navigation** | React Navigation | 7.x |
| **TypeScript** | TypeScript | ~5.9.2 |
| **Icons** | @expo/vector-icons | ^15.0.3 |
| **Gestures** | react-native-gesture-handler | ~2.28.0 |
| **WebView** | react-native-webview | 13.15.0 |

---

## Project Structure

```
mobile/pickleplay/
├── App.js                    # Main app entry point with navigation
├── app.json                  # Expo configuration
├── package.json              # Dependencies and scripts
├── babel.config.js           # Babel configuration
├── metro.config.js           # Metro bundler configuration
├── tsconfig.json             # TypeScript configuration
├── index.js                  # App registry
│
└── src/
    ├── assets/               # Static assets (images, fonts, etc.)
    ├── components/           # Reusable UI components
    │   ├── GlobalFooter.js   # Bottom navigation bar
    │   ├── GlobalHeader.js   # Top header component
    │   ├── NavigationTracker.js
    │   └── ScreenWrapper.js  # Screen layout wrapper
    │
    ├── constants/            # App constants
    │   └── Colors.js         # Color palette
    │
    ├── contexts/             # React Context providers
    │
    ├── hooks/                # Custom React hooks
    │
    └── screens/              # App screens
        ├── LoadingScreen.js
        ├── LandingScreen.js
        ├── LoginScreen.js
        ├── RegisterScreen.js
        ├── HomeScreen.js
        ├── FindCourtsScreen.js
        ├── CourtDetailScreen.js
        ├── BookingScreen.js
        ├── BookingReceiptScreen.js
        ├── MapScreen.js
        ├── ShopScreen.js
        ├── ProductDetailScreen.js
        ├── CartScreen.js
        ├── CheckoutScreen.js
        ├── ShopReceiptScreen.js
        ├── ProfileScreen.js
        ├── PersonalInformationScreen.js
        ├── SettingsScreen.js
        ├── NotificationsScreen.js
        ├── PrivacySecurityScreen.js
        ├── HelpSupportScreen.js
        ├── AboutScreen.js
        └── CommunityScreen.js
```

---

## Navigation Architecture

The app uses **React Navigation v7** with a Stack Navigator for screen transitions.

### Navigation Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                     AUTHENTICATION FLOW                          │
├─────────────────────────────────────────────────────────────────┤
│  Loading → Landing → Login/Register                              │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                        MAIN APP FLOW                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                    GLOBAL HEADER                          │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                                                           │   │
│  │   Home ←→ FindCourts ←→ Map ←→ Shop ←→ Profile           │   │
│  │     │         │                  │         │              │   │
│  │     │    CourtDetail         ProductDetail  │              │   │
│  │     │         │                  │          │              │   │
│  │     │      Booking             Cart     Settings          │   │
│  │     │         │                  │          │              │   │
│  │     │   BookingReceipt       Checkout   Personal Info     │   │
│  │     │                            │      Notifications     │   │
│  │     │                       ShopReceipt Privacy/Security  │   │
│  │     │                                   Help & Support    │   │
│  │  Community                              About              │   │
│  │                                                           │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  [Home] [FindCourts] [Map] [Shop] [Profile] [Community]   │   │
│  │                    GLOBAL FOOTER                          │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Screen Index Mapping

| Index | Screen | Footer Visible |
|-------|--------|----------------|
| 0 | Home | ✅ |
| 1 | FindCourts | ✅ |
| 2 | Map | ✅ |
| 3 | Shop | ✅ |
| 4 | Profile | ✅ |
| 5 | Community | ✅ |
| 6 | CourtDetail | ✅ |

### Screens Without Header

- Loading, Landing, Login, Register
- PersonalInformation, Settings, NotificationsPrefs, PrivacySecurity, HelpSupport, About
- Booking, BookingReceipt, CourtDetail
- Cart, Checkout, ShopReceipt, ProductDetail

---

## Screens Reference

### Authentication Screens

| Screen | Description | Route Name |
|--------|-------------|------------|
| **LoadingScreen** | Initial loading/splash screen | `Loading` |
| **LandingScreen** | Welcome screen with sign-in options | `Landing` |
| **LoginScreen** | User login form | `Login` |
| **RegisterScreen** | New user registration form | `Register` |

### Main Screens

| Screen | Description | Route Name |
|--------|-------------|------------|
| **HomeScreen** | Dashboard with quick actions | `Home` |
| **FindCourtsScreen** | Court search and listing | `FindCourts` |
| **MapScreen** | Interactive court map | `Map` |
| **ShopScreen** | Equipment store | `Shop` |
| **ProfileScreen** | User profile hub | `Profile` |
| **CommunityScreen** | Community features | `Community` |

### Court Booking Flow

| Screen | Description | Route Name |
|--------|-------------|------------|
| **CourtDetailScreen** | Court information details | `CourtDetail` |
| **BookingScreen** | Book a court session | `Booking` |
| **BookingReceiptScreen** | Booking confirmation | `BookingReceipt` |

### Shop Flow

| Screen | Description | Route Name |
|--------|-------------|------------|
| **ProductDetailScreen** | Product information | `ProductDetail` |
| **CartScreen** | Shopping cart | `Cart` |
| **CheckoutScreen** | Payment and checkout | `Checkout` |
| **ShopReceiptScreen** | Order confirmation | `ShopReceipt` |

### Settings & Profile Screens

| Screen | Description | Route Name |
|--------|-------------|------------|
| **PersonalInformationScreen** | Edit personal info | `PersonalInformation` |
| **SettingsScreen** | App settings | `Settings` |
| **NotificationsScreen** | Notification preferences | `NotificationsPrefs` |
| **PrivacySecurityScreen** | Privacy & security settings | `PrivacySecurity` |
| **HelpSupportScreen** | Help and support | `HelpSupport` |
| **AboutScreen** | About the app | `About` |

---

## Components

### GlobalFooter
Bottom navigation bar with 6 main tabs.

**Props:**
| Prop | Type | Description |
|------|------|-------------|
| `currentScreenIndex` | `number` | Currently active screen index |
| `onNavigate` | `function(screenName, index)` | Navigation callback |

### GlobalHeader
Top header component displayed on main screens.

### ScreenWrapper
Wrapper component that provides consistent layout for screens.

**Props:**
| Prop | Type | Description |
|------|------|-------------|
| `children` | `ReactNode` | Screen content |

---

## API Reference

### Base URL
```
Production: https://api.pickleplay.ph/api
Development: http://localhost:8000/api
```

### Authentication Headers
```javascript
{
  'Authorization': 'Bearer <token>',
  'Content-Type': 'application/json',
  'Accept': 'application/json'
}
```

---

### Health Check

#### Check API Status
```
GET /health
```

**Response:**
```json
{
  "status": "ok",
  "message": "PicklePlay API is running",
  "timestamp": "2026-01-29T10:00:00.000Z"
}
```

---

### Authentication Endpoints

#### Register User
```
POST /auth/register
```

**Request Body:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `first_name` | string | ✅ | User's first name |
| `last_name` | string | ✅ | User's last name |
| `email` | string | ✅ | Valid email address |
| `password` | string | ✅ | Min 8 chars, mixed case, numbers, symbols |
| `password_confirmation` | string | ✅ | Must match password |
| `date_of_birth` | date | ✅ | Must be 18+ years old |
| `phone_number` | string | ❌ | Phone number |
| `location` | string | ❌ | User's location |

**Success Response (201):**
```json
{
  "success": true,
  "message": "User registered successfully",
  "data": {
    "user": {
      "id": 1,
      "first_name": "Juan",
      "last_name": "Dela Cruz",
      "full_name": "Juan Dela Cruz",
      "email": "juan@example.com",
      "role": "user",
      "phone_number": "+639123456789",
      "date_of_birth": "1990-01-01",
      "location": "Manila",
      "status": "active",
      "email_verified_at": null,
      "created_at": "2026-01-29T10:00:00.000Z"
    },
    "token": "1|abc123...",
    "token_type": "Bearer"
  }
}
```

---

#### Login
```
POST /auth/login
```

**Request Body:**
| Field | Type | Required |
|-------|------|----------|
| `email` | string | ✅ |
| `password` | string | ✅ |

**Success Response (200):**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": { ... },
    "token": "1|abc123...",
    "token_type": "Bearer"
  }
}
```

---

#### Logout
```
POST /auth/logout
```
🔒 **Requires Authentication**

**Success Response:**
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

---

#### Forgot Password
```
POST /auth/forgot-password
```

**Request Body:**
| Field | Type | Required |
|-------|------|----------|
| `email` | string | ✅ |

---

#### Reset Password
```
POST /auth/reset-password
```

**Request Body:**
| Field | Type | Required |
|-------|------|----------|
| `token` | string | ✅ |
| `email` | string | ✅ |
| `password` | string | ✅ |
| `password_confirmation` | string | ✅ |

---

#### Email Verification
```
GET /auth/email/verify/{id}/{hash}
```
🔐 **Signed URL Required**

---

#### Resend Verification Email
```
POST /auth/email/resend
```
🔒 **Requires Authentication**

---

### Profile Endpoints

#### Get User Profile
```
GET /auth/profile
```
🔒 **Requires Authentication**

---

#### Update Profile
```
PUT /auth/profile
```
🔒 **Requires Authentication**

**Request Body:**
| Field | Type | Required |
|-------|------|----------|
| `first_name` | string | ❌ |
| `last_name` | string | ❌ |
| `phone_number` | string | ❌ |
| `location` | string | ❌ |

---

#### Update Extended Profile
```
PUT /auth/profile/extended
```
🔒 **Requires Authentication**

---

#### Upload Profile Photo
```
POST /auth/profile/photo
```
🔒 **Requires Authentication**

**Request Body (multipart/form-data):**
| Field | Type | Required |
|-------|------|----------|
| `photo` | file | ✅ |

---

#### Upload Cover Photo
```
POST /auth/profile/cover
```
🔒 **Requires Authentication**

---

#### Update Password
```
PUT /auth/password
```
🔒 **Requires Authentication**

**Request Body:**
| Field | Type | Required |
|-------|------|----------|
| `current_password` | string | ✅ |
| `password` | string | ✅ |
| `password_confirmation` | string | ✅ |

---

#### Delete Account
```
DELETE /auth/profile
```
🔒 **Requires Authentication**

---

#### Update Preferences
```
PUT /auth/preferences
```
🔒 **Requires Authentication**

---

### Player Profile Endpoints

#### Get Player Profile
```
GET /player/profile
```
🔒 **Requires Authentication**

**Success Response:**
```json
{
  "success": true,
  "data": {
    "profile": { ... },
    "completion_percentage": 75,
    "is_complete": false
  }
}
```

---

#### Update Player Profile
```
PUT /player/profile
```
🔒 **Requires Authentication**

**Request Body:**
| Field | Type | Options |
|-------|------|---------|
| `date_of_birth` | date | - |
| `location_city` | string | - |
| `skill_level` | string | `beginner`, `intermediate`, `advanced`, `professional` |
| `years_playing` | integer | 0-100 |
| `play_frequency` | string | `casual`, `regular_1_2`, `frequent_3_4`, `competitive` |
| `primary_position` | string | `none_mix`, `dinking_net`, `aggressive_baseline`, `both` |
| `tournament_participation` | string | `never`, `local`, `regional`, `national` |
| `preferred_court_type` | string | `indoor`, `outdoor`, `either` |
| `preferred_match_format` | string | `singles`, `doubles`, `both` |
| `availability_days` | array | `weekdays`, `weekends`, `flexible` |
| `preferred_time_slots` | array | `morning`, `afternoon`, `evening`, `night` |
| `bio` | string | Max 1000 chars |
| `agree_code_of_conduct` | boolean | - |
| `agree_community_guidelines` | boolean | - |
| `agree_ranking_rules` | boolean | - |
| `agree_fair_play` | boolean | - |

---

#### Upload Player Photo
```
POST /player/profile/photo
```
🔒 **Requires Authentication**

---

#### Get Profile Completion
```
GET /player/profile/completion
```
🔒 **Requires Authentication**

---

#### Delete Player Profile
```
DELETE /player/profile
```
🔒 **Requires Authentication**

---

### Authentication Logs

#### Get User Auth Logs
```
GET /auth/logs
```
🔒 **Requires Authentication**

---

#### Get All Auth Logs (Admin Only)
```
GET /auth/logs/all
```
🔒 **Requires Admin Authentication**

---

### Future API Endpoints (Planned)

These endpoints are planned for future development:

#### Courts API (v1)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/v1/courts` | List all courts |
| GET | `/v1/courts/{id}` | Get court details |
| GET | `/v1/courts/nearby` | Find nearby courts |
| POST | `/v1/courts` | Create court (Admin) |
| PUT | `/v1/courts/{id}` | Update court (Admin) |
| DELETE | `/v1/courts/{id}` | Delete court (Admin) |

#### Bookings API (v1)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/v1/bookings` | List user bookings |
| GET | `/v1/bookings/{id}` | Get booking details |
| POST | `/v1/bookings` | Create booking |
| PUT | `/v1/bookings/{id}` | Update booking |
| DELETE | `/v1/bookings/{id}` | Cancel booking |
| GET | `/v1/courts/{id}/availability` | Check court availability |

#### Shop/Products API (v1)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/v1/products` | List all products |
| GET | `/v1/products/{id}` | Get product details |
| GET | `/v1/categories` | List categories |
| GET | `/v1/products/featured` | Featured products |

#### Orders API (v1)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/v1/orders` | List user orders |
| GET | `/v1/orders/{id}` | Get order details |
| POST | `/v1/orders` | Create order |
| PUT | `/v1/orders/{id}/cancel` | Cancel order |

#### Community API (v1)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/v1/players` | List players |
| GET | `/v1/players/{id}` | Get player profile |
| POST | `/v1/players/match` | Find matching players |
| GET | `/v1/tournaments` | List tournaments |
| GET | `/v1/tournaments/{id}` | Tournament details |
| POST | `/v1/tournaments/{id}/register` | Register for tournament |

#### Notifications API (v1)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/v1/notifications` | List notifications |
| PUT | `/v1/notifications/{id}/read` | Mark as read |
| PUT | `/v1/notifications/read-all` | Mark all as read |
| DELETE | `/v1/notifications/{id}` | Delete notification |

---

## State Management

The app uses React Context for global state management.

### Contexts (To Be Implemented)

| Context | Purpose |
|---------|---------|
| `AuthContext` | User authentication state |
| `CartContext` | Shopping cart state |
| `LocationContext` | User location data |
| `NotificationContext` | Notification management |

---

## Configuration

### Environment Variables

Create a `.env` file in the project root:

```env
# API Configuration
API_BASE_URL=https://api.pickleplay.ph/api
API_VERSION=v1

# App Configuration
APP_NAME=PicklePlay Philippines
APP_ENV=development

# Maps Configuration (Future)
GOOGLE_MAPS_API_KEY=your_key_here

# Push Notifications (Future)
EXPO_PUSH_TOKEN=your_token_here
```

### App Configuration (app.json)

Key configurations in `app.json`:
- App name and slug
- SDK version
- Platform-specific settings
- Permissions

---

## Development Guidelines

### Running the App

```bash
# Install dependencies
npm install

# Start Expo development server
npm start

# Run on Android
npm run android

# Run on iOS
npm run ios

# Run on web
npm run web
```

### Code Style

1. **File Naming**: Use PascalCase for components (e.g., `HomeScreen.js`)
2. **Hooks**: Prefix custom hooks with `use` (e.g., `useAuth.js`)
3. **Constants**: Use UPPER_CASE for constants
4. **Components**: Use functional components with hooks

### Navigation Patterns

```javascript
// Navigate to a screen
navigation.navigate('ScreenName', { param: value });

// Navigate with direction (for animation)
navigation.navigate('ScreenName', { direction: 'right' });

// Go back
navigation.goBack();
```

### API Call Pattern

```javascript
// Example API service structure
const api = {
  baseURL: 'https://api.pickleplay.ph/api',
  
  async request(endpoint, options = {}) {
    const token = await getToken();
    const response = await fetch(`${this.baseURL}${endpoint}`, {
      ...options,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });
    return response.json();
  },
  
  async get(endpoint) {
    return this.request(endpoint, { method: 'GET' });
  },
  
  async post(endpoint, data) {
    return this.request(endpoint, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
};
```

---

## Error Handling

### API Error Response Format

```json
{
  "success": false,
  "message": "Error description",
  "errors": {
    "field_name": ["Validation error message"]
  }
}
```

### HTTP Status Codes

| Code | Meaning |
|------|---------|
| 200 | Success |
| 201 | Created |
| 400 | Bad Request |
| 401 | Unauthorized |
| 403 | Forbidden |
| 404 | Not Found |
| 422 | Validation Error |
| 500 | Server Error |

---

## Security Considerations

1. **Token Storage**: Store auth tokens securely using `expo-secure-store`
2. **HTTPS**: Always use HTTPS in production
3. **Input Validation**: Validate all user inputs
4. **Sensitive Data**: Never log sensitive data in production

---

## Changelog

### Version 1.0.0 (January 2026)
- Initial release
- Authentication flow (Login, Register)
- Court finder and booking
- Shop and cart functionality
- Profile management
- Community features
- Interactive map view

---

## Support

For technical support or questions:
- **Email**: support@pickleplay.ph
- **Documentation**: This file
- **Backend Docs**: See `/back-end/README.md`

---

*Documentation maintained by the PicklePlay Development Team*
