import React from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';

const themeColors = {
  light: {
    cardBg: '#ffffff',
    text: '#000000',
    borderColor: '#e2e8f0',
    primary: '#ccff00',
    secondaryText: '#475569',
  },
  dark: {
    cardBg: '#121212',
    text: '#ffffff',
    borderColor: '#333333',
    primary: '#ccff00',
    secondaryText: '#94a3b8',
  },
};

export default function ReplyComposer({
  value,
  onChange,
  onSubmit,
  onCancel,
  placeholder = 'Write a reply...',
  submitting = false,
  theme = 'light',
}) {
  const isDark = theme === 'dark';
  const activeTheme = isDark ? themeColors.dark : themeColors.light;
  const isDisabled = submitting || !value?.trim();

  return (
    <View style={[styles.container, { borderTopColor: activeTheme.borderColor }]}>
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={activeTheme.secondaryText}
        multiline={true}
        numberOfLines={2}
        autoFocus={true}
        textAlignVertical="top"
        style={[
          styles.textarea,
          {
            backgroundColor: activeTheme.cardBg,
            borderColor: activeTheme.borderColor,
            color: activeTheme.text,
          },
        ]}
      />
      <View style={styles.actions}>
        <TouchableOpacity
          onPress={onCancel}
          activeOpacity={0.7}
          style={[styles.btnCancel, { borderColor: activeTheme.borderColor }]}
        >
          <Text style={[styles.btnCancelText, { color: activeTheme.text }]}>
            Cancel
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={onSubmit}
          disabled={isDisabled}
          activeOpacity={0.8}
          style={[styles.btnPrimary, isDisabled && styles.btnDisabled]}
        >
          {submitting ? (
            <ActivityIndicator size="small" color="#000000" />
          ) : (
            <Text style={styles.btnPrimaryText}>Reply</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'column',
    gap: 8,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderStyle: 'dashed',
  },
  textarea: {
    width: '100%',
    minHeight: 80,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 6,
    borderWidth: 1,
    fontSize: 14,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 8,
  },
  btnCancel: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 6,
    borderWidth: 1,
    backgroundColor: 'transparent',
  },
  btnCancelText: {
    fontSize: 13,
    fontWeight: '500',
  },
  btnPrimary: {
    backgroundColor: '#ccff00',
    borderWidth: 2,
    borderColor: '#000000',
    borderRadius: 6,
    paddingVertical: 8,
    paddingHorizontal: 16,
    shadowColor: '#000000',
    shadowOffset: { width: 3, height: 3 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 3,
  },
  btnPrimaryText: {
    color: '#000000',
    fontWeight: '600',
    fontSize: 13,
  },
  btnDisabled: {
    opacity: 0.5,
    shadowOffset: { width: 0, height: 0 },
    elevation: 0,
  },
});