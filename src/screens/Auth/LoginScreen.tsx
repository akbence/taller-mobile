// src/screens/Auth/LoginScreen.tsx
import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAppDispatch } from '../../store';
import { setAuth } from '../../store/authSlice';
import {
  UserControllerApiFp,
  Configuration,
  TokenResponse,
} from '../../services/generated';
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
      dispatch(setAuth({ user: null, token: data.token }));
    } catch (e: any) {
      console.error('Login error:', e);
      Alert.alert('Login failed', e?.message ?? 'Unknown error');
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Text style={styles.header}>Welcome Back 👋</Text>

      <View style={styles.card}>
        <TextInput
          placeholder="Username"
          autoCapitalize="none"
          placeholderTextColor="#999"
          value={username}
          onChangeText={setUsername}
          style={styles.input}
        />

        <TextInput
          placeholder="Password"
          secureTextEntry
          placeholderTextColor="#999"
          value={password}
          onChangeText={setPassword}
          style={styles.input}
        />

        <TouchableOpacity style={styles.button} onPress={onSubmit}>
          <Text style={styles.buttonText}>Log In</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
    backgroundColor: '#f4f4f9',
  },
  header: {
    fontSize: 32,
    fontWeight: '700',
    marginBottom: 28,
    alignSelf: 'center',
    color: '#333',
  },
  card: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    padding: 14,
    borderRadius: 12,
    marginBottom: 14,
    backgroundColor: '#fafafa',
    fontSize: 16,
  },
  button: {
    backgroundColor: '#5A67D8',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 4,
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 17,
  },
});
