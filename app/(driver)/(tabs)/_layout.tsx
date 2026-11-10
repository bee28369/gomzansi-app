import React from 'react';
import { Tabs } from 'expo-router';
import { Text } from 'react-native';

export default function DriverTabsLayout() {
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
        tabBarActiveTintColor: '#10B981',
        tabBarInactiveTintColor: '#64748B',
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Driver Deck',
          tabBarIcon: () => <Text style={{ fontSize: 18 }}>🚐</Text>,
        }}
      />
      <Tabs.Screen
        name="queue"
        options={{
          title: 'Marshal Queue',
          tabBarIcon: () => <Text style={{ fontSize: 18 }}>📋</Text>,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Permit & ID',
          tabBarIcon: () => <Text style={{ fontSize: 18 }}>🛡️</Text>,
        }}
      />
    </Tabs>
  );
}
