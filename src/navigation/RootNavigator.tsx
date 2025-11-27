import React, { useState } from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import LoginScreen from '../screens/Auth/LoginScreen';
import RegisterScreen from '../screens/Auth/RegisterScreen';
import HomeScreen from '../screens/Home/HomeScreen';
import AccountContainerScreen from '../screens/AccountContainerCreation';
import AccountScreen from '../screens/AccountScreen';
import CategoryScreen from '../screens/CategoryScreen';
import CreateTransactionScreen from '../screens/Transaction/CreateTransactionScreen';
import ViewTransactionScreen from '../screens/Transaction/ViewTransactionScreen';
import { useAppSelector } from '../store';
import { View, Text } from 'react-native';
import SlideDownBanner from '../components/SlideDownBanner'
import { SafeAreaView } from 'react-native-safe-area-context';

const Stack = createNativeStackNavigator();

export default function RootNavigator() {
  const token = useAppSelector((s) => s.auth.token);
  const [bannerMessage, setBannerMessage] = useState<string | null>(null);
  const [bannerType, setBannerType] = useState<'success' | 'error' | 'info' | null >(null);

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
              options={{title: 'Home'}}
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
              name="CreateTransaction"
              component={CreateTransactionScreen}
              options={{ title: 'Create Transaction' }}
            />
            <Stack.Screen
              name="ViewTransactions"
              component={ViewTransactionScreen}
              options={{ title: 'View Transactions' }} />
          </>
        )}
      </Stack.Navigator>
  );
}
