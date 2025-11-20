// src/screens/Auth/LoginScreen.tsx
import React, { useState } from 'react';
import { View, Text, TextInput, Button, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAppDispatch } from '../../store';
import { setAuth } from '../../store/authSlice';
import { UserControllerApiFp, Configuration, TokenResponse } from '../../services/generated';
import { apiClient } from '../../services/apiClient';
import { env } from '../../utils/env';

export default function LoginScreen() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const dispatch = useAppDispatch();

  const onSubmit = async () => {
    try {
      const config = new Configuration({ basePath: env.baseURL });
      const loginFn = await UserControllerApiFp(config).login({ username, password });
      const response = await loginFn(apiClient, env.baseURL);
      const data: TokenResponse = response.data;

      if (!data.token) {
        throw new Error('Token missing from response');
      }

      await AsyncStorage.setItem('authToken', data.token);
      dispatch(setAuth({ user: null, token: data.token })); // ha nincs user, null-t küldünk
    } catch (e: any) {
      console.error('Login error:', e);
      Alert.alert('Login failed', e?.message ?? 'Unknown error');
    }
  };

  return (
    <View style={{ padding: 16 }}>
      <Text style={{ fontSize: 24, marginBottom: 12 }}>Welcome back</Text>
      <TextInput
        placeholder="Username"
        autoCapitalize="none"
        value={username}
        onChangeText={setUsername}
        style={{ borderWidth: 1, padding: 8, marginBottom: 8 }}
      />
      <TextInput
        placeholder="Password"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
        style={{ borderWidth: 1, padding: 8, marginBottom: 16 }}
      />
      <Button title="Login" onPress={onSubmit} />
    </View>
  );
}
