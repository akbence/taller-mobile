import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  StyleSheet,
  Alert,
  Platform,
  TouchableOpacity,
  SafeAreaView,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import DateTimePicker, {
  DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAppSelector } from '../../store';
import { apiClient } from '../../services/apiClient';
import {
  AccountControllerApi,
  CategoryControllerApi,
  TransactionControllerApi,
  Configuration,
  type AccountContainerDto,
  type AccountDto,
  type CategoryDto,
  AccountTransactionDto,
} from '../../services/generated';
import { env } from '../../utils/env';
import * as Location from 'expo-location';
import { useBanner } from '../../components/BannerContext';
import { OFFLINE_STORAGE_KEYS } from '../../utils/const';

type Currency = 'EUR' | 'USD' | 'HUF' | 'CHF';
type TransactionType = 'INCOME' | 'EXPENSE';

const config = new Configuration({ basePath: env.baseURL });

const accountControllerApi = new AccountControllerApi(config, undefined, apiClient);
const categoryControllerApi = new CategoryControllerApi(config, undefined, apiClient);
const transactionControllerApi = new TransactionControllerApi(config, undefined, apiClient);

export default function CreateTransactionScreen({ navigation }: any) {
  const { showBanner } = useBanner();
  const user = useAppSelector((s) => s.auth.user);

  const [description, setDescription] = useState('');
  const [currency, setCurrency] = useState<Currency>('EUR');
  const [amount, setAmount] = useState('0');

  const [selectedContainerId, setSelectedContainerId] = useState<string | undefined>();
  const [selectedAccountId, setSelectedAccountId] = useState<string | undefined>();
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | undefined>();

  const [transactionType, setTransactionType] = useState<TransactionType>('EXPENSE');

  const [latitude, setLatitude] = useState('0.0');
  const [longitude, setLongitude] = useState('0.0');

  const [transactionDate, setTransactionDate] = useState<Date>(new Date());

  const [submitting, setSubmitting] = useState(false);
  const [isOffline, setIsOffline] = useState(false);

  const [containers, setContainers] = useState<AccountContainerDto[]>([]);
  const [categories, setCategories] = useState<CategoryDto[]>([]);
  const [allAccountsByContainer, setAllAccountsByContainer] = useState<Record<string, AccountDto[]>>({});

  const [loadingContainers, setLoadingContainers] = useState(false);
  const [loadingCategories, setLoadingCategories] = useState(false);

  const [showPicker, setShowPicker] = useState(false);
  const [pickerMode, setPickerMode] = useState<'date' | 'time' | 'datetime'>('date');

  const loadOfflineData = async () => {
    try {
      const storedContainers = await AsyncStorage.getItem(OFFLINE_STORAGE_KEYS.CONTAINERS);
      const storedCategories = await AsyncStorage.getItem(OFFLINE_STORAGE_KEYS.CATEGORIES);
      const storedAccounts = await AsyncStorage.getItem(OFFLINE_STORAGE_KEYS.ACCOUNTS);

      let loadedContainers: AccountContainerDto[] = [];
      let loadedCategories: CategoryDto[] = [];
      let loadedAccountsMap: Record<string, AccountDto[]> = {};

      if (storedContainers) loadedContainers = JSON.parse(storedContainers);
      if (storedCategories) loadedCategories = JSON.parse(storedCategories);
      if (storedAccounts) loadedAccountsMap = JSON.parse(storedAccounts);

      if (loadedContainers.length > 0) setContainers(loadedContainers);
      if (loadedCategories.length > 0) setCategories(loadedCategories);
      setAllAccountsByContainer(loadedAccountsMap);

      if (loadedContainers.length > 0 && !selectedContainerId) {
        const firstContainerId = loadedContainers[0].id;
        setSelectedContainerId(firstContainerId);
        if (firstContainerId && loadedAccountsMap[firstContainerId]?.length > 0) {
          setSelectedAccountId(loadedAccountsMap[firstContainerId][0].id);
        }
      }
      return loadedContainers.length > 0 || loadedCategories.length > 0;
    } catch (e) {
      console.warn('Hiba az offline adatok betöltésekor:', e);
      return false;
    }
  };

  useEffect(() => {
    const loadInitialData = async () => {
      setLoadingContainers(true);
      setLoadingCategories(true);
      setIsOffline(false);

      try {
        const [containersRes, categoriesRes] = await Promise.all([
          accountControllerApi.getAllAccountContainer(),
          categoryControllerApi.getAllCategoriesForUser(),
        ]);

        const loadedContainers = containersRes.data ?? [];
        const loadedCategories = categoriesRes.data ?? [];
        setContainers(loadedContainers);
        setCategories(loadedCategories);

        const accountsMap: Record<string, AccountDto[]> = {};
        const accountPromises = loadedContainers.map(async (container) => {
          if (container.id) {
            const accountsRes = await accountControllerApi.getAccountsByContainerId(container.id);
            accountsMap[container.id] = accountsRes.data ?? [];
          }
        });

        await Promise.all(accountPromises);
        setAllAccountsByContainer(accountsMap);

        await AsyncStorage.setItem(OFFLINE_STORAGE_KEYS.CONTAINERS, JSON.stringify(loadedContainers));
        await AsyncStorage.setItem(OFFLINE_STORAGE_KEYS.CATEGORIES, JSON.stringify(loadedCategories));
        await AsyncStorage.setItem(OFFLINE_STORAGE_KEYS.ACCOUNTS, JSON.stringify(accountsMap));

        if (loadedContainers.length > 0) {
          const firstContainerId = loadedContainers[0].id;
          if (firstContainerId) {
            setSelectedContainerId(firstContainerId);
            const accounts = accountsMap[firstContainerId] || [];
            if (accounts.length > 0) setSelectedAccountId(accounts[0].id);
          }
        }
      } catch (err) {
        const hasOfflineData = await loadOfflineData();
        if (hasOfflineData) {
          showBanner("Offline mód: Az utolsó ismert adatok betöltve.", "info");
          setIsOffline(true);
        } else {
          Alert.alert('Hiba', 'Nem sikerült az adatok betöltése.');
        }
      } finally {
        setLoadingContainers(false);
        setLoadingCategories(false);
      }
    };
    loadInitialData();
  }, []);

  useEffect(() => {
    if (selectedContainerId) {
      const accountsForContainer = allAccountsByContainer[selectedContainerId] || [];
      setSelectedAccountId(accountsForContainer.length > 0 ? accountsForContainer[0].id : undefined);
    } else {
      setSelectedAccountId(undefined);
    }
  }, [selectedContainerId, allAccountsByContainer]);

  const currentAccounts = selectedContainerId ? allAccountsByContainer[selectedContainerId] || [] : [];
  const isAccountPickerEnabled = !!selectedContainerId && !loadingContainers;

  const validate = () => {
    if (!description.trim()) { Alert.alert('Hiba', 'A leírás kötelező.'); return false; }
    if (!amount.trim() || Number.isNaN(parseFloat(amount))) { Alert.alert('Hiba', 'Érvénytelen összeg.'); return false; }
    if (!selectedContainerId) { Alert.alert('Hiba', 'Konténer kiválasztása kötelező.'); return false; }
    if (!selectedAccountId) { Alert.alert('Hiba', 'Számla kiválasztása kötelező.'); return false; }
    if (!selectedCategoryId) { Alert.alert('Hiba', 'Kategória kiválasztása kötelező.'); return false; }
    return true;
  };

  const handleDateTimeChange = (event: DateTimePickerEvent, selected?: Date) => {
    if (event.type === 'dismissed') { setShowPicker(false); return; }
    if (!selected) return;
    if (Platform.OS === 'ios') { setTransactionDate(selected); return; }

    if (pickerMode === 'date') {
      const newDate = new Date(transactionDate);
      newDate.setFullYear(selected.getFullYear(), selected.getMonth(), selected.getDate());
      setTransactionDate(newDate);
      setPickerMode('time');
      setShowPicker(true);
    } else {
      const newDate = new Date(transactionDate);
      newDate.setHours(selected.getHours(), selected.getMinutes());
      setTransactionDate(newDate);
      setShowPicker(false);
    }
  };

  const handleUseCurrentLocation = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') { Alert.alert('Hiba', 'Helyhozzáférés megtagadva.'); return; }
    const location = await Location.getCurrentPositionAsync({});
    setLatitude(location.coords.latitude.toString());
    setLongitude(location.coords.longitude.toString());
  };

  const handleCreate = async () => {
    if (!validate()) return;
    setSubmitting(true);
    try {
      const payload: AccountTransactionDto = {
        description: description.trim(),
        currency,
        amount: parseFloat(amount),
        transactionType,
        latitude: parseFloat(latitude) || 0,
        longitude: parseFloat(longitude) || 0,
        transactionTime: transactionDate.toISOString(),
        targetAccount: { id: selectedAccountId! } as AccountDto,
        category: { id: selectedCategoryId! } as CategoryDto,
      };

      if (isOffline) {
        const storedQueue = await AsyncStorage.getItem(OFFLINE_STORAGE_KEYS.PENDING_TRANSACTIONS);
        const queue: AccountTransactionDto[] = storedQueue ? JSON.parse(storedQueue) : [];
        queue.push(payload);
        await AsyncStorage.setItem(OFFLINE_STORAGE_KEYS.PENDING_TRANSACTIONS, JSON.stringify(queue));
        showBanner("Helyi mentés sikeres (" + queue.length + ")", "info");
        if (navigation?.goBack) navigation.goBack();
        return;
      }

      await transactionControllerApi.createTransaction(payload);
      showBanner('Tranzakció sikeresen létrehozva!', 'success');
      if (navigation?.goBack) navigation.goBack();
    } catch (error: any) {
      showBanner('Hiba a mentés során', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <Text style={styles.header}>Új tranzakció</Text>
        <Text style={styles.subHeader}>
          Felhasználó: {user?.username ?? 'ismeretlen'}{' '}
          {isOffline && <Text style={{ color: '#ed8936', fontWeight: 'bold' }}>[OFFLINE]</Text>}
        </Text>

        <View style={styles.card}>
          <Text style={styles.label}>Alapadatok</Text>

          <TextInput
            style={styles.input}
            placeholder="Leírás (pl. Bevásárlás)"
            placeholderTextColor="#999"
            value={description}
            onChangeText={setDescription}
          />

          <View style={styles.row}>
            <View style={{ flex: 1, marginRight: 8 }}>
               <TextInput
                style={styles.input}
                placeholder="Összeg"
                placeholderTextColor="#999"
                keyboardType="numeric"
                value={amount}
                onChangeText={setAmount}
              />
            </View>
            <View style={[styles.pickerContainer, { flex: 0.8 }]}>
              <Picker
                selectedValue={currency}
                onValueChange={(val: Currency) => setCurrency(val)}
                mode="dropdown"
              >
                <Picker.Item label="EUR" value="EUR" />
                <Picker.Item label="USD" value="USD" />
                <Picker.Item label="HUF" value="HUF" />
                <Picker.Item label="CHF" value="CHF" />
              </Picker>
            </View>
          </View>

          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={transactionType}
              onValueChange={(val: TransactionType) => setTransactionType(val)}
            >
              <Picker.Item label="Kiadás (EXPENSE)" value="EXPENSE" />
              <Picker.Item label="Bevétel (INCOME)" value="INCOME" />
            </Picker>
          </View>
        </View>

        <View style={[styles.card, { marginTop: 16 }]}>
          <Text style={styles.label}>Besorolás</Text>

          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={selectedContainerId}
              onValueChange={(val) => setSelectedContainerId(val)}
            >
              <Picker.Item label={loadingContainers ? 'Konténerek betöltése...' : 'Válassz konténert'} value={undefined} />
              {containers.map((c) => <Picker.Item key={c.id} label={c.name ?? `Konténer ${c.id}`} value={c.id} />)}
            </Picker>
          </View>

          <View style={[styles.pickerContainer, { marginTop: 12 }]}>
            <Picker
              enabled={isAccountPickerEnabled}
              selectedValue={selectedAccountId}
              onValueChange={(val) => setSelectedAccountId(val)}
            >
              <Picker.Item label={!selectedContainerId ? 'Válassz előbb konténert' : 'Válassz számlát'} value={undefined} />
              {currentAccounts.map((a) => <Picker.Item key={a.id} label={a.name ?? `Számla ${a.id}`} value={a.id} />)}
            </Picker>
          </View>

          <View style={[styles.pickerContainer, { marginTop: 12 }]}>
            <Picker
              selectedValue={selectedCategoryId}
              onValueChange={(val) => setSelectedCategoryId(val)}
            >
              <Picker.Item label={loadingCategories ? 'Kategóriák betöltése...' : 'Válassz kategóriát'} value={undefined} />
              {categories.map((cat) => <Picker.Item key={cat.id} label={cat.name ?? `Kategória ${cat.id}`} value={cat.id} />)}
            </Picker>
          </View>
        </View>

        <View style={[styles.card, { marginTop: 16 }]}>
          <Text style={styles.label}>Időpont és Helyszín</Text>

          <TouchableOpacity
            style={styles.dateTimeButton}
            onPress={() => { setPickerMode(Platform.OS === 'ios' ? 'datetime' : 'date'); setShowPicker(true); }}
          >
            <Text style={styles.dateTimeText}>📅 {transactionDate.toLocaleDateString()} {transactionDate.toLocaleTimeString()}</Text>
          </TouchableOpacity>

          <View style={[styles.row, { marginTop: 12 }]}>
            <TextInput
              style={[styles.input, { flex: 1, marginBottom: 0, marginRight: 8 }]}
              placeholder="Lat"
              keyboardType="numeric"
              value={latitude}
              onChangeText={setLatitude}
            />
            <TextInput
              style={[styles.input, { flex: 1, marginBottom: 0, marginRight: 8 }]}
              placeholder="Long"
              keyboardType="numeric"
              value={longitude}
              onChangeText={setLongitude}
            />
            <TouchableOpacity style={styles.locationButton} onPress={handleUseCurrentLocation}>
              <Text style={{ fontSize: 20 }}>📍</Text>
            </TouchableOpacity>
          </View>
        </View>

        {showPicker && (
          <DateTimePicker
            value={transactionDate}
            mode={pickerMode}
            display={Platform.OS === 'ios' ? 'inline' : 'default'}
            onChange={handleDateTimeChange}
          />
        )}

        <TouchableOpacity
          style={[styles.submitButton, isOffline && styles.offlineButton]}
          onPress={handleCreate}
          disabled={submitting || loadingContainers || loadingCategories}
        >
          <Text style={styles.submitButtonText}>
            {submitting ? 'Mentés...' : isOffline ? 'Helyi mentés' : 'Tranzakció létrehozása'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Text style={styles.backButtonText}>Mégsem</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f7fafc' },
  scrollContent: { padding: 20 },
  header: { fontSize: 28, fontWeight: 'bold', color: '#2d3748', textAlign: 'center', marginTop: 10 },
  subHeader: { fontSize: 14, color: '#718096', textAlign: 'center', marginBottom: 20 },
  card: { backgroundColor: '#fff', padding: 16, borderRadius: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 3 },
  label: { fontSize: 12, fontWeight: '800', color: '#718096', marginBottom: 12, textTransform: 'uppercase', letterSpacing: 0.5 },
  input: { borderWidth: 1, borderColor: '#e2e8f0', padding: 12, borderRadius: 10, marginBottom: 12, backgroundColor: '#f8fafc', color: '#2d3748', fontSize: 16 },
  pickerContainer: { borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 10, backgroundColor: '#f8fafc', overflow: 'hidden', justifyContent: 'center' },
  row: { flexDirection: 'row', alignItems: 'center' },
  dateTimeButton: { backgroundColor: '#edf2f7', padding: 14, borderRadius: 10, alignItems: 'center', borderWidth: 1, borderColor: '#e2e8f0' },
  dateTimeText: { color: '#2d3748', fontWeight: '600' },
  locationButton: { backgroundColor: '#edf2f7', padding: 10, borderRadius: 10, borderWidth: 1, borderColor: '#e2e8f0' },
  submitButton: { backgroundColor: '#5a67d8', padding: 16, borderRadius: 10, alignItems: 'center', marginTop: 24 },
  offlineButton: { backgroundColor: '#ed8936' },
  submitButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  backButton: { marginTop: 16, padding: 12, alignItems: 'center' },
  backButtonText: { color: '#a0aec0', textDecorationLine: 'underline' }
});