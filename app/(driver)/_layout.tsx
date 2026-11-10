import React from 'react';
import { Stack } from 'expo-router';

export default function DriverLayout() {
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
    </Stack>
  );
}
