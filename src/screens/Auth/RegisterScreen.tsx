// src/screens/Auth/RegisterScreen.tsx
import React, { useState } from 'react';
import { View, Text, TextInput, Button, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAppDispatch } from '../../store';
import { setAuth } from '../../store/authSlice';
import { UserControllerApiFp, Configuration, TokenResponse, UserDto } from '../../services/generated';
import { apiClient } from '../../services/apiClient';
import { env } from '../../utils/env';

export default function RegisterScreen() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const dispatch = useAppDispatch();

  const onSubmit = async () => {
    try {
      const config = new Configuration({ basePath: env.baseURL });
      const registerFn = await UserControllerApiFp(config).createUser({ username, password });
      const response = await registerFn(apiClient, env.baseURL);
      const data: UserDto = response.data;

      // if (!data.token) {
      //   throw new Error('Token missing from response');
      // }

      // await AsyncStorage.setItem('authToken', data.token);
      // dispatch(setAuth({ user: null, token: data.token }));
    } catch (e: any) {
      console.error('Register error:', e);
      Alert.alert('Registration failed', e?.message ?? 'Unknown error');
    }
  };

  return (
    <View style={{ padding: 16 }}>
      <Text style={{ fontSize: 24, marginBottom: 12 }}>Create account</Text>
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
      <Button title="Register" onPress={onSubmit} />
    </View>
  );
}
