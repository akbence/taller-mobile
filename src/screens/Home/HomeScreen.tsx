import React from 'react';
import { View, Text, Button } from 'react-native';
import { useAppDispatch, useAppSelector } from '../../store';
import { clearAuth } from '../../store/authSlice';

export default function HomeScreen({ navigation }: any) {
  const user = useAppSelector((s) => s.auth.user);
  const dispatch = useAppDispatch();

  const logout = () => {
    globalThis.__AUTH_TOKEN__ = undefined;
    dispatch(clearAuth());
  };

  return (
    <View style={{ padding: 16 }}>
      <Text style={{ fontSize: 24, marginBottom: 12 }}>
        Welcome{user?.name ? `, ${user.name}` : ''} 👋
      </Text>
      <Text style={{ marginBottom: 24 }}>
        You’re now logged in to Tallér Mobile.
      </Text>
      <Button title="View Items" onPress={() => navigation.navigate('Items')} />
      <View style={{ marginTop: 16 }}>
        <Button title="Logout" color="red" onPress={logout} />
      </View>
    </View>
  );
}
