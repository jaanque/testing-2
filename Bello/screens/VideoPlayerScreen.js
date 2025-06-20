import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, Alert, ActivityIndicator } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Video, ResizeMode } from 'expo-av';
import * as FileSystem from 'expo-file-system';

const VideoPlayerScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const videoRef = useRef(null);
  const [isLoading, setIsLoading] = useState(true);

  const { videoUri, videoDate, filename, title } = route.params;
  const displayTitle = title || filename || 'Video';

  let formattedDate = 'Date not available';
  if (videoDate) {
    const dateObj = new Date(videoDate);
    formattedDate = dateObj.toLocaleDateString(undefined, {
      year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
    });
  }

  const handleDelete = () => {
    if (!filename) {
        Alert.alert("Info", "Recaps cannot be deleted from here.");
        return;
    }
    Alert.alert( "Delete Video", `Are you sure you want to delete "${filename}"? This action cannot be undone.`,
      [ { text: "Cancel", style: "cancel" },
        { text: "Delete", style: "destructive", onPress: async () => {
            try { await FileSystem.deleteAsync(videoUri, { idempotent: true });
              Alert.alert("Deleted", `Video "${filename}" has been successfully deleted.`);
              navigation.navigate('Home', { videoDeleted: true, deletedVideoUri: videoUri });
            } catch (error) { Alert.alert("Error", "Could not delete the video."); }
          }
        }
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backButtonText}>‹ Back</Text>
        </TouchableOpacity>
        <Text style={styles.videoTitle} numberOfLines={1}>{displayTitle}</Text>
        {filename && ( <TouchableOpacity onPress={handleDelete} style={styles.deleteButton}><Text style={styles.deleteButtonText}>Delete</Text></TouchableOpacity> )}
        {!filename && <View style={styles.headerSpacer} />}
      </View>

      <View style={styles.playerContainer}>
        {isLoading && <ActivityIndicator size="large" color="white" style={styles.loadingIndicator} />}
        <Video
          ref={videoRef}
          style={styles.videoPlayer}
          source={{ uri: videoUri }}
          useNativeControls
          resizeMode={ResizeMode.CONTAIN}
          shouldPlay={true}
          onLoadStart={() => setIsLoading(true)}
          onLoad={() => setIsLoading(false)}
          onError={(error) => { setIsLoading(false); Alert.alert("Playback Error", "Could not play this video."); console.error(error);}}
          onPlaybackStatusUpdate={status => {
            if (status.isBuffering && !isLoading) setIsLoading(true);
            if (!status.isBuffering && isLoading && status.isLoaded) setIsLoading(false);
          }}
        />
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'black' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 10, paddingVertical: 10, backgroundColor: 'rgba(0,0,0,0.3)' },
  backButton: { paddingHorizontal: 5 },
  backButtonText: { color: '#007AFF', fontSize: 17, fontFamily: 'Inter-Regular' }, // Example
  videoTitle: { color: 'white', fontSize: 17, fontWeight: '600', textAlign: 'center', marginHorizontal: 5, flexShrink: 1, fontFamily: 'Inter-SemiBold' }, // Example
  deleteButton: { paddingHorizontal: 5 },
  deleteButtonText: { color: '#FF3B30', fontSize: 17, fontFamily: 'Inter-Regular' }, // Example
  headerSpacer: { width: 60 },
  playerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'black' },
  videoPlayer: { alignSelf: 'stretch', flex: 1 },
  loadingIndicator: { position: 'absolute' }
});

export default VideoPlayerScreen;
