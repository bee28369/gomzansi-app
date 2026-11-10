import React from 'react';
import { Stack } from 'expo-router';

export default function CommuterLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: '#090D16' },
        headerTintColor: '#F8FAFC',
        headerBackTitle: 'Back',
        contentStyle: { backgroundColor: '#090D16' },
      }}
    >
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="trip/[id]" options={{ title: 'Live Trip Telemetry' }} />
      <Stack.Screen name="lost-found/index" options={{ title: 'Rank Lost & Found' }} />
      <Stack.Screen name="lost-found/create" options={{ title: 'Report Lost Item' }} />
    </Stack>
  );
}
