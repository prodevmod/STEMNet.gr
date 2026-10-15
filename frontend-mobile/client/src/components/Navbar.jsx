import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  StyleSheet,
  ScrollView,
  Modal,
  TouchableWithoutFeedback,
  Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Svg, { Path, Circle, Rect, Line, Polyline } from 'react-native-svg';

export default function Navbar({
  currentUser,
  setCurrentUser,
  theme = 'dark',
  toggleTheme,
  hasUnreadNotifications,
}) {
  const navigation = useNavigation();
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const handleLogout = async () => {
    try {
      await fetch('/api/logout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
    } catch (err) {
      console.error('Logout failed:', err);
    } finally {
      if (setCurrentUser) setCurrentUser(null);
      setDropdownOpen(false);
      navigation.navigate('Login');
    }
  };

  const navigateTo = (routeName, params) => {
    setDropdownOpen(false);
    if (routeName) {
      navigation.navigate(routeName, params);
    }
  };

  const lightGreen = '#ccff00';
  const dropdownBg = theme === 'light' ? '#0b192c' : '#000000';
  const dropdownBorderColor = theme === 'light' ? '#1e293b' : '#333333';

  return (
    <View
      style={[
        styles.headerContainer,
        {
          backgroundColor: dropdownBg,
          borderBottomWidth: theme === 'dark' ? 0 : 1,
          borderBottomColor: '#1e293b',
        },
      ]}
    >
      <View style={styles.navContainer}>
        {/* Brand Logo & Name */}
        <TouchableOpacity
          style={styles.navBrand}
          onPress={() => navigateTo('Home')}
          activeOpacity={0.7}
        >
          {/* Replace uri with local require('../../assets/logo.png') if bundled in assets */}
          <Image
            source={{ uri: 'https://stemnet.gr/logo.png' }}
            style={styles.logoImage}
            resizeMode="contain"
          />
          <Text style={[styles.brandText, { color: lightGreen }]}>
            STEMNet.gr
          </Text>
        </TouchableOpacity>

        {/* Toggle Menu Button */}
        <TouchableOpacity
          onPress={() => setDropdownOpen(!dropdownOpen)}
          style={styles.toggleBtn}
          activeOpacity={0.7}
        >
          <DropdownToggleIcon strokeColor={lightGreen} />
        </TouchableOpacity>
      </View>

      {/* Mobile/Native Dropdown Overlay & Drawer */}
      <Modal
        visible={dropdownOpen}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setDropdownOpen(false)}
      >
        <TouchableWithoutFeedback onPress={() => setDropdownOpen(false)}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <View
                style={[
                  styles.dropdownMenu,
                  {
                    backgroundColor: dropdownBg,
                    borderBottomColor: dropdownBorderColor,
                  },
                ]}
              >
                <ScrollView contentContainerStyle={styles.dropdownScrollContent}>
                  {currentUser && (
                    <>
                      <TouchableOpacity
                        style={mobileLinkStyle(lightGreen)}
                        onPress={() => navigateTo('Education')}
                      >
                        <StemIcon strokeColor={lightGreen} />
                        <Text style={[styles.linkText, { color: lightGreen }]}>
                          STEM Extras
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={mobileLinkStyle(lightGreen)}
                        onPress={() => navigateTo('Groups')}
                      >
                        <GroupIcon strokeColor={lightGreen} />
                        <Text style={[styles.linkText, { color: lightGreen }]}>
                          Groups
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={mobileLinkStyle(lightGreen)}
                        onPress={() => navigateTo('Events')}
                      >
                        <EventsIcon strokeColor={lightGreen} />
                        <Text style={[styles.linkText, { color: lightGreen }]}>
                          Events
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={mobileLinkStyle(lightGreen)}
                        onPress={() => navigateTo('Notifications')}
                      >
                        {hasUnreadNotifications ? (
                          <BellFilledIcon strokeColor={lightGreen} />
                        ) : (
                          <BellOutlineIcon strokeColor={lightGreen} />
                        )}
                        <Text style={[styles.linkText, { color: lightGreen }]}>
                          Notifications
                          {hasUnreadNotifications ? ' (New)' : ''}
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={mobileLinkStyle(lightGreen)}
                        onPress={() =>
                          navigateTo('Profile', {
                            username: currentUser.username,
                          })
                        }
                      >
                        <ProfileIcon strokeColor={lightGreen} />
                        <Text style={[styles.linkText, { color: lightGreen }]}>
                          Profile
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={mobileLinkStyle(lightGreen)}
                        onPress={() => navigateTo('Search')}
                      >
                        <SearchIcon strokeColor={lightGreen} />
                        <Text style={[styles.linkText, { color: lightGreen }]}>
                          Search
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={mobileLinkStyle(lightGreen)}
                        onPress={() => navigateTo('Settings')}
                      >
                        <GearIcon strokeColor={lightGreen} />
                        <Text style={[styles.linkText, { color: lightGreen }]}>
                          Settings
                        </Text>
                      </TouchableOpacity>
                    </>
                  )}

                  {!currentUser && (
                    <TouchableOpacity
                      onPress={toggleTheme}
                      style={mobileLinkStyle(lightGreen)}
                    >
                      {theme === 'dark' ? (
                        <SunIcon strokeColor={lightGreen} />
                      ) : (
                        <MoonIcon strokeColor={lightGreen} />
                      )}
                      <Text style={[styles.linkText, { color: lightGreen }]}>
                        {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
                      </Text>
                    </TouchableOpacity>
                  )}

                  {/* Horizontal Divider (<hr />) */}
                  <View
                    style={[
                      styles.divider,
                      { backgroundColor: dropdownBorderColor },
                    ]}
                  />

                  {currentUser ? (
                    <>
                      <TouchableOpacity
                        style={[
                          styles.btnPrimary,
                          { borderColor: lightGreen },
                        ]}
                        onPress={() => navigateTo('CreatePost')}
                      >
                        <Text
                          style={[
                            styles.btnPrimaryText,
                            { color: lightGreen },
                          ]}
                        >
                          + New Post
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        onPress={handleLogout}
                        style={mobileLinkStyle(lightGreen)}
                      >
                        <LogoutIcon strokeColor={lightGreen} />
                        <Text style={[styles.linkText, { color: lightGreen }]}>
                          Logout
                        </Text>
                      </TouchableOpacity>
                    </>
                  ) : (
                    <>
                      <TouchableOpacity
                        style={[
                          styles.btnPrimary,
                          { borderColor: lightGreen },
                        ]}
                        onPress={() => navigateTo('Login')}
                      >
                        <Text
                          style={[
                            styles.btnPrimaryText,
                            { color: lightGreen },
                          ]}
                        >
                          Log In
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[
                          styles.btnPrimary,
                          { borderColor: lightGreen },
                        ]}
                        onPress={() => navigateTo('Register')}
                      >
                        <Text
                          style={[
                            styles.btnPrimaryText,
                            { color: lightGreen },
                          ]}
                        >
                          Register
                        </Text>
                      </TouchableOpacity>
                    </>
                  )}
                </ScrollView>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </View>
  );
}

// --- Styles ---
const mobileLinkStyle = (color) => ({
  flexDirection: 'row',
  alignItems: 'center',
  gap: 12,
  paddingVertical: 10,
});

const styles = StyleSheet.create({
  headerContainer: {
    paddingTop: Platform.OS === 'ios' ? 50 : 16,
    paddingHorizontal: 16,
    paddingBottom: 12,
    zIndex: 1000,
  },
  navContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    maxWidth: 1200,
    alignSelf: 'center',
    width: '100%',
  },
  navBrand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  logoImage: {
    width: 30,
    height: 30,
  },
  brandText: {
    fontWeight: '700',
    fontSize: 18,
  },
  toggleBtn: {
    padding: 6,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-start',
  },
  dropdownMenu: {
    padding: 24,
    borderBottomWidth: 1,
    maxHeight: '80%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 10,
  },
  dropdownScrollContent: {
    gap: 14,
  },
  linkText: {
    fontSize: 16,
    fontWeight: '500',
  },
  divider: {
    height: 1,
    marginVertical: 8,
  },
  btnPrimary: {
    borderWidth: 1,
    borderRadius: 6,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 4,
  },
  btnPrimaryText: {
    fontWeight: 'bold',
    fontSize: 16,
  },
});

// --- Native SVG Icons ---
const StemIcon = ({ strokeColor }) => (
  <Svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={strokeColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <Path d="M9 2v6.5L4.5 17a2 2 0 0 0 1.7 3h11.6a2 2 0 0 0 1.7-3L15 8.5V2" />
    <Path d="M8.5 2h7" />
    <Path d="M7.5 14h9" />
  </Svg>
);

const GroupIcon = ({ strokeColor }) => (
  <Svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={strokeColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <Path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
    <Circle cx="9" cy="7" r="4" />
    <Path d="M23 21v-2a4 4 0 0 0-3-3.87" />
    <Path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </Svg>
);

const EventsIcon = ({ strokeColor }) => (
  <Svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={strokeColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <Rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
    <Line x1="16" y1="2" x2="16" y2="6" />
    <Line x1="8" y1="2" x2="8" y2="6" />
    <Line x1="3" y1="10" x2="21" y2="10" />
  </Svg>
);

const ProfileIcon = ({ strokeColor }) => (
  <Svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={strokeColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <Path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
    <Circle cx="12" cy="7" r="4" />
  </Svg>
);

const SearchIcon = ({ strokeColor }) => (
  <Svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={strokeColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <Circle cx="11" cy="11" r="8" />
    <Line x1="21" y1="21" x2="16.65" y2="16.65" />
  </Svg>
);

const DropdownToggleIcon = ({ strokeColor }) => (
  <Svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke={strokeColor} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <Line x1="3" y1="12" x2="21" y2="12" />
    <Line x1="3" y1="6" x2="21" y2="6" />
    <Line x1="3" y1="18" x2="21" y2="18" />
  </Svg>
);

const LogoutIcon = ({ strokeColor }) => (
  <Svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={strokeColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <Path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
    <Polyline points="16 17 21 12 16 7" />
    <Line x1="21" y1="12" x2="9" y2="12" />
  </Svg>
);

const BellOutlineIcon = ({ strokeColor }) => (
  <Svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={strokeColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <Path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
    <Path d="M13.73 21a2 2 0 0 1-3.46 0" />
  </Svg>
);

const BellFilledIcon = ({ strokeColor }) => (
  <Svg width="22" height="22" viewBox="0 0 24 24">
    <Path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" fill={strokeColor} stroke={strokeColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M13.73 21a2 2 0 0 1-3.46 0" fill="none" stroke={strokeColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <Circle cx="18.5" cy="6" r="4.5" fill="#ef4444" stroke="#000000" strokeWidth="1" />
  </Svg>
);

const GearIcon = ({ strokeColor }) => (
  <Svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={strokeColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <Circle cx="12" cy="12" r="3" />
    <Path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
  </Svg>
);

const SunIcon = ({ strokeColor }) => (
  <Svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={strokeColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <Circle cx="12" cy="12" r="5" />
    <Line x1="12" y1="1" x2="12" y2="3" />
    <Line x1="12" y1="21" x2="12" y2="23" />
    <Line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
    <Line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
    <Line x1="1" y1="12" x2="3" y2="12" />
    <Line x1="21" y1="12" x2="23" y2="12" />
    <Line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
    <Line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
  </Svg>
);

const MoonIcon = ({ strokeColor }) => (
  <Svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={strokeColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <Path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
  </Svg>
);