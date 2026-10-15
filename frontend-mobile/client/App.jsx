import React, { useState, useEffect, createContext, useContext } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  ActivityIndicator,
  StatusBar,
  StyleSheet,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import Home from './src/pages/Home';
import Register from './src/pages/Register';
import Login from './src/pages/Login';
import NotFound from './src/pages/NotFound';
import ServerError from './src/pages/ServerError';
import Search from './src/pages/Search';
import Profile from './src/pages/Profile';
import Followers from './src/pages/Followers';
import Following from './src/pages/Following';
import EditPost from './src/pages/EditPost';
import PostThread from './src/pages/PostThread';
import EventDetails from './src/pages/EventDetails';
import Notifications from './src/pages/Notifications';
import CreatePost from './src/pages/CreatePost';
import Events from './src/pages/Events';
import Groups from './src/pages/Groups';
import GroupPosts from './src/pages/GroupPosts';
import Education from './src/pages/Education';
import CreateGroup from './src/pages/CreateGroup';
import Settings from './src/pages/Settings';
import ResetPassword from './src/pages/ResetPassword';

const AppContext = createContext(undefined);

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
};

const Stack = createNativeStackNavigator();
const API_BASE = process.env.EXPO_PUBLIC_API_URL || 'https://stemnet.app';

export default function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [theme, setTheme] = useState('light');
  const [hasUnreadNotifications, setHasUnreadNotifications] = useState(false);

  useEffect(() => {
    const loadTheme = async () => {
      try {
        const savedTheme = await AsyncStorage.getItem('theme');
        if (savedTheme === 'dark' || savedTheme === 'light') {
          setTheme(savedTheme);
        }
      } catch (err) {
        console.error('Failed to load theme from storage:', err);
      }
    };
    loadTheme();
  }, []);

  const toggleTheme = () => {
    setTheme((prev) => {
      const nextTheme = prev === 'dark' ? 'light' : 'dark';
      AsyncStorage.setItem('theme', nextTheme).catch((err) =>
        console.error('Failed to save theme:', err)
      );
      return nextTheme;
    });
  };

  useEffect(() => {
    fetch(`${API_BASE}/api/auth/me`, {
      headers: { Accept: 'application/json' },
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        setCurrentUser(data?.user || null);
        setAuthChecked(true);
      })
      .catch(() => {
        setCurrentUser(null);
        setAuthChecked(true);
      });
  }, []);

  useEffect(() => {
    if (!currentUser) {
      setHasUnreadNotifications(false);
      return;
    }
    const checkUnread = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/notifications/unread`);
        if (res.ok) {
          const data = await res.json();
          setHasUnreadNotifications(Boolean(data.has_unread));
        }
      } catch (err) {
        console.error('Failed to check notifications:', err);
      }
    };
    checkUnread();
    const interval = setInterval(checkUnread, 30000);
    return () => clearInterval(interval);
  }, [currentUser]);

  if (!authChecked) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#ccff00" />
        <Text style={styles.loadingText}>Loading STEMNet...</Text>
      </View>
    );
  }

  const isDark = theme === 'dark';

  return (
    <AppContext.Provider
      value={{
        currentUser,
        setCurrentUser,
        theme,
        toggleTheme,
        hasUnreadNotifications,
        setHasUnreadNotifications,
      }}
    >
      <SafeAreaView style={[styles.appWrapper, isDark ? styles.bgDark : styles.bgLight]}>
        <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
        <NavigationContainer>
          <Stack.Navigator
            initialRouteName="Home"
            screenOptions={{
              headerShown: false,
              contentStyle: isDark ? styles.bgDark : styles.bgLight,
            }}
          >
            <Stack.Screen name="Home" component={Home} />
            <Stack.Screen name="Register" component={Register} />
            <Stack.Screen name="Login" component={Login} />
            <Stack.Screen name="Search" component={Search} />
            <Stack.Screen name="Notifications" component={Notifications} />
            <Stack.Screen name="Profile" component={Profile} />
            <Stack.Screen name="Followers" component={Followers} />
            <Stack.Screen name="Following" component={Following} />
            <Stack.Screen name="Groups" component={Groups} />
            <Stack.Screen name="GroupPosts" component={GroupPosts} />
            <Stack.Screen name="Education" component={Education} />
            <Stack.Screen name="CreatePost" component={CreatePost} />
            <Stack.Screen name="EditPost" component={EditPost} />
            <Stack.Screen name="PostThread" component={PostThread} />
            <Stack.Screen name="EventDetails" component={EventDetails} />
            <Stack.Screen name="CreateGroup" component={CreateGroup} />
            <Stack.Screen name="Events" component={Events} />
            <Stack.Screen name="Settings" component={Settings} />
            <Stack.Screen name="ResetPassword" component={ResetPassword} />
            <Stack.Screen name="ServerError" component={ServerError} />
            <Stack.Screen name="NotFound" component={NotFound} />
          </Stack.Navigator>
        </NavigationContainer>
      </SafeAreaView>
    </AppContext.Provider>
  );
}

const styles = StyleSheet.create({
  appWrapper: {
    flex: 1,
  },
  bgLight: {
    backgroundColor: '#f8fafc',
  },
  bgDark: {
    backgroundColor: '#000000',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0f172a',
  },
  loadingText: {
    marginTop: 16,
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
});