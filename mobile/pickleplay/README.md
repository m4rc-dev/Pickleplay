# PicklePlay Philippines Mobile App

A React Native mobile application for finding pickleball courts in the Philippines.

## Features

- **Court Finder**: Search and discover pickleball courts near you
- **Quick Matching**: Find available courts and players instantly
- **Community**: Connect with local pickleball enthusiasts
- **Tournaments**: Participate in organized competitions
- **Real-time Updates**: Get live court availability and scores

## Installation

### Prerequisites

Before running this app, make sure you have the following installed:

1. **Node.js** (v18 or higher)
2. **React Native CLI**
3. **Android Studio** (for Android development)
4. **Xcode** (for iOS development - macOS only)

### Setup Instructions

1. **Install Node.js** (if not already installed):
   ```bash
   # Download and install from https://nodejs.org/
   # Or use winget (Windows):
   winget install OpenJS.NodeJS
   ```

2. **Install React Native CLI**:
   ```bash
   npm install -g @react-native-community/cli
   ```

3. **Install project dependencies**:
   ```bash
   cd "Mobile PicklePlay"
   npm install
   ```

4. **For Android Development**:
   - Install Android Studio
   - Set up an Android emulator or connect a physical device
   - Configure ANDROID_HOME environment variable

5. **For iOS Development** (macOS only):
   - Install Xcode from the App Store
   - Install Xcode Command Line Tools: `xcode-select --install`

## Running the App

### Android

```bash
# Start Metro bundler
npm start

# In a new terminal, run the Android app
npm run android
```

### iOS (macOS only)

```bash
# Start Metro bundler
npm start

# In a new terminal, run the iOS app
npm run ios
```

## Project Structure

```
Mobile PicklePlay/
├── App.js                 # Main application component
├── index.js              # App entry point
├── app.json              # App configuration
├── package.json          # Dependencies and scripts
├── babel.config.js       # Babel configuration
├── metro.config.js       # Metro bundler configuration
└── README.md             # This file
```

## Key Components

### Home Page Features

- **Header**: Gradient header with app branding
- **Hero Section**: Main call-to-action for finding courts
- **Features Grid**: Why Choose PicklePlay section
- **Popular Courts**: List of nearby courts with ratings
- **Bottom Navigation**: Easy access to main features

### Navigation

- **Home**: Main dashboard with features and court listings
- **Find**: Search and filter courts
- **Map**: Visual map view of court locations
- **Shop**: Equipment and merchandise

## Dependencies

- React Native 0.73.6
- React Navigation 6.x
- React Native Vector Icons
- React Native Linear Gradient
- React Native Gesture Handler

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## Support

For support or questions, contact:
- Email: support@pickleplay.ph
- Phone: 0919 990 9642
- Facebook: https://www.facebook.com/pickleplayofficial/

## License

 2025 PicklePlay. All rights reserved.
