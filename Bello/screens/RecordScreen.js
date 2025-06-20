import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, AppState } from 'react-native';
import { Camera } from 'expo-camera';
import * as MediaLibrary from 'expo-media-library';
import * as FileSystem from 'expo-file-system';
import * as Notifications from 'expo-notifications'; // Import Notifications
import { useNavigation, useIsFocused } from '@react-navigation/native';

const MAX_RECORDING_DURATION = 15; // seconds
const VIDEO_BASE_DIR = FileSystem.documentDirectory + 'videos/';
const DAILY_REMINDER_NOTIFICATION_ID = "daily-bello-reminder"; // Consistent ID

const RecordScreen = () => {
  const navigation = useNavigation();
  const isFocused = useIsFocused();
  const [hasCameraPermission, setHasCameraPermission] = useState(null);
  const [hasMicrophonePermission, setHasMicrophonePermission] = useState(null);
  const [hasMediaLibraryPermission, setHasMediaLibraryPermission] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const cameraRef = useRef(null);
  const recordingTimerRef = useRef(null);
  const appState = useRef(AppState.currentState);

  const cancelDailyReminder = async () => { // Added cancel function
    console.log("RecordScreen: Attempting to cancel daily reminder.");
    await Notifications.cancelScheduledNotificationAsync(DAILY_REMINDER_NOTIFICATION_ID);
    console.log("RecordScreen: Daily reminder cancelled (if it was scheduled).");
  };

  const getFormattedDatePathComponents = (date) => { /* ... */ const year = date.getFullYear().toString(); const month = (date.getMonth() + 1).toString().padStart(2, '0'); const day = date.getDate().toString().padStart(2, '0'); return { year, month, day }; };
  const getFormattedFilename = (date) => { /* ... */ const { year, month, day } = getFormattedDatePathComponents(date); const hours = date.getHours().toString().padStart(2, '0'); const minutes = date.getMinutes().toString().padStart(2, '0'); const seconds = date.getSeconds().toString().padStart(2, '0'); return `${year}-${month}-${day}_${hours}-${minutes}.${seconds}.mp4`; };

  useEffect(() => { /* ... permission requests ... */ const requestPermissions = async () => { const cameraStatus = await Camera.requestCameraPermissionsAsync(); setHasCameraPermission(cameraStatus.status === 'granted'); const micStatus = await Camera.requestMicrophonePermissionsAsync(); setHasMicrophonePermission(micStatus.status === 'granted'); const mediaLibStatus = await MediaLibrary.requestPermissionsAsync(); setHasMediaLibraryPermission(mediaLibStatus.status === 'granted'); if (cameraStatus.status !== 'granted' || micStatus.status !== 'granted' || mediaLibStatus.status !== 'granted') { Alert.alert( "Permissions Required", "Camera, microphone, and media library permissions are needed.", [{ text: "OK", onPress: () => navigation.goBack() }] ); } }; requestPermissions(); }, [navigation]);
  useEffect(() => { /* ... app state change for permissions ... */ const subscription = AppState.addEventListener("change", nextAppState => { if (appState.current.match(/inactive|background/) && nextAppState === "active") { (async () => { const cam = await Camera.getCameraPermissionsAsync(); const mic = await Camera.getMicrophonePermissionsAsync(); const media = await MediaLibrary.getPermissionsAsync(); setHasCameraPermission(cam.status === 'granted'); setHasMicrophonePermission(mic.status === 'granted'); setHasMediaLibraryPermission(media.status === 'granted'); })(); } appState.current = nextAppState; }); return () => { subscription.remove(); }; }, []);
  useEffect(() => { /* ... recording timer ... */ if (isRecording) { setRecordingTime(0); recordingTimerRef.current = setInterval(() => { setRecordingTime(prevTime => { if (prevTime >= MAX_RECORDING_DURATION - 1) { if (cameraRef.current && isRecording) { cameraRef.current.stopRecording(); } return prevTime + 1; } return prevTime + 1; }); }, 1000); } else { clearInterval(recordingTimerRef.current); } return () => clearInterval(recordingTimerRef.current); }, [isRecording]);

  const deletePreviousVideosForDay = async (date) => { /* ... */ const { year, month, day } = getFormattedDatePathComponents(date); const dayPrefix = `${year}-${month}-${day}_`; const monthDir = `${VIDEO_BASE_DIR}${year}/${month}/`; try { const dirInfo = await FileSystem.getInfoAsync(monthDir); if (!dirInfo.exists) { return; } const filesInMonthDir = await FileSystem.readDirectoryAsync(monthDir); for (const filename of filesInMonthDir) { if (filename.startsWith(dayPrefix)) { const fileUriToDelete = `${monthDir}${filename}`; await FileSystem.deleteAsync(fileUriToDelete, { idempotent: true }); } } } catch (error) { console.error('Error deleting previous videos for the day:', error); } };

  const saveVideo = async (tempUri) => { /* ... */ try { const now = new Date(); await deletePreviousVideosForDay(now); const { year, month } = getFormattedDatePathComponents(now); const filename = getFormattedFilename(now); const targetDir = `${VIDEO_BASE_DIR}${year}/${month}/`; const permanentUri = `${targetDir}${filename}`; await FileSystem.makeDirectoryAsync(targetDir, { intermediates: true }); await FileSystem.moveAsync({ from: tempUri, to: permanentUri }); console.log('Video saved to permanent URI:', permanentUri); return permanentUri; } catch (error) { console.error('Failed to save video:', error); Alert.alert("Save Error", "Could not save the video."); return null; } };

  const startRecording = async () => {
    if (cameraRef.current && !isRecording && hasCameraPermission && hasMicrophonePermission && hasMediaLibraryPermission) {
      setIsRecording(true);
      try {
        const videoRecordPromise = cameraRef.current.recordAsync({ maxDuration: MAX_RECORDING_DURATION, quality: Camera.Constants.VideoQuality['720p'] });
        if (videoRecordPromise) {
          const data = await videoRecordPromise;
          setIsRecording(false);
          setRecordingTime(0);
          if (data && data.uri) {
            const permanentUri = await saveVideo(data.uri);
            if (permanentUri) {
              await cancelDailyReminder(); // Cancel reminder after successful save
              Alert.alert("Recording Complete", "Video saved successfully!", [{ text: "OK" }]);
              navigation.navigate('Home', { videoRecordedToday: true, videoUri: permanentUri });
            } else { navigation.goBack(); }
          } else { Alert.alert("Recording Error", "No video data received.", [{ text: "OK" }]); navigation.goBack(); }
        }
      } catch (error) { console.error('Failed to record video:', error); setIsRecording(false); setRecordingTime(0); Alert.alert("Recording Error", "An error occurred.", [{ text: "OK" }]); navigation.goBack(); }
    } else if (!hasMediaLibraryPermission) { Alert.alert("Permissions Denied", "Media library permission needed.", [{ text: "OK" }]); }
      else if (!hasCameraPermission || !hasMicrophonePermission) { Alert.alert("Permissions Denied", "Camera/mic permissions not granted.", [{ text: "OK" }]); }
  };

  const stopRecordingByUser = () => { if (cameraRef.current && isRecording) { cameraRef.current.stopRecording(); } };

  if (hasCameraPermission === null || hasMicrophonePermission === null || hasMediaLibraryPermission === null) { return <View style={styles.container}><Text style={styles.permissionText}>Requesting permissions...</Text></View>; }
  if (!hasCameraPermission || !hasMicrophonePermission || !hasMediaLibraryPermission) { return ( <View style={styles.container}> <Text style={styles.permissionText}>Required permissions not granted. Enable in settings.</Text> <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}><Text style={styles.backButtonText}>Go Back</Text></TouchableOpacity> </View> ); }
  if (!isFocused) { return <View style={styles.container}><Text style={styles.permissionText}>Camera paused.</Text></View>; }

  return (
    <View style={styles.container}>
      <Camera style={styles.cameraPreview} ref={cameraRef} ratio="16:9">
        <View style={styles.controlsContainer}>
          <Text style={styles.timerText}>{isRecording ? `${recordingTime}s / ${MAX_RECORDING_DURATION}s` : `Max ${MAX_RECORDING_DURATION}s`}</Text>
          <TouchableOpacity style={[styles.recordButton, isRecording ? styles.recordButtonRecording : {}]} onPress={isRecording ? stopRecordingByUser : startRecording} disabled={!hasMediaLibraryPermission && !isRecording} >
            <View style={isRecording ? styles.stopIcon : styles.recordIcon} />
          </TouchableOpacity>
        </View>
      </Camera>
    </View>
  );
};

const styles = StyleSheet.create({ /* ... styles (no changes) ... */ container: { flex: 1, backgroundColor: 'black', justifyContent: 'center', alignItems: 'center' }, cameraPreview: { flex: 1, width: '100%' }, controlsContainer: { position: 'absolute', bottom: 30, left: 0, right: 0, flexDirection: 'column', alignItems: 'center' }, recordButton: { width: 70, height: 70, borderRadius: 35, backgroundColor: 'white', justifyContent: 'center', alignItems: 'center', borderWidth: 4, borderColor: 'rgba(255,0,0,0.5)' }, recordButtonRecording: { borderColor: 'white' }, recordIcon: { width: 60, height: 60, borderRadius: 30, backgroundColor: 'red' }, stopIcon: { width: 24, height: 24, backgroundColor: 'red', borderRadius: 3 }, timerText: { color: 'white', fontSize: 18, fontWeight: 'bold', marginBottom: 20, backgroundColor: 'rgba(0,0,0,0.3)', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 5 }, permissionText: { color: 'white', fontSize: 16, textAlign: 'center', marginHorizontal: 20, marginBottom: 10 }, backButton: { marginTop: 20, paddingVertical: 10, paddingHorizontal: 20, backgroundColor: '#007AFF', borderRadius: 5 }, backButtonText: { color: 'white', fontSize: 16 } });
export default RecordScreen;
