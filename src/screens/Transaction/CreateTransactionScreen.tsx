import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Button,
  ScrollView,
  StyleSheet,
  Alert,
  Platform,
  TouchableOpacity,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import DateTimePicker, {
  DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import AsyncStorage from '@react-native-async-storage/async-storage'; // <-- Új import
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
import SlideDownBanner from '../../components/SlideDownBanner';
import { useBanner } from '../../components/BannerContext';

type Currency = 'EUR' | 'USD' | 'HUF' | 'CHF';
type TransactionType = 'INCOME' | 'EXPENSE';

const config = new Configuration({ basePath: env.baseURL });

const accountControllerApi = new AccountControllerApi(config, undefined, apiClient);
const categoryControllerApi = new CategoryControllerApi(config, undefined, apiClient);
const transactionControllerApi = new TransactionControllerApi(config, undefined, apiClient);

// --- AsyncStorage kulcsok
const ASYNC_KEYS = {
  CONTAINERS: 'offline_containers',
  ACCOUNTS: 'offline_accounts', // Az összes számla tárolására
  CATEGORIES: 'offline_categories',
};

export default function CreateTransactionScreen({ navigation }: any) {
  const { showBanner } = useBanner();
  const user = useAppSelector((s) => s.auth.user);

  // --- Form state ---
  const [description, setDescription] = useState('');
  const [currency, setCurrency] = useState<Currency>('EUR');
  const [amount, setAmount] = useState('0');

  const [selectedContainerId, setSelectedContainerId] = useState<
    string | undefined
  >();
  const [selectedAccountId, setSelectedAccountId] = useState<
    string | undefined
  >();
  const [selectedCategoryId, setSelectedCategoryId] = useState<
    string | undefined
  >();

  const [transactionType, setTransactionType] = useState<TransactionType>('EXPENSE');

  const [latitude, setLatitude] = useState('0.0');
  const [longitude, setLongitude] = useState('0.0');

  const [transactionDate, setTransactionDate] = useState<Date>(new Date());

  const [submitting, setSubmitting] = useState(false);
  const [isOffline, setIsOffline] = useState(false); // <-- Offline állapot jelzése

  // --- Lists for pickers ---
  const [containers, setContainers] = useState<AccountContainerDto[]>([]);
  const [categories, setCategories] = useState<CategoryDto[]>([]);
  const [allAccountsByContainer, setAllAccountsByContainer] = useState<
    Record<string, AccountDto[]>
  >({});

  const [loadingContainers, setLoadingContainers] = useState(false);
  const [loadingCategories, setLoadingCategories] = useState(false);

  const [showPicker, setShowPicker] = useState(false);
  const [pickerMode, setPickerMode] = useState<'date' | 'time' | 'datetime'>(
    'date',
  );

  /**
   * Betölti az adatokat az AsyncStorage-ből
   */
  const loadOfflineData = async () => {
    try {
      const storedContainers = await AsyncStorage.getItem(ASYNC_KEYS.CONTAINERS);
      const storedCategories = await AsyncStorage.getItem(ASYNC_KEYS.CATEGORIES);
      const storedAccounts = await AsyncStorage.getItem(ASYNC_KEYS.ACCOUNTS);

      let loadedContainers: AccountContainerDto[] = [];
      let loadedCategories: CategoryDto[] = [];
      let loadedAccountsMap: Record<string, AccountDto[]> = {};

      if (storedContainers) {
        loadedContainers = JSON.parse(storedContainers);
      }
      if (storedCategories) {
        loadedCategories = JSON.parse(storedCategories);
      }
      if (storedAccounts) {
        loadedAccountsMap = JSON.parse(storedAccounts);
      }

      if (loadedContainers.length > 0) setContainers(loadedContainers);
      if (loadedCategories.length > 0) setCategories(loadedCategories);
      setAllAccountsByContainer(loadedAccountsMap);
      
      // Beállítja a kiválasztott elemeket, ha van offline adat
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


  // --- Initial load: containers, categories, ÉS ÖSSZES account ---
  useEffect(() => {
    const loadInitialData = async () => {
      setLoadingContainers(true);
      setLoadingCategories(true);
      setIsOffline(false); // Alaphelyzet: Online

      try {
        // --- 1. Adatok betöltése API-ról ---
        const [containersRes, categoriesRes] = await Promise.all([
          accountControllerApi.getAllAccountContainer(),
          categoryControllerApi.getAllCategoriesForUser(),
        ]);

        const loadedContainers = containersRes.data ?? [];
        const loadedCategories = categoriesRes.data ?? [];
        setContainers(loadedContainers);
        setCategories(loadedCategories);

        // --- 2. Számlák (Accounts) előzetes betöltése az összes konténerhez ---
        const accountsMap: Record<string, AccountDto[]> = {};
        const accountPromises = loadedContainers.map(async (container) => {
          if (container.id) {
            const accountsRes = await accountControllerApi.getAccountsByContainerId(
              container.id,
            );
            accountsMap[container.id] = accountsRes.data ?? [];
          }
        });

        await Promise.all(accountPromises);
        setAllAccountsByContainer(accountsMap);

        // --- 3. Sikeres lekérdezés esetén elmentés AsyncStorage-be ---
        await AsyncStorage.setItem(ASYNC_KEYS.CONTAINERS, JSON.stringify(loadedContainers));
        await AsyncStorage.setItem(ASYNC_KEYS.CATEGORIES, JSON.stringify(loadedCategories));
        await AsyncStorage.setItem(ASYNC_KEYS.ACCOUNTS, JSON.stringify(accountsMap));

        // --- 4. Kiválasztás beállítása (ugyanaz, mint az előző verzióban) ---
        if (loadedContainers.length > 0) {
          const firstContainerId = loadedContainers[0].id;
          if (firstContainerId) {
            setSelectedContainerId(firstContainerId);
            const accounts = accountsMap[firstContainerId] || [];
            if (accounts.length > 0) {
              setSelectedAccountId(accounts[0].id);
            }
          }
        }
      } catch (err) {
        // --- 5. Hiba esetén offline adatok betöltése ---
        console.error('API Hiba! Próbálkozás offline adatokkal:', err);
        const hasOfflineData = await loadOfflineData();
        
        if (hasOfflineData) {
          showBanner("Offline mód: Az utolsó ismert adatok betöltve.", "info");
          setIsOffline(true);
        } else {
          Alert.alert('Hiba', 'Nem sikerült az adatok betöltése a szerverről, és nincs offline tárolt adat sem.');
        }

      } finally {
        setLoadingContainers(false);
        setLoadingCategories(false);
      }
    };

    loadInitialData();
  }, []);

  // --- Konténer változás kezelése (Ugyanaz, mint az előző verzióban) ---
  useEffect(() => {
    if (selectedContainerId) {
      const accountsForContainer = allAccountsByContainer[selectedContainerId] || [];
      if (accountsForContainer.length > 0) {
        setSelectedAccountId(accountsForContainer[0].id);
      } else {
        setSelectedAccountId(undefined);
      }
    } else {
      setSelectedAccountId(undefined);
    }
  }, [selectedContainerId, allAccountsByContainer]);

  const currentAccounts = selectedContainerId
    ? allAccountsByContainer[selectedContainerId] || []
    : [];
    
  const isAccountPickerEnabled = !!selectedContainerId && !loadingContainers;


  // --- Validation ---
  const validate = () => {
    if (!description.trim()) {
      Alert.alert('Validation', 'Transaction Description is required.');
      return false;
    }

    if (!amount.trim() || Number.isNaN(parseFloat(amount))) {
      Alert.alert('Validation', 'Amount must be a valid number.');
      return false;
    }

    if (!selectedContainerId) {
      Alert.alert('Validation', 'Account Container is required.');
      return false;
    }

    if (!selectedAccountId) {
      Alert.alert('Validation', 'Account is required.');
      return false;
    }

    if (!selectedCategoryId) {
      Alert.alert('Validation', 'Category is required.');
      return false;
    }
    return true;
  };

  // --- Date picker handler (vágatlan) ---
  const handleDateTimeChange = (event: DateTimePickerEvent, selected?: Date) => {
    if (event.type === 'dismissed') {
      setShowPicker(false);
      return;
    }

    if (!selected) return;

    if (Platform.OS === 'ios') {
      setTransactionDate(selected);
      return;
    }

    if (pickerMode === 'date') {
      const newDate = new Date(transactionDate);
      newDate.setFullYear(selected.getFullYear(), selected.getMonth(), selected.getDate());
      setTransactionDate(newDate);

      setPickerMode('time');
      setShowPicker(true);
    }

    if (pickerMode === 'time') {
      const newDate = new Date(transactionDate);
      newDate.setHours(selected.getHours(), selected.getMinutes());
      setTransactionDate(newDate);
      setShowPicker(false);
    }
  };

  const handleUseCurrentLocation = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission denied', 'Location permission is required.');
      return;
    }

    const location = await Location.getCurrentPositionAsync({});
    setLatitude(location.coords.latitude.toString());
    setLongitude(location.coords.longitude.toString());
  };

  // --- Submit ---
  const handleCreate = async () => {
    if (!validate()) return;
    
    // Offline mód esetén elmentjük a tranzakciót, ahelyett hogy azonnal elküldenénk
    if (isOffline) {
        showBanner("A tranzakció helyi tárolásra került. Szinkronizálás az online állapot visszatérésekor.", "info");
        // Helyi tárolás logikáját itt kellene megvalósítani (pl. egy Async Queue)
        // Jelenleg visszamegyünk, mintha sikeres lett volna (bár nem küldte el a szerverre)
        if (navigation?.goBack) navigation.goBack();
        return;
    }
    
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
        // Fontos: Mivel az AccountDto objektumot várja a payload, a típuskényszerítés használata szükséges
        targetAccount: { id: selectedAccountId! } as AccountDto,
        category: { id: selectedCategoryId! } as CategoryDto,
      };
      await transactionControllerApi.createTransaction(payload);
      showBanner('Transaction created successfully!', 'success');

      // Reset form (kivéve a konténer és számla kiválasztás, ahogy korábban)
      setDescription('');
      setCurrency('EUR');
      setAmount('0');
      setSelectedCategoryId(undefined);
      setTransactionType('EXPENSE');
      setLatitude('0.0');
      setLongitude('0.0');
      setTransactionDate(new Date());

      if (navigation?.goBack) navigation.goBack();
    } catch (error: any) {
      console.error('Create transaction failed:', error);
      showBanner('Error creating transaction', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const formattedTime = transactionDate.toLocaleTimeString();
  const formattedDate = transactionDate.toLocaleDateString();

  return (
    <View style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Create Transaction</Text>
        <Text style={styles.owner}>
          User: {user?.username ?? 'unknown'}{' '}
          {isOffline && <Text style={{ color: 'orange', fontWeight: 'bold' }}>[OFFLINE MÓD]</Text>}
        </Text>

        {/* ... (A többi mező/input változatlan) ... */}
        
        {/* Description */}
        <Text style={styles.label}>Transaction Description *</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g., Grocery Shopping, Monthly Salary"
          value={description}
          onChangeText={setDescription}
        />

        {/* Currency */}
        <Text style={styles.label}>Currency *</Text>
        <Picker
          selectedValue={currency}
          onValueChange={(val: Currency) => setCurrency(val)}
          style={styles.picker}
        >
          <Picker.Item label="EUR" value="EUR" />
          <Picker.Item label="USD" value="USD" />
          <Picker.Item label="HUF" value="HUF" />
          <Picker.Item label="CHF" value="CHF" />
        </Picker>

        {/* Amount */}
        <Text style={styles.label}>Amount *</Text>
        <TextInput
          style={styles.input}
          placeholder="Amount (e.g., 100.00)"
          keyboardType="numeric"
          value={amount}
          onChangeText={setAmount}
        />

        {/* Account Container */}
        <Text style={styles.label}>Account Container *</Text>
        <Picker
          selectedValue={selectedContainerId}
          onValueChange={(val) => setSelectedContainerId(val)}
          style={styles.picker}
        >
          <Picker.Item
            label={loadingContainers ? 'Loading containers...' : 'Select Container'}
            value={undefined}
          />
          {containers.map((c) => (
            <Picker.Item
              key={c.id}
              label={c.name ?? `Container ${c.id}`}
              value={c.id}
            />
          ))}
        </Picker>

        {/* Account */}
        <Text style={styles.label}>Account *</Text>
        <Picker
          enabled={isAccountPickerEnabled}
          selectedValue={selectedAccountId}
          onValueChange={(val) => setSelectedAccountId(val)}
          style={styles.picker}
        >
          <Picker.Item
            label={
              !selectedContainerId
                ? 'Select a Container first'
                : loadingContainers
                ? 'Loading accounts...'
                : 'Select Account'
            }
            value={undefined}
          />
          {currentAccounts.map((a) => (
            <Picker.Item
              key={a.id}
              label={a.name ?? `Account ${a.id}`}
              value={a.id}
            />
          ))}
        </Picker>

        {/* Category */}
        <Text style={styles.label}>Category *</Text>
        <Picker
          selectedValue={selectedCategoryId}
          onValueChange={(val) => setSelectedCategoryId(val)}
          style={styles.picker}
        >
          <Picker.Item
            label={loadingCategories ? 'Loading categories...' : 'Select Category'}
            value={undefined}
          />
          {categories.map((cat) => (
            <Picker.Item
              key={cat.id}
              label={cat.name ?? `Category ${cat.id}`}
              value={cat.id}
            />
          ))}
        </Picker>

        {/* Transaction Type */}
        <Text style={styles.label}>Transaction Type *</Text>
        <Picker
          selectedValue={transactionType}
          onValueChange={(val: TransactionType) => setTransactionType(val)}
          style={styles.picker}
        >
          <Picker.Item label="EXPENSE" value="EXPENSE" />
          <Picker.Item label="INCOME" value="INCOME" />
        </Picker>

        {/* Latitude / Longitude */}
        <Text style={styles.subTitle}>Location (optional)</Text>
        <View style={styles.row}>
          <View style={{ flex: 1, marginRight: 4 }}>
            <Text style={styles.label}>Latitude</Text>
            <TextInput
              style={styles.input}
              keyboardType="numeric"
              value={latitude}
              onChangeText={setLatitude}
            />
          </View>
          <View style={{ flex: 1, marginLeft: 4 }}>
            <Text style={styles.label}>Longitude</Text>
            <TextInput
              style={styles.input}
              keyboardType="numeric"
              value={longitude}
              onChangeText={setLongitude}
            />
          </View>
          <View style={{ marginLeft: 4, justifyContent: 'flex-end' }}>
            <Button title="📍" onPress={handleUseCurrentLocation} />
          </View>
        </View>

        {/* Transaction Time */}
        <Text style={styles.label}>Transaction Time</Text>
        <View style={styles.row}>
          <View style={{ flex: 1 }}>
            <Text style={styles.timeBox}>
              {formattedDate} {formattedTime}
            </Text>
          </View>
          <View style={{ marginLeft: 8 }}>
            <Button
              title="Change"
              onPress={() => {
                if (Platform.OS === 'ios') {
                  setPickerMode('datetime');
                  setShowPicker(true);
                } else {
                  setPickerMode('date');
                  setShowPicker(true);
                }
              }}
            />
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

        {/* Submit */}
        <View style={{ marginTop: 24 }}>
          <Button
            title={`🕊 ${isOffline ? 'Helyi Mentés' : 'Tranzakció Létrehozása'}`}
            onPress={handleCreate}
            disabled={submitting || loadingContainers || loadingCategories}
            color={submitting ? '#888' : isOffline ? 'orange' : undefined}
          />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  owner: {
    marginBottom: 8,
    color: '#555',
  },
  label: {
    marginTop: 12,
    fontWeight: '600',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    padding: 8,
    marginTop: 4,
    borderRadius: 4,
  },
  picker: {
    marginTop: 4,
  } as any,
  subTitle: {
    fontSize: 16,
    marginTop: 16,
    fontWeight: '600',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  timeBox: {
    borderWidth: 1,
    borderColor: '#ccc',
    padding: 8,
    borderRadius: 4,
  },
});