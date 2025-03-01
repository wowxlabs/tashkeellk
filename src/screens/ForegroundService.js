import { activateKeepAwakeAsync } from 'expo-keep-awake';
import { Audio } from 'expo-av';

export async function startForegroundService() {
  try {
    await activateKeepAwakeAsync();  // Prevents Android from stopping the service

    await Audio.setAudioModeAsync({
      allowsRecordingIOS: false,
      staysActiveInBackground: true,
      playsInSilentModeIOS: true
    });

    console.log("Foreground service started for background audio.");
  } catch (error) {
    console.error("Error starting foreground service:", error);
  }
}
