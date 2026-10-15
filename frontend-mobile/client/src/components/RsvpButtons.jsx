import React from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet } from 'react-native';

import goingIcon from '../../assets/going.png';
import interestedIcon from '../../assets/interested.png';

export default function RsvpButtons({
  goingCount = 0,
  interestedCount = 0,
  userStatus,
  onRsvp,
}) {
  const isGoing = userStatus === 'going';
  const isInterested = userStatus === 'interested';

  return (
    <View style={styles.container}>
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={() => onRsvp('going')}
        style={styles.button}
      >
        <Image
          source={goingIcon}
          style={[
            styles.icon,
            { tintColor: isGoing ? '#22c55e' : '#64748b' },
          ]}
        />
        <Text style={[styles.text, isGoing && styles.activeText]}>
          {goingCount > 0 ? goingCount : 'Going'}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        activeOpacity={0.7}
        onPress={() => onRsvp('interested')}
        style={styles.button}
      >
        <Image
          source={interestedIcon}
          style={[
            styles.icon,
            { tintColor: isInterested ? '#22c55e' : '#64748b' },
          ]}
        />
        <Text style={[styles.text, isInterested && styles.activeText]}>
          {interestedCount > 0 ? interestedCount : 'Interested'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 4,
    paddingHorizontal: 4,
  },
  icon: {
    width: 18,
    height: 18,
    resizeMode: 'contain',
  },
  text: {
    fontSize: 14,
    color: '#64748b',
    fontWeight: '400',
  },
  activeText: {
    color: '#22c55e',
    fontWeight: '700',
  },
});