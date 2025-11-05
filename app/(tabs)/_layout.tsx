import { Stack } from 'expo-router';

export default function TabLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="schedule" />
      <Stack.Screen name="add-employee" />
      <Stack.Screen name="time-entry/[employeeId]" />
    </Stack>
  );
}
