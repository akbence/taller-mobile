import React, { useState } from 'react';
import { View, Text, TextInput, Button, Alert } from 'react-native';
import { register } from '../../services/auth';
import { useAppDispatch } from '../../store';
import { setAuth } from '../../store/authSlice';

export default function RegisterScreen() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const dispatch = useAppDispatch();

  const onSubmit = async () => {
    try {
      const res = await register({ name, email, password });
      globalThis.__AUTH_TOKEN__ = res.token;
      dispatch(setAuth({ user: res.user, token: res.token }));
    } catch (e: any) {
      Alert.alert('Registration failed', e?.message ?? 'Unknown error');
    }
  };

  return (
    <View style={{ padding: 16 }}>
      <Text style={{ fontSize: 24, marginBottom: 12 }}>Create an Account</Text>
      <TextInput
        placeholder="Name"
        value={name}
        onChangeText={setName}
        style={{ borderWidth: 1, padding: 8, marginBottom: 8 }}
      />
      <TextInput
        placeholder="Email"
        autoCapitalize="none"
        value={email}
        onChangeText={setEmail}
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
