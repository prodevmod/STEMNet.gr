import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { WebView } from 'react-native-webview';

const SITE_KEY =
  process.env.EXPO_PUBLIC_RECAPTCHA_SITE_KEY ||
  process.env.VITE_RECAPTCHA_SITE_KEY ||
  '';

export default function Recaptcha({ siteKey = SITE_KEY, onChange, onExpired }) {
  const activeSiteKey = siteKey || SITE_KEY;

  if (!activeSiteKey) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>
          reCAPTCHA is misconfigured (missing site key).
        </Text>
      </View>
    );
  }

  const generateHtml = () => `
    <!DOCTYPE html>
    <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0">
        <script src="https://www.google.com/recaptcha/api.js" async defer></script>
        <style>
          html, body {
            margin: 0;
            padding: 0;
            background-color: transparent;
            display: flex;
            justify-content: center;
            align-items: center;
            height: 100%;
          }
        </style>
      </head>
      <body>
        <div 
          class="g-recaptcha" 
          data-sitekey="${activeSiteKey}" 
          data-callback="onSuccess" 
          data-expired-callback="onExpired">
        </div>
        <script>
          function onSuccess(token) {
            if (window.ReactNativeWebView) {
              window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'success', token: token }));
            }
          }
          function onExpired() {
            if (window.ReactNativeWebView) {
              window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'expired' }));
            }
          }
        </script>
      </body>
    </html>
  `;

  const handleMessage = (event) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'success') {
        if (onChange) onChange(data.token);
      } else if (data.type === 'expired') {
        if (onChange) onChange('');
        if (onExpired) onExpired();
      }
    } catch (err) {
      console.error('reCAPTCHA message parse error:', err);
    }
  };

  return (
    <View style={styles.container}>
      <WebView
        originWhitelist={['*']}
        source={{ html: generateHtml(), baseUrl: 'https://localhost' }}
        onMessage={handleMessage}
        style={styles.webview}
        scrollEnabled={false}
        javaScriptEnabled={true}
        automaticallyAdjustContentInsets={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    height: 100,
    marginVertical: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  webview: {
    width: 304,
    height: 78,
    backgroundColor: 'transparent',
  },
  errorContainer: {
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorText: {
    color: '#ef4444',
    fontSize: 14,
    textAlign: 'center',
  },
});