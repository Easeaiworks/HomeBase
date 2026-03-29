import React from 'react';
import { Tabs, useRouter } from 'expo-router';
import { View, TouchableOpacity, StyleSheet, Text } from 'react-native';
import { colors, shadows, borderRadius } from '../../constants/theme';

function TabIcon({ name, focused }: { name: string; focused: boolean }) {
  const icons: Record<string, string> = {
    home: 'ð ',
    calendar: 'ð',
    lists: 'ð',
    more: 'âï¸',
  };

  return (
    <View style={[styles.tabIcon, focused && styles.tabIconActive]}>
      <Text style={[styles.emoji, focused && styles.emojiActive]}>{icons[name] || 'ð±'}</Text>
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
            title: 'Ask',
            tabBarButton: () => (
              <TouchableOpacity
                style={styles.voiceCenterBtn}
                activeOpacity={0.8}
                onPress={() => router.push('/voice-assistant')}
              >
                <View style={styles.voiceCenterInner}>
                  <Text style={styles.voiceCenterEmoji}>ðï¸</Text>
                </View>
                <Text style={styles.voiceCenterLabel}>Ask</Text>
              </TouchableOpacity>
            ),
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
    shadowColor: colors.green[500],
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
    transform: [{ scale: 1.05 }],
  },
  emoji: {
    fontSize: 20,
  },
  emojiActive: {
    fontSize: 22,
  },
  voiceCenterBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingTop: 2,
  },
  voiceCenterInner: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.green[500],
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: -24,
    shadowColor: colors.green[500],
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.45,
    shadowRadius: 16,
    elevation: 10,
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.50)',
  },
  voiceCenterEmoji: {
    fontSize: 24,
  },
  voiceCenterLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.green[600],
    marginTop: 2,
    letterSpacing: 0.1,
  },
});