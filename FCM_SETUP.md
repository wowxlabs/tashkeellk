# FCM Setup Guide for Tashkeel App

## Prerequisites
- Firebase Console account
- EAS CLI installed (`npm install -g eas-cli`)
- Logged in to EAS (`eas login`)

## Step 1: Create Firebase Project (if you don't have one)

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Click "Add project" or select existing project
3. Follow the setup wizard

## Step 2: Add Android App to Firebase

1. In Firebase Console, click the Android icon or "Add app"
2. Enter app details:
   - **Android package name**: `com.tashkeellk.Tashkeellk`
   - **App nickname**: Tashkeel (optional)
   - **Debug signing certificate SHA-1**: (optional, needed for Auth features)
3. Click "Register app"
4. **Download `google-services.json`** - Save this file (you'll need it for EAS)

## Step 3: Enable Cloud Messaging API

1. In Firebase Console, go to **Project Settings** (gear icon)
2. Go to **Cloud Messaging** tab
3. Ensure "Cloud Messaging API (Legacy)" is enabled
   - Or enable "Cloud Messaging API (V1)" for newer features

## Step 4: Configure FCM via EAS Credentials

### Method A: Using EAS CLI (Recommended)

```bash
# Make sure you're logged in
eas login

# Configure credentials
eas credentials

# Select:
# 1. Android
# 2. Push Notifications
# 3. Set up FCM
# 4. Upload your google-services.json file when prompted
```

### Method B: Manual Configuration

If EAS CLI doesn't work or you have permission issues:

1. Go to [EAS Dashboard](https://expo.dev/)
2. Select your project: **Tashkeellk**
3. Go to **Credentials** → **Android** → **Push Notifications**
4. Upload `google-services.json` file

## Step 5: Verify Configuration

After setting up FCM:

1. Rebuild your Android app:
   ```bash
   eas build -p android --profile production
   ```
   
   OR for local development:
   ```bash
   npx expo run:android
   ```

2. Check logs - you should see:
   ```
   📱 Expo push token obtained: ExponentPushToken[...]
   ✅ Successfully subscribed to Tashkeel notifications
   ```

## Troubleshooting

### "Firebase Cloud Messaging (FCM) not configured" Error

- **Cause**: FCM credentials not uploaded to EAS
- **Solution**: Run `eas credentials` and set up FCM

### "Entity not authorized" Error

- **Cause**: Not logged in with correct EAS account or no project access
- **Solution**: 
  ```bash
  eas whoami  # Check current user
  eas login   # Login with correct account
  ```

### Push Token Still Returns null

- **Cause**: FCM not configured in the built app
- **Solution**: After configuring FCM, rebuild the app (credentials are included at build time)

## Notes

- **iOS doesn't need FCM** - Uses APNs (Apple Push Notification service) automatically
- **FCM is only required for Android** - But you still use Expo push tokens in your code
- **Credentials are included at build time** - Must rebuild app after configuring FCM
- **Development builds** may need different FCM setup than production

## Using Same Firebase Project as Masjid Companion

If you want to reuse the same Firebase project:

1. In Firebase Console, go to your existing project
2. Add another Android app with package name: `com.tashkeellk.Tashkeellk`
3. Download the new `google-services.json` for this app
4. Configure via EAS credentials as above

Both apps can share the same Firebase project but need separate `google-services.json` files.

