import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { useAppDispatch, useAppSelector } from '../../store';
import { clearAuth } from '../../store/authSlice';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function HomeScreen({ navigation }: any) {
  const user = useAppSelector((s) => s.auth.user);
  const dispatch = useAppDispatch();

  const logout = async () => {
    try {
      await AsyncStorage.clear();
      dispatch(clearAuth());
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>
        Welcome{user?.name ? `, ${user.name}` : ''} 👋
      </Text>

      <Text style={styles.subtitle}>
        You’re now logged in to Tallér Mobile.
      </Text>

      <View style={styles.card}>
        <TouchableOpacity
          style={styles.button}
          onPress={() => navigation.navigate('AccountContainer')}
        >
          <Text style={styles.buttonText}>Create New Account Containers</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.button}
          onPress={() => navigation.navigate('Account')}
        >
          <Text style={styles.buttonText}>Manage Accounts</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.button}
          onPress={() => navigation.navigate('Category')}
        >
          <Text style={styles.buttonText}>Manage Categories</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.button}
          onPress={() => navigation.navigate('Transaction')}
        >
          <Text style={styles.buttonText}>Add Transaction</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.logoutButton} onPress={logout}>
        <Text style={styles.logoutText}>Logout</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 24,
    paddingTop: 40,
    backgroundColor: '#f4f4f9',
    flexGrow: 1,
  },
  title: {
    fontSize: 30,
    fontWeight: '700',
    color: '#333',
    textAlign: 'center',
  },
  subtitle: {
    marginTop: 8,
    marginBottom: 24,
    textAlign: 'center',
    color: '#666',
    fontSize: 16,
  },
  card: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 18,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  button: {
    backgroundColor: '#5A67D8',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 14,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  logoutButton: {
    marginTop: 24,
    paddingVertical: 14,
    alignItems: 'center',
    backgroundColor: '#E53E3E',
    borderRadius: 12,
  },
  logoutText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
