import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView, Dimensions, ScrollView, ActivityIndicator, Image, Alert, Animated } from 'react-native';
import { useNavigation, useRoute, useIsFocused } from '@react-navigation/native';
import * as FileSystem from 'expo-file-system';
import * as VideoThumbnails from 'expo-video-thumbnails';
import * as Notifications from 'expo-notifications';

const { width } = Dimensions.get('window');
const videoThumbnailSize = (width - 40 - 20) / 3;
const VIDEO_BASE_DIR = FileSystem.documentDirectory + 'videos/';
const RECAP_BASE_DIR = FileSystem.documentDirectory + 'recaps/';
const DAILY_REMINDER_NOTIFICATION_ID = "daily-bello-reminder";

Notifications.setNotificationHandler({
  handleNotification: async () => ({ shouldShowAlert: true, shouldPlaySound: true, shouldSetBadge: false }),
});

const HomeScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const isFocused = useIsFocused();

  const [currentDate, setCurrentDate] = useState(new Date());
  const [videosForMonth, setVideosForMonth] = useState([]);
  const [isLoadingVideos, setIsLoadingVideos] = useState(false);
  const [isVideoRecordedToday, setIsVideoRecordedToday] = useState(false);
  const [notificationPermissionsGranted, setNotificationPermissionsGranted] = useState(false);
  const [showRecapBanner, setShowRecapBanner] = useState(false);
  const [recapVideoUris, setRecapVideoUris] = useState([]);
  const [recapMonthName, setRecapMonthName] = useState("");
  const [recapTitle, setRecapTitle] = useState("");
  const fabScale = useRef(new Animated.Value(0)).current;

  const T = (str) => str;

  useEffect(() => { const requestPermissions = async () => { const { status } = await Notifications.requestPermissionsAsync(); if (status === 'granted') { setNotificationPermissionsGranted(true); } else { setNotificationPermissionsGranted(false); } }; requestPermissions(); }, []);
  const getFormattedDatePathComponents = (date, forRecap = false) => { let targetDate = new Date(date); if (forRecap) { targetDate.setDate(0); } const year = targetDate.getFullYear().toString(); const month = (targetDate.getMonth() + 1).toString().padStart(2, '0'); const day = targetDate.getDate().toString().padStart(2, '0'); return { year, month, day }; };
  const parseDateFromFilename = (filename) => { const parts = filename.substring(0, filename.lastIndexOf('.')).split('_'); const dateParts = parts[0].split('-'); const timeParts = parts[1].split('-'); return new Date(parseInt(dateParts[0]), parseInt(dateParts[1]) - 1, parseInt(dateParts[2]), parseInt(timeParts[0]), parseInt(timeParts[1]), parseInt(timeParts[2] || "0")); };
  const ensureDirExists = async (dir) => { const dirInfo = await FileSystem.getInfoAsync(dir); if (!dirInfo.exists) { await FileSystem.makeDirectoryAsync(dir, { intermediates: true }); } };
  const scheduleDailyReminder = useCallback(async () => { if (!notificationPermissionsGranted) return; const scheduledNotifications = await Notifications.getAllScheduledNotificationsAsync(); if (scheduledNotifications.some(n => n.identifier === DAILY_REMINDER_NOTIFICATION_ID)) return; const now = new Date(); let triggerDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 20, 0, 0); if (now > triggerDate) return; try { await Notifications.scheduleNotificationAsync({ identifier: DAILY_REMINDER_NOTIFICATION_ID, content: { title: "Bello Daily Reminder!", body: "Don't forget to record your video memory today!", data: { type: "daily-reminder" }, }, trigger: triggerDate, }); } catch (e) { console.error("Error scheduling notification:", e); } }, [notificationPermissionsGranted]);
  const cancelDailyReminder = useCallback(async () => { await Notifications.cancelScheduledNotificationAsync(DAILY_REMINDER_NOTIFICATION_ID); }, []);
  const checkAndPrepareRecap = useCallback(async () => { await ensureDirExists(RECAP_BASE_DIR); const today = new Date(); if (today.getDate() === 1 || showRecapBanner) { const { year: prevYear, month: prevMonth } = getFormattedDatePathComponents(today, true); const prevMonthDateObj = new Date(parseInt(prevYear), parseInt(prevMonth) - 1); const currentRecapMonthName = prevMonthDateObj.toLocaleString('default', { month: 'long', year: 'numeric' }); setRecapMonthName(prevMonthDateObj.toLocaleString('default', { month: 'long' })); setRecapTitle(`Recap for ${currentRecapMonthName}`); const singleRecapFilename = `${prevYear}-${prevMonth}.mp4`; const expectedSingleRecapPath = `${RECAP_BASE_DIR}${singleRecapFilename}`; const singleRecapInfo = await FileSystem.getInfoAsync(expectedSingleRecapPath); if (singleRecapInfo.exists) { setRecapVideoUris([expectedSingleRecapPath]); setShowRecapBanner(true); } else { const prevMonthVideosDir = `${VIDEO_BASE_DIR}${prevYear}/${prevMonth}/`; const prevMonthDirInfo = await FileSystem.getInfoAsync(prevMonthVideosDir); if (prevMonthDirInfo.exists) { const videosInPrevMonth = await FileSystem.readDirectoryAsync(prevMonthVideosDir); const mp4VideoFiles = videosInPrevMonth.filter(name => name.endsWith('.mp4')).sort().map(name => `${prevMonthVideosDir}${name}`); if (mp4VideoFiles.length > 0) { setRecapVideoUris(mp4VideoFiles); setShowRecapBanner(true); } else { setShowRecapBanner(false); setRecapVideoUris([]); } } else { setShowRecapBanner(false); setRecapVideoUris([]); } } } else { if (recapVideoUris.length === 0) { setShowRecapBanner(false); } } }, [showRecapBanner, recapVideoUris]);
  const loadVideosForMonth = useCallback(async (dateForMonth) => { setIsLoadingVideos(true); const { year, month } = getFormattedDatePathComponents(dateForMonth); const monthDir = `${VIDEO_BASE_DIR}${year}/${month}/`; try { const dirInfo = await FileSystem.getInfoAsync(monthDir); if (!dirInfo.exists) { setVideosForMonth([]); setIsLoadingVideos(false); return; } const filenames = await FileSystem.readDirectoryAsync(monthDir); const videoFilesPromises = filenames .filter(name => name.endsWith('.mp4')) .map(async (name) => { const videoUri = `${monthDir}${name}`; let thumbnailUri = null; try { const fileInfo = await FileSystem.getInfoAsync(videoUri); if (fileInfo.exists) { const { uri: thumbUri } = await VideoThumbnails.generateThumbnailAsync(videoUri, { time: 1000 }); thumbnailUri = thumbUri; } } catch (e) { console.warn(`Could not generate thumbnail for ${videoUri}:`, e); } return { uri: videoUri, filename: name, date: parseDateFromFilename(name), thumbnailUri }; }); let videoFiles = (await Promise.all(videoFilesPromises)) .filter(vf => vf.uri); videoFiles.sort((a, b) => a.date.getTime() - b.date.getTime()); setVideosForMonth(videoFiles); } catch (error) { setVideosForMonth([]); } setIsLoadingVideos(false); }, []);
  const checkIfVideoExistsForDate = useCallback(async (dateToCheck) => { const { year, month, day } = getFormattedDatePathComponents(dateToCheck); const dayPrefix = `${year}-${month}-${day}_`; const monthDir = `${VIDEO_BASE_DIR}${year}/${month}/`; try { const dirInfo = await FileSystem.getInfoAsync(monthDir); if (!dirInfo.exists) return false; const filesInMonthDir = await FileSystem.readDirectoryAsync(monthDir); return filesInMonthDir.some(filename => filename.startsWith(dayPrefix)); } catch (error) { return false; } }, []);
  const triggerFabAnimation = (show) => { if (show) { Animated.spring(fabScale, { toValue: 1, friction: 5, tension: 140, useNativeDriver: true }).start(); } else { Animated.timing(fabScale, { toValue: 0, duration: 150, useNativeDriver: true }).start(); } };

  useEffect(() => {
    const manageVideoStatusAndList = async () => {
      const today = new Date(); const videoExistsToday = await checkIfVideoExistsForDate(today);
      if (isVideoRecordedToday !== videoExistsToday) { setIsVideoRecordedToday(videoExistsToday); triggerFabAnimation(!videoExistsToday); }
      else if (!videoExistsToday && !isVideoRecordedToday) { triggerFabAnimation(true); }
      if (notificationPermissionsGranted) { if (videoExistsToday) { await cancelDailyReminder(); } else { await scheduleDailyReminder(); } }
      if (isFocused) { await loadVideosForMonth(currentDate); await checkAndPrepareRecap(); }
    };
    manageVideoStatusAndList();
    if (route.params?.videoRecordedToday || route.params?.videoDeleted) {
      if (route.params?.videoRecordedToday) { cancelDailyReminder(); }
      checkIfVideoExistsForDate(new Date()).then(exists => { if (isVideoRecordedToday !== exists) { setIsVideoRecordedToday(exists); triggerFabAnimation(!exists); } });
      navigation.setParams({ videoRecordedToday: undefined, videoUri: undefined, videoDeleted: undefined, deletedVideoUri: undefined });
    }
  }, [isFocused, currentDate, route.params?.videoRecordedToday, route.params?.videoDeleted, checkIfVideoExistsForDate, loadVideosForMonth, checkAndPrepareRecap, navigation, notificationPermissionsGranted, scheduleDailyReminder, cancelDailyReminder, isVideoRecordedToday]);

  const handlePrevMonth = () => setCurrentDate(d => new Date(d.setMonth(d.getMonth() - 1)));
  const handleNextMonth = () => setCurrentDate(d => new Date(d.setMonth(d.getMonth() + 1)));
  const formattedMonthYear = currentDate.toLocaleString('default', { month: 'long', year: 'numeric' });
  const handleThumbnailPress = (video) => navigation.navigate('VideoPlayer', { videoUri: video.uri, videoDate: video.date.toISOString(), filename: video.filename });
  const handleRecapBannerPress = () => { if (recapVideoUris && recapVideoUris.length > 0) { navigation.navigate('StoryPlayer', { videoUris: recapVideoUris, title: recapTitle }); } else { Alert.alert("Recap Information", "Recap videos are not available yet."); } };

  return (
    <SafeAreaView style={styles.container}>
      {!!showRecapBanner && ( <TouchableOpacity onPress={handleRecapBannerPress} style={styles.recapBanner}> <Text style={styles.recapBannerText}>{T(`Your ${recapMonthName} recap is available!`)}</Text> <Text style={styles.recapLinkText}>{T("View Now ›")}</Text> </TouchableOpacity> )}
      <View style={styles.monthSelector}> <TouchableOpacity onPress={handlePrevMonth} style={styles.monthArrowButton}><Text style={styles.monthArrow}>‹</Text></TouchableOpacity> <Text style={styles.monthText}>{formattedMonthYear}</Text> <TouchableOpacity onPress={handleNextMonth} style={styles.monthArrowButton}><Text style={styles.monthArrow}>›</Text></TouchableOpacity> </View>
      <ScrollView contentContainerStyle={styles.videoGridContainer}> {!!isLoadingVideos ? ( <ActivityIndicator size="large" color="#007AFF" style={styles.loadingIndicator} /> ) : !!(videosForMonth.length > 0) ? ( videosForMonth.map(video => ( !!video.uri && <TouchableOpacity key={video.uri} style={styles.videoThumbnailTouchable} onPress={() => handleThumbnailPress(video)}> {!!video.thumbnailUri ? <Image source={{ uri: video.thumbnailUri }} style={styles.thumbnailImage} /> : <View style={styles.thumbnailFallback}><Text style={styles.thumbnailFallbackText} numberOfLines={3}>{video.filename.split('_')[0]}</Text></View>} </TouchableOpacity> ))) : (<Text style={styles.noVideosText}>{T("No videos recorded this month.")}</Text>) } </ScrollView>
      {!!(!isVideoRecordedToday) && ( <Animated.View style={[styles.fabContainer, { transform: [{ scale: fabScale }] }]}> <TouchableOpacity style={styles.fab} onPress={() => navigation.navigate('Record')}> <Text style={styles.fabText}>+</Text> </TouchableOpacity> </Animated.View> )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F0F0F7' },
  loadingIndicator: { marginTop: 50, alignSelf: 'center' },
  noVideosText: { flex: 1, textAlign: 'center', marginTop: 50, fontSize: 16, color: '#666' }, // Removed fontFamily
  monthSelector: { paddingVertical: 15, paddingHorizontal: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#FFFFFF', borderBottomWidth: 0.5, borderBottomColor: '#D1D1D6' },
  monthArrowButton: { padding: 10 },
  monthArrow: { fontSize: 24, color: '#007AFF' }, // Removed fontFamily
  monthText: { fontSize: 18, fontWeight: '600', color: '#000000' }, // Removed fontFamily
  videoGridContainer: { flexGrow: 1, flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-start', paddingHorizontal: 10, paddingVertical: 10 },
  videoThumbnailTouchable: { width: videoThumbnailSize, height: videoThumbnailSize * 1.5, backgroundColor: '#D1D1D6', borderRadius: 16, margin: (width - 40 - (videoThumbnailSize * 3)) / 6, overflow: 'hidden' },
  thumbnailImage: { width: '100%', height: '100%' },
  thumbnailFallback: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 5 },
  thumbnailFallbackText: { fontSize: 12, color: '#333', textAlign: 'center' }, // Removed fontFamily
  fabContainer: { position: 'absolute', right: 25, bottom: 35 },
  fab: { backgroundColor: '#007AFF', width: 64, height: 64, borderRadius: 32, justifyContent: 'center', alignItems: 'center', shadowColor: '#000000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 3.84, elevation: 5 },
  fabText: { fontSize: 32, color: 'white', lineHeight: 36 }, // Removed fontFamily
  recapBanner: { paddingVertical: 12, paddingHorizontal: 20, backgroundColor: '#28a745', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  recapBannerText: { color: 'white', fontSize: 15, fontWeight: '500' }, // Removed fontFamily
  recapLinkText: { color: 'white', fontSize: 15, fontWeight: 'bold' }, // Removed fontFamily
});

export default HomeScreen;
