import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  StyleSheet,
  Dimensions,
  ActivityIndicator
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import Navbar from '../components/Navbar';
import PostMedia from '../components/PostMedia';

const API_BASE = ''; // Replace or inject from configuration/env

const resolveImageUrl = (url) => {
  if (!url || typeof url !== 'string') return '';
  const trimmed = url.trim();
  if (!trimmed) return '';

  if (/^(https?:\/\/|data:|blob:)/i.test(trimmed)) return trimmed;

  const path = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
  const base = API_BASE.endsWith('/') ? API_BASE.slice(0, -1) : API_BASE;
  
  return `${base}${path}`;
};

const getPostImage = (item) => {
  if (!item) return '';
  const raw = item.media_path || item.image_url || item.image || item.media_url || item.attachment_url;
  return resolveImageUrl(raw);
};

const normalizePostId = (post) => {
  const raw = post?.id ?? post?.post_id ?? null;
  if (raw === null || raw === undefined) return null;
  const n = Number(raw);
  return Number.isInteger(n) && n > 0 ? n : null;
};

export default function GroupPosts({
  currentUser,
  setCurrentUser,
  theme: themeMode,
  toggleTheme,
  hasUnreadNotifications
}) {
  const route = useRoute();
  const navigation = useNavigation();
  const groupId = route.params?.groupId;

  const activeTheme = themeMode === 'dark' ? theme.dark : theme.light;

  const [group, setGroup] = useState(null);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Post creation state
  const [postContent, setPostContent] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Edit Group State
  const [isEditingGroup, setIsEditingGroup] = useState(false);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editSubmitting, setEditSubmitting] = useState(false);

  const fetchGroupData = useCallback(async () => {
    if (!groupId) {
      setError('Invalid Group ID.');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await fetch(`${API_BASE}/api/groups/${groupId}`, {
        credentials: 'include'
      });
      if (!res.ok) {
        if (res.status === 404) {
          setError('Group not found.');
        } else {
          setError('Failed to load group details.');
        }
        setGroup(null);
        setPosts([]);
        return;
      }

      const data = await res.json();
      const groupData = data.group || null;
      setGroup(groupData);
      setPosts(Array.isArray(data.posts) ? data.posts : []);

      if (groupData) {
        setEditName(groupData.name || '');
        setEditDescription(groupData.description || '');
      }
    } catch (err) {
      console.error('Error loading group data:', err);
      setError('Could not load community group.');
      setGroup(null);
      setPosts([]);
    } finally {
      setLoading(false);
    }
  }, [groupId]);

  useEffect(() => {
    fetchGroupData();
  }, [fetchGroupData]);

  const handleCreateGroupPost = async () => {
    if (!currentUser) {
      Alert.alert('Authentication Required', 'Please log in to post in this group.');
      return;
    }

    if (!postContent.trim()) return;

    setSubmitting(true);
    const formData = new FormData();
    formData.append('content', postContent.trim());
    formData.append('group_id', groupId);

    try {
      const res = await fetch(`${API_BASE}/api/posts/create`, {
        method: 'POST',
        body: formData,
        credentials: 'include'
      });

      if (!res.ok) {
        Alert.alert('Error', 'Failed to create post within the group.');
        return;
      }

      setPostContent('');
      await fetchGroupData();
    } catch (err) {
      console.error('Error creating post:', err);
      Alert.alert('Error', 'An error occurred while posting.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateGroup = async () => {
    if (!editName.trim() || !editDescription.trim()) {
      Alert.alert('Required Fields', 'Name and description are required.');
      return;
    }

    setEditSubmitting(true);
    try {
      const res = await fetch(`${API_BASE}/api/groups/${groupId}/edit`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editName.trim(), description: editDescription.trim() }),
        credentials: 'include'
      });

      if (res.ok) {
        setIsEditingGroup(false);
        await fetchGroupData();
      } else {
        const data = await res.json();
        Alert.alert('Error', data.error || 'Failed to update group.');
      }
    } catch (err) {
      console.error('Error updating group:', err);
      Alert.alert('Error', 'An error occurred while updating the group.');
    } finally {
      setEditSubmitting(false);
    }
  };

  const handleDeleteGroup = () => {
    Alert.alert(
      'Delete Group',
      'Are you sure you want to delete this group? All posts inside it will also be deleted.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const res = await fetch(`${API_BASE}/api/groups/${groupId}/delete`, {
                method: 'DELETE',
                credentials: 'include'
              });

              if (res.ok) {
                navigation.navigate('Groups');
              } else {
                const data = await res.json();
                Alert.alert('Error', data.error || 'Failed to delete group.');
              }
            } catch (err) {
              console.error('Error deleting group:', err);
              Alert.alert('Error', 'An error occurred while deleting the group.');
            }
          }
        }
      ]
    );
  };

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: activeTheme.bg }}>
        <Navbar
          currentUser={currentUser}
          setCurrentUser={setCurrentUser}
          theme={themeMode}
          toggleTheme={toggleTheme}
          hasUnreadNotifications={hasUnreadNotifications}
        />
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 }}>
          <ActivityIndicator size="large" color={activeTheme.primary} />
          <Text style={{ marginTop: 16, color: activeTheme.text }}>Loading group...</Text>
        </View>
      </View>
    );
  }

  if (error || !group) {
    return (
      <View style={{ flex: 1, backgroundColor: activeTheme.bg }}>
        <Navbar
          currentUser={currentUser}
          setCurrentUser={setCurrentUser}
          theme={themeMode}
          toggleTheme={toggleTheme}
          hasUnreadNotifications={hasUnreadNotifications}
        />
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 }}>
          <Text style={{ color: activeTheme.danger, marginBottom: 16, fontSize: 16 }}>
            {error || 'Group not found'}
          </Text>
          <TouchableOpacity
            onPress={() => navigation.navigate('Groups')}
            style={[styles.btn, styles.btnPrimary]}
          >
            <Text style={styles.btnPrimaryText}>Back to Groups</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const isOwner = currentUser && (group.user_id === currentUser.id || group.username === currentUser.username);

  return (
    <View style={{ flex: 1, backgroundColor: activeTheme.bg }}>
      <Navbar
        currentUser={currentUser}
        setCurrentUser={setCurrentUser}
        theme={themeMode}
        toggleTheme={toggleTheme}
        hasUnreadNotifications={hasUnreadNotifications}
      />

      <ScrollView contentContainerStyle={styles.mainContainer}>
        <TouchableOpacity
          onPress={() => navigation.navigate('Groups')}
          style={{ marginBottom: 16 }}
        >
          <Text style={{ color: activeTheme.primary, fontSize: 15, fontWeight: '500' }}>
            ← Back to Groups
          </Text>
        </TouchableOpacity>

        <View style={[styles.card, { backgroundColor: activeTheme.cardBg, borderColor: activeTheme.borderColor }]}>
          {isEditingGroup ? (
            <View style={styles.form}>
              <Text style={{ fontSize: 18, fontWeight: 'bold', color: activeTheme.text }}>Edit Group</Text>
              
              <View style={styles.formGroup}>
                <Text style={[styles.label, { color: activeTheme.text }]}>Group Name</Text>
                <TextInput
                  value={editName}
                  onChangeText={setEditName}
                  style={[styles.input, { backgroundColor: activeTheme.bg, color: activeTheme.text, borderColor: activeTheme.borderColor }]}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={[styles.label, { color: activeTheme.text }]}>Description</Text>
                <TextInput
                  value={editDescription}
                  onChangeText={setEditDescription}
                  multiline
                  numberOfLines={3}
                  style={[styles.input, styles.textarea, { backgroundColor: activeTheme.bg, color: activeTheme.text, borderColor: activeTheme.borderColor }]}
                />
              </View>

              <View style={{ flexDirection: 'row', gap: 8 }}>
                <TouchableOpacity
                  onPress={handleUpdateGroup}
                  disabled={editSubmitting}
                  style={[styles.btn, styles.btnPrimary, { opacity: editSubmitting ? 0.6 : 1 }]}
                >
                  <Text style={styles.btnPrimaryText}>{editSubmitting ? 'Saving...' : 'Save Changes'}</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => setIsEditingGroup(false)}
                  style={[styles.btn, styles.btnOutline, { borderColor: activeTheme.borderColor }]}
                >
                  <Text style={[styles.btnOutlineText, { color: activeTheme.text }]}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                <View style={{ flex: 1, marginRight: 8 }}>
                  <Text style={{ fontSize: 20, fontWeight: 'bold', color: activeTheme.text, marginBottom: 4 }}>
                    {group.name}
                  </Text>
                  <TouchableOpacity onPress={() => navigation.navigate('Profile', { username: group.creator_username || group.username })}>
                    <Text style={{ fontSize: 14, color: activeTheme.secondaryText }}>
                      Created by @{group.creator_username || group.username}
                    </Text>
                  </TouchableOpacity>
                </View>

                {isOwner && (
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    <TouchableOpacity
                      onPress={() => setIsEditingGroup(true)}
                      style={[styles.btn, styles.btnOutline, { paddingVertical: 6, paddingHorizontal: 12, borderColor: activeTheme.borderColor }]}
                    >
                      <Text style={{ color: activeTheme.text, fontSize: 13 }}>Edit</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={handleDeleteGroup}
                      style={[styles.btn, { backgroundColor: activeTheme.danger, paddingVertical: 6, paddingHorizontal: 12 }]}
                    >
                      <Text style={{ color: '#ffffff', fontSize: 13 }}>Delete</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>

              <Text style={{ color: activeTheme.text, fontSize: 15, lineHeight: 22 }}>
                {group.description}
              </Text>
            </>
          )}
        </View>

        {currentUser ? (
          <View style={[styles.card, { backgroundColor: activeTheme.cardBg, borderColor: activeTheme.borderColor }]}>
            <TextInput
              value={postContent}
              onChangeText={setPostContent}
              placeholder={`Share an update with ${group.name}...`}
              placeholderTextColor={activeTheme.secondaryText}
              multiline
              numberOfLines={3}
              style={[styles.input, styles.textarea, { backgroundColor: activeTheme.bg, color: activeTheme.text, borderColor: activeTheme.borderColor, marginBottom: 12 }]}
            />
            
            <View style={{ alignItems: 'flex-end' }}>
              <TouchableOpacity
                onPress={handleCreateGroupPost}
                disabled={submitting || !postContent.trim()}
                style={[styles.btn, styles.btnPrimary, { opacity: (submitting || !postContent.trim()) ? 0.5 : 1 }]}
              >
                <Text style={styles.btnPrimaryText}>{submitting ? 'Posting...' : 'Post to Group'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View style={[styles.card, { backgroundColor: activeTheme.cardBg, borderColor: activeTheme.borderColor, alignItems: 'center' }]}>
            <Text style={{ color: activeTheme.secondaryText, fontSize: 14 }}>
              Please{' '}
              <Text style={{ color: activeTheme.primary, fontWeight: 'bold' }} onPress={() => navigation.navigate('Login')}>
                log in
              </Text>{' '}
              to participate or post in this group.
            </Text>
          </View>
        )}

        <Text style={{ fontSize: 18, fontWeight: '600', color: activeTheme.text, marginBottom: 16 }}>
          Group Discussions
        </Text>

        <View style={{ gap: 16 }}>
          {posts.length > 0 ? (
            posts.map((post) => {
              const postImage = getPostImage(post);
              const postId = normalizePostId(post);

              return (
                <View
                  key={`group-post-${post?.id ?? post?.post_id ?? Math.random()}`}
                  style={[styles.card, { backgroundColor: activeTheme.cardBg, borderColor: activeTheme.borderColor }]}
                >
                  <View style={styles.postHeader}>
                    <TouchableOpacity onPress={() => navigation.navigate('Profile', { username: post.username })}>
                      <Text style={[styles.username, { color: activeTheme.primary }]}>
                        @{post.username}
                      </Text>
                    </TouchableOpacity>
                    {post.created_at && (
                      <Text style={styles.timestamp}>{post.created_at}</Text>
                    )}
                  </View>

                  <Text style={{ color: activeTheme.text, fontSize: 15, marginVertical: 8, lineHeight: 22 }}>
                    {post.content}
                  </Text>

                  {postImage ? <PostMedia src={postImage} maxHeight={400} /> : null}

                  <View style={{ marginTop: 12 }}>
                    {postId ? (
                      <TouchableOpacity onPress={() => navigation.navigate('PostDetails', { postId })}>
                        <Text style={{ fontSize: 14, color: activeTheme.primary, fontWeight: '500' }}>
                          View Thread & Comments →
                        </Text>
                      </TouchableOpacity>
                    ) : (
                      <Text style={{ fontSize: 14, color: activeTheme.secondaryText }}>Thread unavailable</Text>
                    )}
                  </View>
                </View>
              );
            })
          ) : (
            <View style={[styles.card, { backgroundColor: activeTheme.cardBg, borderColor: activeTheme.borderColor, alignItems: 'center', paddingVertical: 40 }]}>
              <Text style={{ color: activeTheme.secondaryText }}>
                No posts in this group yet. Be the first to start a discussion!
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const { width } = Dimensions.get('window');

export const theme = {
  light: {
    bg: '#f8fafc',
    cardBg: '#ffffff',
    text: '#000000',
    borderColor: '#e2e8f0',
    primary: '#ccff00',
    primaryHover: '#b3e600',
    primaryText: '#000000',
    danger: '#ef4444',
    secondaryText: '#475569',
    headerBg: '#0f172a',
    headerText: '#ffffff',
    badgeBg: 'rgba(16, 185, 129, 0.12)',
    badgeText: '#047857',
    badgeBorder: '#10b981',
  },
  dark: {
    bg: '#000000',
    cardBg: '#121212',
    text: '#ffffff',
    borderColor: '#333333',
    primary: '#ccff00',
    primaryHover: '#b3e600',
    primaryText: '#000000',
    danger: '#ef4444',
    secondaryText: '#94a3b8',
    headerBg: '#000000',
    headerText: '#ffffff',
    badgeBg: 'rgba(204, 255, 0, 0.12)',
    badgeText: '#ccff00',
    badgeBorder: '#ccff00',
  },
};

export const styles = StyleSheet.create({
  mainContainer: {
    width: '100%',
    maxWidth: 1100,
    alignSelf: 'center',
    paddingHorizontal: 16,
    paddingVertical: 24,
  },
  card: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 6,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 2,
  },
  postHeader: {
    flexDirection: 'row',
    justify: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  username: {
    fontWeight: 'bold',
    fontSize: 15,
  },
  timestamp: {
    fontSize: 13,
    color: '#64748b',
  },
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 6,
  },
  btnPrimary: {
    backgroundColor: '#ccff00',
    borderWidth: 2,
    borderColor: '#000000',
    borderRadius: 6,
    paddingVertical: 10,
    paddingHorizontal: 20,
    shadowColor: '#000000',
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 4,
  },
  btnPrimaryText: {
    color: '#000000',
    fontWeight: '600',
    fontSize: 15,
  },
  btnOutline: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#000000',
    borderRadius: 6,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  btnOutlineText: {
    color: '#000000',
    fontWeight: '500',
  },
  form: {
    gap: 16,
  },
  formGroup: {
    gap: 6,
  },
  label: {
    fontWeight: '600',
    fontSize: 14,
  },
  input: {
    width: '100%',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 6,
    fontSize: 15,
  },
  textarea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
});