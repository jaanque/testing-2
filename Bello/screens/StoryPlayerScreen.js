import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, ActivityIndicator, Dimensions } from 'react-native';
import { Video } from 'expo-video'; // Changed import
import { useNavigation, useRoute } from '@react-navigation/native';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

const StoryPlayerScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const videoRef = useRef(null);

  const { videoUris, title } = route.params || {};

  const [currentVideoIndex, setCurrentVideoIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  // isPlaying state to manage autoplay, especially when changing videos
  const [isPlaying, setIsPlaying] = useState(true);

  useEffect(() => {
    if (!videoUris || videoUris.length === 0) {
      navigation.goBack();
      return;
    }
    setIsLoading(true);
    setIsPlaying(true); // Ensure autoplay for new video
  }, [videoUris, navigation, currentVideoIndex]); // Add currentVideoIndex to re-trigger loading & autoplay

  const onVideoEnd = () => {
    console.log("StoryPlayer: onEnd - Video finished");
    if (currentVideoIndex < videoUris.length - 1) {
      setCurrentVideoIndex(prevIndex => prevIndex + 1);
    } else {
      navigation.goBack();
    }
  };

  useEffect(() => {
    const unsubscribeFocus = navigation.addListener('focus', async () => {
      if (videoRef.current && videoUris && videoUris[currentVideoIndex]) {
         setIsLoading(true);
         setIsPlaying(true); // Resume playing on focus
         // No need to explicitly load, source change in Video component handles it
      }
    });
     const unsubscribeBlur = navigation.addListener('blur', async () => {
      if (videoRef.current) {
        setIsPlaying(false); // Stop playing when blurred
        // await videoRef.current.pauseAsync(); // More explicit pause if needed
        // No unload needed unless performance becomes an issue
      }
    });
    return () => {
        unsubscribeFocus();
        unsubscribeBlur();
    };
  }, [navigation, videoUris, currentVideoIndex]);


  const handleNextVideo = () => {
    if (isLoading) return;
    if (currentVideoIndex < videoUris.length - 1) {
      setCurrentVideoIndex(prevIndex => prevIndex + 1);
    } else {
      navigation.goBack();
    }
  };

  const handlePrevVideo = () => {
    if (isLoading) return;
    if (currentVideoIndex > 0) {
      setCurrentVideoIndex(prevIndex => prevIndex - 1);
    }
  };

  if (!videoUris || videoUris.length === 0 || !videoUris[currentVideoIndex]) {
    return ( /* Error/empty view */ <SafeAreaView style={styles.container}><Text style={styles.errorText}>No videos.</Text><TouchableOpacity onPress={() => navigation.goBack()} style={styles.closeButtonFixed}><Text style={styles.closeButtonText}>X</Text></TouchableOpacity></SafeAreaView>);
  }

  const currentVideoUri = videoUris[currentVideoIndex];

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.progressContainer}>
        {videoUris.map((_, index) => ( <View key={index} style={[ styles.progressBar, index === currentVideoIndex ? styles.progressBarActive : {} ]} /> ))}
      </View>

      <View style={styles.videoContainer}>
        {isLoading && <ActivityIndicator size="large" color="white" style={styles.loadingIndicator} />}
        {currentVideoUri && (
            <Video
              ref={videoRef}
              style={styles.videoPlayer}
              source={{ uri: currentVideoUri }}
              autoplay={isPlaying} // Use state for autoplay
              resizeMode="contain" // String literal
              // controls={false} // Stories typically don't have native controls visible

              onLoadStart={() => { setIsLoading(true); console.log("Story video load start:", currentVideoUri);}}
              onReadyForDisplay={() => setIsLoading(false)} // More reliable for hiding loader
              onLoad={(status) => {
                setIsLoading(!status.isLoaded); // status.isLoaded is boolean
                setIsPlaying(true); // Ensure it plays once loaded
              }}
              onError={(error) => {
                console.error("Story video error:", error.message, "URI:", currentVideoUri);
                setIsLoading(false);
                handleNextVideo(); // Skip to next on error
              }}
              onEnd={onVideoEnd} // Use onEnd for story advancement
            />
        )}
      </View>

      <View style={styles.tapTargetsContainer}>
        <TouchableOpacity style={styles.tapTargetLeft} onPress={handlePrevVideo} />
        <TouchableOpacity style={styles.tapTargetRight} onPress={handleNextVideo} />
      </View>

      <View style={styles.headerControls}>
        <View style={styles.titleContainer}><Text style={styles.videoTitle} numberOfLines={1}>{title || 'Recap'}</Text></View>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.closeButton}><Text style={styles.closeButtonText}>X</Text></TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'black', justifyContent: 'center' },
  errorText: { color: 'white', textAlign: 'center', fontSize: 18 },
  videoContainer: { flex: 1, justifyContent: 'center' },
  videoPlayer: { width: screenWidth, height: screenHeight },
  loadingIndicator: { position: 'absolute', alignSelf: 'center', top: '50%' },
  progressContainer: { position: 'absolute', top: 10, left: 10, right: 10, flexDirection: 'row', height: 3, zIndex: 10 },
  progressBar: { flex: 1, height: '100%', backgroundColor: 'rgba(255, 255, 255, 0.4)', marginHorizontal: 2, borderRadius: 2 },
  progressBarActive: { backgroundColor: 'white' },
  headerControls: { position: 'absolute', top: 15, left: 10, right: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 5, zIndex: 10 },
  titleContainer: { flex: 1, alignItems: 'flex-start', paddingLeft: 5 },
  videoTitle: { color: 'white', fontSize: 16, fontWeight: 'bold', textShadowColor: 'rgba(0, 0, 0, 0.75)', textShadowOffset: { width: -1, height: 1 }, textShadowRadius: 10 },
  closeButton: { padding: 8, backgroundColor: 'rgba(0,0,0,0.3)', borderRadius: 15 },
  closeButtonFixed: { position: 'absolute', top: 40, right: 20, padding: 10, zIndex: 20, backgroundColor: 'rgba(0,0,0,0.3)', borderRadius: 15 },
  closeButtonText: { color: 'white', fontSize: 18, fontWeight: 'bold' },
  tapTargetsContainer: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, flexDirection: 'row', zIndex: 5 },
  tapTargetLeft: { width: '40%', height: '100%' },
  tapTargetRight: { width: '60%', height: '100%' },
});

export default StoryPlayerScreen;
