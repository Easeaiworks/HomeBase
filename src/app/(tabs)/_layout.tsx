import React from 'react';
import { Tabs, useRouter } from 'expo-router';
import { View, TouchableOpacity, StyleSheet, Text } from 'react-native';
import { colors, shadows, borderRadius } from '../../constants/theme';

function TabIcon({ name, focused }: { name: string; focused: boolean }) {
  const icons: Record<string, string> = {
    home: '🏠',
    calendar: '📅',
    expenses: '💰',
    lists: '🛒',
    more: '⚙️',
  };

  return (
    <View style={[styles.tabIcon, focused && styles.tabIconActive]}>
      <Text style={[styles.emoji, focused && styles.emojiActive]}>{icons[name] || '📱'}</Text>
    </View>
  );
}

export default function TabLayout() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarStyle: styles.tabBar,
          tabBarActiveTintColor: colors.green[600],
          tabBarInactiveTintColor: colors.gray[400],
          tabBarLabelStyle: styles.tabLabel,
        }}
      >
        <Tabs.Screen
          name="home"
          options={{
            title: 'Home',
            tabBarIcon: ({ focused }) => <TabIcon name="home" focused={focused} />,
          }}
        />
        <Tabs.Screen
          name="calendar"
          options={{
            title: 'Calendar',
            tabBarIcon: ({ focused }) => <TabIcon name="calendar" focused={focused} />,
          }}
        />
        <Tabs.Screen
          name="expenses"
          options={{
            title: 'Expenses',
            tabBarIcon: ({ focused }) => <TabIcon name="expenses" focused={focused} />,
          }}
        />
        <Tabs.Screen
          name="lists"
          options={{
            title: 'Lists',
            tabBarIcon: ({ focused }) => <TabIcon name="lists" focused={focused} />,
          }}
        />
        <Tabs.Screen
          name="more"
          options={{
            title: 'More',
            tabBarIcon: ({ focused }) => <TabIcon name="more" focused={focused} />,
          }}
        />
      </Tabs>

      {/* Floating Voice Button — glass effect with green glow */}
      <TouchableOpacity
        style={styles.voiceButton}
        activeOpacity={0.8}
        onPress={() => router.push('/voice-assistant')}
      >
        <Text style={styles.voiceEmoji}>🎙️</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  tabBar: {
    backgroundColor: colors.glass.nav,
    borderTopWidth: 0.5,
    borderTopColor: 'rgba(0,0,0,0.06)',
    height: 88,
    paddingTop: 8,
    paddingBottom: 24,
    ...shadows.lg,
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.1,
  },
  tabIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabIconActive: {
    backgroundColor: colors.green[50],
    ...shadows.sm,
  },
  emoji: {
    fontSize: 20,
  },
  emojiActive: {
    fontSize: 22,
  },
  voiceButton: {
    position: 'absolute',
    bottom: 52,
    alignSelf: 'center',
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.green[500],
    justifyContent: 'center',
    alignItems: 'center',
    ...shadows.lg,
    shadowColor: colors.green[600],
    shadowOpacity: 0.35,
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.40)',
    zIndex: 10,
  },
  voiceEmoji: {
    fontSize: 28,
  },
});
