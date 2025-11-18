// src/screens/Auth/LoginScreen.tsx
import React, { useState } from 'react';
import { View, Text, TextInput, Button, Alert } from 'react-native';
import { login } from '../../services/auth';
import { useAppDispatch } from '../../store';
import { setAuth } from '../../store/authSlice';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function LoginScreen() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const dispatch = useAppDispatch();

  const onSubmit = async () => {
    try {
      const res = await login({ username, password });
      await AsyncStorage.setItem('authToken', res.token); 
      dispatch(setAuth({ user: res.user, token: res.token })); 
    } catch (e: any) {
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
