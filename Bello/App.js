import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator, CardStyleInterpolators } from '@react-navigation/stack';
// Removed: import { useFonts } from 'expo-font';
// Removed: import { ActivityIndicator, View, Text } from 'react-native';
// Note: View and Text might be needed if other global errors were to be displayed here,
// but for now, assuming they were primarily for font loading/error states.

import HomeScreen from './screens/HomeScreen';
import RecordScreen from './screens/RecordScreen';
import VideoPlayerScreen from './screens/VideoPlayerScreen';
import StoryPlayerScreen from './screens/StoryPlayerScreen';

const Stack = createStackNavigator();

export default function App() {
  // Removed useFonts hook call and conditional rendering for fontsLoaded/fontError

  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName="Home"
        screenOptions={{
          cardStyleInterpolator: CardStyleInterpolators.forHorizontalIOS,
        }}
      >
        <Stack.Screen
          name="Home"
          component={HomeScreen}
          options={{ title: 'Bello Video Journal' }}
        />
        <Stack.Screen
          name="Record"
          component={RecordScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="VideoPlayer"
          component={VideoPlayerScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="StoryPlayer"
          component={StoryPlayerScreen}
          options={{ headerShown: false }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
