// Learn more https://docs.expo.io/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Ensure proper web support - minimal changes to avoid breaking
if (config.resolver) {
  config.resolver.sourceExts = [...(config.resolver.sourceExts || []), 'jsx', 'js', 'ts', 'tsx', 'json'];
}

module.exports = config;

