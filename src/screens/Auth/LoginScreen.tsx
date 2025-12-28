import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAppDispatch } from '../../store';
import { setAuth } from '../../store/authSlice';
import {
  UserControllerApiFp,
  Configuration,
  UserControllerApi,
} from '../../services/generated';
import { apiClient } from '../../services/apiClient';
import { env } from '../../utils/env';
import { initialSync } from '../../services/syncService';
import axios from 'axios';


// Kulcsok a perzisztens tároláshoz
const OFFLINE_AUTH_KEY = 'offlineAuthToken';
const SERVER_URL_KEY = 'savedServerUrl';

// Alapértelmezett érték
const DEFAULT_SERVER = 'https://api.myapp.com';

const config = new Configuration({ basePath: env.baseURL });
const userControllerApi = new UserControllerApi(config, undefined, apiClient);

export default function LoginScreen() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Szerver konfiguráció állapota - egyetlen szerkeszthető mező
  const [serverUrl, setServerUrl] = useState(env.baseURL || DEFAULT_SERVER);
  const [isSaved, setIsSaved] = useState(false);

  const dispatch = useAppDispatch();

  // Betöltéskor lekérjük az elmentett szerver címet
  useEffect(() => {
    const loadSavedServer = async () => {
      try {
        const savedUrl = await AsyncStorage.getItem(SERVER_URL_KEY);
        if (savedUrl) {
          setServerUrl(savedUrl);
          apiClient.defaults.baseURL = savedUrl;
        }
      } catch (e) {
        console.warn('Nem sikerült betölteni az elmentett szervert', e);
      }
    };
    loadSavedServer();
  }, []);

  // Szerver URL mentése és azonnali alkalmazása az apiClient-re
  const handleApplyServer = async () => {
    if (!serverUrl.trim()) {
      Alert.alert('Hiba', 'Kérlek adj meg egy érvényes szerver címet!');
      return;
    }

    try {
      await AsyncStorage.setItem(SERVER_URL_KEY, serverUrl);

      // Frissítjük a globális API kliens bázis URL-jét a tényleges hívásokhoz
      apiClient.defaults.baseURL = serverUrl; 
      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 2000);

      Alert.alert('Siker', 'Szerver beállítások elmentve és alkalmazva.');
    } catch (e) {
      Alert.alert('Hiba', 'Nem sikerült menteni a beállításokat.');
    }
  };

  const checkOfflineLogin = async () => {
    try {
      const storedToken = await AsyncStorage.getItem(OFFLINE_AUTH_KEY);
      if (storedToken) {
        Alert.alert(
          'Offline Belépés',
          'Sikertelen online kapcsolódás. Az utolsó sikeres munkamenet betöltve offline módban.',
          [{ text: 'OK' }],
        );
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
      Alert.alert('Hiba', 'Felhasználónév megadása kötelező!');
      return;
    }

    setSubmitting(true);
    try {
      // Biztosítjuk, hogy a bejelentkezési konfiguráció a jelenlegi URL-t használja
      const config = new Configuration({ basePath: apiClient.defaults.baseURL });
      console.log('server:', apiClient.defaults);
      const userApi = new UserControllerApi(config, undefined, apiClient);
      console.log('server:', apiClient.defaults);
      const response = await userApi.login({ username, password });
      console.log('server:', apiClient.defaults);
      const data = response.data;
      console.log('server:', apiClient.defaults);

      if (!data.token) throw new Error('A szerver nem küldött tokent.');

      await AsyncStorage.setItem(OFFLINE_AUTH_KEY, data.token);
      await AsyncStorage.setItem('authToken', data.token);

      await initialSync();
      dispatch(setAuth({ user: null, token: data.token }));

    } catch (e: any) {
// innen torol
      if (axios.isAxiosError(e)) {
    // Itt a TypeScript már tudja, hogy 'e' egy AxiosError típus
    console.log('--- AXIOS HIBA ---');
    
    if (e.response) {
      // A szerver válaszolt valamit (pl. 4xx, 5xx)
      console.log('Státusz:', e.response.status);
      console.log('Hiba adatok (JSON):', JSON.stringify(e.response.data, null, 2));
      console.log('Fejlécek:', JSON.stringify(e.response.headers));
    } else if (e.request) {
      // A kérés elment, de nem jött válasz (pl. nincs net, timeout, rossz IP)
      // Androidon ez gyakran hálózati hiba vagy 'Cleartext' tiltás miatt van
      console.log('Nincs válasz a szervertől (Network Error):', JSON.stringify(e.request));
    } else {
      // Valami hiba történt a kérés beállítása közben
      console.log('Üzenet:', e.message);
    }
    
    console.log('Próbált URL:', e.config?.url);
    console.log('Teljes Axios Config:', JSON.stringify(e.config, null, 2));
  }

//idáig torol

      const success = await checkOfflineLogin();
      if (!success) {
        Alert.alert('Bejelentkezési hiba', 'A szerver nem elérhető vagy hibás adatok.');
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
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <Text style={styles.header}>Bejelentkezés</Text>

        {/* Szerver konfiguráció kártya */}
        <View style={styles.card}>
          <Text style={styles.label}>Szerver címe</Text>
          <View style={styles.urlInputRow}>
            <TextInput
              placeholder="https://api.pelda.hu"
              autoCapitalize="none"
              keyboardType="url"
              value={serverUrl}
              onChangeText={(val) => {
                setServerUrl(val);
                setIsSaved(false);
              }}
              style={[styles.input, styles.urlInput, isSaved && styles.inputSaved]}
              editable={!submitting}
            />
            <TouchableOpacity
              style={[styles.applyButton, isSaved && styles.applyButtonSuccess]}
              onPress={handleApplyServer}
            >
              <Text style={styles.applyButtonText}>{isSaved ? '✓' : 'Mentés'}</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.helperText}>Itt adhatod meg az egyedi API végpontot a belépéshez.</Text>
        </View>

        {/* Belépési adatok kártya */}
        <View style={[styles.card, { marginTop: 16 }]}>
          <Text style={styles.label}>Felhasználói adatok</Text>
          <TextInput
            placeholder="Felhasználónév"
            autoCapitalize="none"
            placeholderTextColor="#999"
            value={username}
            onChangeText={setUsername}
            style={styles.input}
            editable={!submitting}
          />
          <TextInput
            placeholder="Jelszó"
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
            disabled={submitting}
          >
            <Text style={styles.buttonText}>
              {submitting ? 'Kapcsolódás...' : 'Bejelentkezés'}
            </Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={styles.offlineButton}
          onPress={checkOfflineLogin}
          disabled={submitting}
        >
          <Text style={styles.offlineButtonText}>Munkamenet folytatása offline</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f7fafc' },
  scrollContent: { padding: 20, justifyContent: 'center', flexGrow: 1 },
  header: { fontSize: 30, fontWeight: 'bold', marginBottom: 24, textAlign: 'center', color: '#2d3748' },
  card: { backgroundColor: '#fff', padding: 20, borderRadius: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 3 },
  label: { fontSize: 12, fontWeight: '800', color: '#718096', marginBottom: 12, textTransform: 'uppercase', letterSpacing: 0.5 },
  urlInputRow: { flexDirection: 'row', alignItems: 'center' },
  urlInput: { flex: 1, marginBottom: 0, marginRight: 8 },
  applyButton: { backgroundColor: '#4a5568', paddingHorizontal: 16, paddingVertical: 12, borderRadius: 10, justifyContent: 'center' },
  applyButtonSuccess: { backgroundColor: '#48bb78' },
  applyButtonText: { color: '#fff', fontWeight: 'bold' },
  helperText: { fontSize: 11, color: '#a0aec0', marginTop: 8 },
  input: { borderWidth: 1, borderColor: '#e2e8f0', padding: 14, borderRadius: 10, marginBottom: 12, backgroundColor: '#f8fafc', color: '#2d3748', fontSize: 16 },
  inputSaved: { borderColor: '#48bb78', backgroundColor: '#f0fff4' },
  button: { backgroundColor: '#5a67d8', padding: 16, borderRadius: 10, alignItems: 'center', marginTop: 8 },
  buttonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  offlineButton: { marginTop: 24, alignItems: 'center' },
  offlineButtonText: { color: '#a0aec0', textDecorationLine: 'underline', fontSize: 14 }
});