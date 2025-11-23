import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import LoginScreen from '../screens/Auth/LoginScreen';
import RegisterScreen from '../screens/Auth/RegisterScreen';
import HomeScreen from '../screens/Home/HomeScreen';
import AccountContainerScreen from '../screens/AccountContainerCreation';
import AccountScreen from '../screens/AccountScreen';
import CategoryScreen from '../screens/CategoryScreen';
import TransactionScreen from '../screens/TransactionScreen';
import { useAppSelector } from '../store';

const Stack = createNativeStackNavigator();

export default function RootNavigator() {
  const token = useAppSelector((s) => s.auth.token);

  return (
    <Stack.Navigator>
      {!token ? (
        <>
          <Stack.Screen
            name="Login"
            component={LoginScreen}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="Register"
            component={RegisterScreen}
            options={{ headerShown: false }}
          />
        </>
      ) : (
        <>
          <Stack.Screen
            name="Home"
            component={HomeScreen}
            options={{ title: 'Tallér' }}
          />
          <Stack.Screen
            name="AccountContainer"
            component={AccountContainerScreen}
            options={{ title: 'Account Containers' }}
          />
          <Stack.Screen
            name="Account"
            component={AccountScreen}
            options={{ title: 'Accounts' }}
          />
          <Stack.Screen
            name="Category"
            component={CategoryScreen}
            options={{ title: 'Categories' }}
          />
          <Stack.Screen
            name="Transaction"
            component={TransactionScreen}
            options={{ title: 'Transactions' }}
          />
        </>
      )}
    </Stack.Navigator>
  );
}
