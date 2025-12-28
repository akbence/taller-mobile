import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  SafeAreaView,
} from 'react-native';
import { useAppDispatch, useAppSelector } from '../../store';
import { clearAuth } from '../../store/authSlice';
import AsyncStorage from '@react-native-async-storage/async-storage';
import ServerStatusBar from './ServerStatusBar';
import { useBanner } from '../../components/BannerContext';
import SlideDownBanner from '../../components/SlideDownBanner';

export default function HomeScreen({ navigation }: any) {
  const user = useAppSelector((s) => s.auth.user);
  const { banner } = useBanner();
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
    <SafeAreaView style={styles.container}>
      {banner.message ? (
        <SlideDownBanner message={banner.message} type={banner.type} />
      ) : null}

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.header}>
          Üdvözöllek{user?.name ? `, ${user.name}` : ''} 👋
        </Text>

        <Text style={styles.subHeader}>
          Sikeresen bejelentkeztél a Tallér Mobile alkalmazásba.
        </Text>

        <View style={styles.card}>
          <Text style={styles.label}>Pénzügyek kezelése</Text>

          <TouchableOpacity
            style={styles.button}
            onPress={() => navigation.navigate('AccountContainer')}
          >
            <Text style={styles.buttonText}>Account Containers</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, { marginTop: 12 }]}
            onPress={() => navigation.navigate('Account')}
          >
            <Text style={styles.buttonText}>Accounts</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, { marginTop: 12 }]}
            onPress={() => navigation.navigate('Category')}
          >
            <Text style={styles.buttonText}>Categories</Text>
          </TouchableOpacity>
        </View>

        <View style={[styles.card, { marginTop: 16 }]}>
          <Text style={styles.label}>Tranzakciók</Text>

          <TouchableOpacity
            style={styles.button}
            onPress={() => navigation.navigate('CreateTransaction')}
          >
            <Text style={styles.buttonText}>Add Transaction</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, { marginTop: 12 }]}
            onPress={() => navigation.navigate('ViewTransactions')}
          >
            <Text style={styles.buttonText}>View Transactions</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, { marginTop: 12 }]}
            onPress={() => navigation.navigate('PendingElements')}
          >
            <Text style={styles.buttonText}>View Pending Elements</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={styles.logoutButton}
          onPress={logout}
        >
          <Text style={styles.logoutButtonText}>Kijelentkezés</Text>
        </TouchableOpacity>
      </ScrollView>

      <ServerStatusBar pollIntervalMs={5000} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f7fafc'
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40
  },
  header: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
    color: '#2d3748',
    marginTop: 20
  },
  subHeader: {
    fontSize: 16,
    color: '#718096',
    textAlign: 'center',
    marginBottom: 32,
  },
  card: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3
  },
  label: {
    fontSize: 12,
    fontWeight: '800',
    color: '#718096',
    marginBottom: 16,
    textTransform: 'uppercase',
    letterSpacing: 0.5
  },
  button: {
    backgroundColor: '#5a67d8',
    padding: 16,
    borderRadius: 10,
    alignItems: 'center'
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16
  },
  logoutButton: {
    marginTop: 32,
    padding: 16,
    alignItems: 'center',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#feb2b2',
    backgroundColor: '#fff'
  },
  logoutButtonText: {
    color: '#f56565',
    fontWeight: 'bold',
    fontSize: 16
  }
});