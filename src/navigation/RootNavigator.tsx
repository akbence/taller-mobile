import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import LoginScreen from '../screens/Auth/LoginScreen';
import RegisterScreen from '../screens/Auth/RegisterScreen';
import HomeScreen from '../screens/Home/HomeScreen';
import { useAppSelector } from '../store';

const Stack = createNativeStackNavigator();

export default function RootNavigator() {
  const token = useAppSelector((s) => s.auth.token);

  return (
    <Stack.Navigator>
      {!token ? (
        <>
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="Register" component={RegisterScreen} />
        </>
      ) : (
        <>
          <Stack.Screen name="Home" component={HomeScreen} />
        </>
      )}
    </Stack.Navigator>
  );
}
