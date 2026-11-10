import React from 'react';
import { Tabs } from 'expo-router';
import { Text } from 'react-native';

export default function CommuterTabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#0F172A',
          borderTopColor: '#1E293B',
          height: 60,
          paddingBottom: 8,
          paddingTop: 6,
        },
        tabBarActiveTintColor: '#F59E0B',
        tabBarInactiveTintColor: '#64748B',
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Route Finder',
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 18 }}>🗺️</Text>,
        }}
      />
      <Tabs.Screen
        name="trips"
        options={{
          title: 'My Trips',
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 18 }}>🎫</Text>,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile & Cache',
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 18 }}>👤</Text>,
        }}
      />
    </Tabs>
  );
}
