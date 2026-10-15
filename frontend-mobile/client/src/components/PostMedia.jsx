import React, { useState } from 'react';
import { View, Image, StyleSheet } from 'react-native';
import { Video, ResizeMode } from 'expo-av';

const isVideoUrl = (url) => /\.(mp4|webm|mov)$/i.test(url || '');

export default function PostMedia({ src, alt = 'Attachment', maxHeight = 500 }) {
  const [failed, setFailed] = useState(false);

  if (!src || failed) return null;

  const isVideo = isVideoUrl(src);

  return (
    <View style={localStyles.container}>
      {isVideo ? (
        <Video
          source={{ uri: src }}
          style={[localStyles.media, { height: maxHeight }]}
          useNativeControls
          resizeMode={ResizeMode.CONTAIN}
          onError={() => setFailed(true)}
        />
      ) : (
        <Image
          source={{ uri: src }}
          accessibilityLabel={alt}
          style={[localStyles.media, { height: maxHeight }]}
          resizeMode="contain"
          onError={() => setFailed(true)}
        />
      )}
    </View>
  );
}

const localStyles = StyleSheet.create({
  container: {
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.03)',
    borderRadius: 8,
    overflow: 'hidden',
    marginTop: 8,
    marginBottom: 12,
  },
  media: {
    width: '100%',
  },
});