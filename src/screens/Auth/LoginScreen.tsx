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

// Kulcs a perzisztens tároláshoz
const OFFLINE_AUTH_KEY = 'offlineAuthToken';

export default function LoginScreen() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false); // Új állapot a gombkezeléshez
  const dispatch = useAppDispatch();

  /**
   * Ellenőrzi, hogy van-e offline tárolt token, és ha van, bejelentkezett állapotba állítja a Redux-ot.
   */
  const checkOfflineLogin = async () => {
    try {
      const storedToken = await AsyncStorage.getItem(OFFLINE_AUTH_KEY);
      console.log(storedToken)
      
      if (storedToken) {
        // Token létezik, így offline módban is újraindítjuk a munkamenetet
        Alert.alert(
          'Offline Login',
          'Sikertelen online bejelentkezés. Az utolsó sikeres munkamenet betöltve offline módban.',
          [{ text: 'OK' }],
        );
        // Beállítjuk az Auth állapotot a tárolt tokennel (user null, mert a felhasználói adatok külön töltődhetnek be a fő appban)
        dispatch(setAuth({ user: null, token: storedToken }));
        return true;
      }
    } catch (e) {
      console.warn('Hiba az offline token beolvasásakor:', e);
    }
    return false;
  };

  const onSubmit = async () => {
    if (!username.trim()) {
        Alert.alert('Hiba', 'Felhasználónév és jelszó megadása szükséges.');
        return;
    }

    setSubmitting(true);
    try {
      // --- Online Bejelentkezés Kísérlete ---
      const config = new Configuration({ basePath: env.baseURL });
      const loginFn = await UserControllerApiFp(config).login({ username, password });
      // A loginFn függvény visszatérő típusa valószínűleg egy Promise<AxiosResponse<TokenResponse>> a generált kódban
      const response = await loginFn(apiClient, env.baseURL);
      const data: TokenResponse = response.data;

      if (!data.token) {
        throw new Error('Token hiányzik a válaszból.');
      }

      // --- Sikeres Online Bejelentkezés esetén ---
      // 1. Mentjük az új tokent perzisztensen
      await AsyncStorage.setItem(OFFLINE_AUTH_KEY, data.token);
      await AsyncStorage.setItem('authToken', data.token);

      
      // 2. Frissítjük a Redux állapotot és belépünk az appba
      dispatch(setAuth({ user: null, token: data.token }));
      
    } catch (e: any) {
      console.error('Login error:', e);
      
      // --- Hiba esetén (Offline mód) ---
      const isOfflineLoginSuccessful = await checkOfflineLogin();

      if (!isOfflineLoginSuccessful) {
        // Ha nincs mentett token, akkor is hibaüzenetet mutatunk
        Alert.alert(
          'Bejelentkezés sikertelen',
          e?.message || 'Nem sikerült bejelentkezni online, és nincs mentett munkamenet sem.',
        );
      }
    } finally {
      setSubmitting(false);
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
          editable={!submitting}
        />

        <TextInput
          placeholder="Password"
          secureTextEntry
          placeholderTextColor="#999"
          value={password}
          onChangeText={setPassword}
          style={styles.input}
          editable={!submitting}
        />

        <TouchableOpacity 
          style={styles.button} 
          onPress={onSubmit} 
          disabled={submitting} // Gomb kikapcsolása küldés alatt
        >
          <Text style={styles.buttonText}>{submitting ? 'Logging In...' : 'Log In'}</Text>
        </TouchableOpacity>
        
        {/* Offline bejelentkezés tesztelésére szolgáló gomb (opcionális) */}
        <TouchableOpacity style={[styles.button, styles.secondaryButton]} onPress={checkOfflineLogin}>
            <Text style={styles.secondaryButtonText}>Offline Bejelentkezés (Mentett Token)</Text>
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
  secondaryButton: {
    backgroundColor: '#fff', 
    borderColor: '#5A67D8',
    borderWidth: 1,
    marginTop: 10,
  },
  secondaryButtonText: {
    color: '#5A67D8',
    fontWeight: '600',
    fontSize: 17,
  }
});