import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, ActivityIndicator, Dimensions } from 'react-native';
import { Video, ResizeMode } from 'expo-av';
import { useNavigation, useRoute } from '@react-navigation/native';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

const StoryPlayerScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const videoRef = useRef(null);

  const { videoUris, title } = route.params || {};

  const [currentVideoIndex, setCurrentVideoIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [playbackStatus, setPlaybackStatus] = useState({});

  useEffect(() => {
    if (!videoUris || videoUris.length === 0) {
      console.warn("StoryPlayerScreen: No videoUris provided or empty array.");
      navigation.goBack();
      return;
    }
    // Start playing the first video
    setIsLoading(true); // Ensure loading indicator shows for the first video
  }, [videoUris, navigation]);

  useEffect(() => {
    if (playbackStatus?.didJustFinish) {
      if (currentVideoIndex < videoUris.length - 1) {
        setCurrentVideoIndex(prevIndex => prevIndex + 1);
        setIsLoading(true); // Show loading for next video
      } else {
        // Last video finished
        navigation.goBack();
      }
    }
  }, [playbackStatus, currentVideoIndex, videoUris, navigation]);

  // Unload video when screen is not focused to save resources
  useEffect(() => {
    const unsubscribe = navigation.addListener('blur', async () => {
      if (videoRef.current) {
        console.log("StoryPlayer blurred, stopping video playback.");
        await videoRef.current.stopAsync();
        await videoRef.current.unloadAsync();
      }
    });
    return unsubscribe;
  }, [navigation]);

  // Reload video when screen is focused if it was previously playing
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', async () => {
      if (videoRef.current && videoUris && videoUris[currentVideoIndex]) {
         console.log("StoryPlayer focused, attempting to reload and play video.");
         setIsLoading(true); // Show loading indicator
         try {
            await videoRef.current.loadAsync({ uri: videoUris[currentVideoIndex] }, {}, true);
            await videoRef.current.playAsync();
         } catch(e) {
            console.error("Error reloading video on focus:", e);
            setIsLoading(false);
         }
      }
    });
    return unsubscribe;
  }, [navigation, videoUris, currentVideoIndex]);


  const handleNextVideo = () => {
    if (isLoading) return; // Don't allow navigation while a video is loading/buffering
    if (currentVideoIndex < videoUris.length - 1) {
      setCurrentVideoIndex(prevIndex => prevIndex + 1);
      setIsLoading(true);
    } else {
      navigation.goBack(); // Last video, go back
    }
  };

  const handlePrevVideo = () => {
    if (isLoading) return;
    if (currentVideoIndex > 0) {
      setCurrentVideoIndex(prevIndex => prevIndex - 1);
      setIsLoading(true);
    }
    // Potentially go to previous screen if on first video and tap left, but not standard story UX
  };

  if (!videoUris || videoUris.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.errorText}>No videos to display.</Text>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.closeButtonFixed}>
            <Text style={styles.closeButtonText}>X</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const currentVideoUri = videoUris[currentVideoIndex];

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.progressContainer}>
        {videoUris.map((_, index) => (
          <View
            key={index}
            style={[
              styles.progressBar,
              index === currentVideoIndex ? styles.progressBarActive : {},
              // Consider adding styles for watched videos too (e.g. slightly dimmer active)
            ]}
          />
        ))}
      </View>

      <View style={styles.videoContainer}>
        {isLoading && <ActivityIndicator size="large" color="white" style={styles.loadingIndicator} />}
        {currentVideoUri && (
            <Video
            ref={videoRef}
            style={styles.videoPlayer}
            source={{ uri: currentVideoUri }}
            shouldPlay
            resizeMode={ResizeMode.CONTAIN}
            onPlaybackStatusUpdate={setPlaybackStatus}
            onLoadStart={() => setIsLoading(true)}
            onLoad={() => setIsLoading(false)}
            onError={(error) => {
                console.error("Video playback error:", error, "URI:", currentVideoUri);
                setIsLoading(false);
                // Optionally, try to skip to next video on error or show error message
                handleNextVideo(); // Simple error handling: skip to next
            }}
            />
        )}
      </View>

      {/* Navigation Taps */}
      <View style={styles.tapTargetsContainer}>
        <TouchableOpacity style={styles.tapTargetLeft} onPress={handlePrevVideo} />
        <TouchableOpacity style={styles.tapTargetRight} onPress={handleNextVideo} />
      </View>

      <View style={styles.headerControls}>
        <View style={styles.titleContainer}>
            <Text style={styles.videoTitle} numberOfLines={1}>{title || 'Recap'}</Text>
            {/* You could also display current video index / total here */}
        </View>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.closeButton}>
          <Text style={styles.closeButtonText}>X</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'black',
    justifyContent: 'center',
  },
  errorText: { color: 'white', textAlign: 'center', fontSize: 18 },
  videoContainer: {
    flex: 1, // Takes the majority of the screen
    justifyContent: 'center',
  },
  videoPlayer: {
    width: screenWidth,
    height: screenHeight, // Stretches to full screen height
  },
  loadingIndicator: {
    position: 'absolute',
    alignSelf: 'center',
    top: '50%',
  },
  progressContainer: {
    position: 'absolute',
    top: 10, // Adjust as needed within SafeAreaView
    left: 10,
    right: 10,
    flexDirection: 'row',
    height: 3, // Height of progress bars
    zIndex: 10,
  },
  progressBar: {
    flex: 1,
    height: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
    marginHorizontal: 2,
    borderRadius: 2,
  },
  progressBarActive: {
    backgroundColor: 'white',
  },
  headerControls: {
    position: 'absolute',
    top: 15, // Below progress bars
    left: 10,
    right: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 5,
    zIndex: 10,
  },
  titleContainer: {
    flex: 1, // Allow title to take space
    alignItems: 'flex-start', // Align title to the left
    paddingLeft: 5, // Space from edge or progress bar
  },
  videoTitle: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: -1, height: 1 },
    textShadowRadius: 10,
  },
  closeButton: {
    padding: 8, // Make it easier to tap
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 15,
  },
  closeButtonFixed: { // For error screen
    position: 'absolute',
    top: 40, right: 20,
    padding: 10, zIndex: 20,
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 15,
  },
  closeButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  tapTargetsContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    zIndex: 5, // Below header/progress, but above video for taps
  },
  tapTargetLeft: {
    width: '40%', // Adjust tap area width
    height: '100%',
    // backgroundColor: 'rgba(255,0,0,0.1)', // For debugging tap areas
  },
  tapTargetRight: {
    width: '60%', // Adjust tap area width
    height: '100%',
    // backgroundColor: 'rgba(0,0,255,0.1)', // For debugging tap areas
  },
});

export default StoryPlayerScreen;
