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
  AccountTransactionDto
} from '../../services/generated';
import { env } from '../../utils/env';
import * as Location from 'expo-location';
import SlideDownBanner from '../../components/SlideDownBanner';

type Currency = 'EUR' | 'USD' | 'HUF' | 'CHF';
type TransactionType = 'INCOME' | 'EXPENSE';

const config = new Configuration({ basePath: env.baseURL });

const accountControllerApi = new AccountControllerApi(config, undefined, apiClient);
const categoryControllerApi = new CategoryControllerApi(config, undefined, apiClient);
const transactionControllerApi = new TransactionControllerApi(config, undefined, apiClient);

export default function CreateTransactionScreen({ navigation, route }: any) {
  const { showBanner } = route.params;
  const user = useAppSelector((s) => s.auth.user);

  // --- Form state ---
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

  // --- Lists for pickers ---
  const [containers, setContainers] = useState<AccountContainerDto[]>([]);
  const [accounts, setAccounts] = useState<AccountDto[]>([]);
  const [categories, setCategories] = useState<CategoryDto[]>([]);

  const [loadingContainers, setLoadingContainers] = useState(false);
  const [loadingAccounts, setLoadingAccounts] = useState(false);
  const [loadingCategories, setLoadingCategories] = useState(false);

  const [showPicker, setShowPicker] = useState(false);
  const [pickerMode, setPickerMode] = useState<'date' | 'time' | 'datetime'>('date');


  // --- Initial load: containers + categories ---
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        setLoadingContainers(true);
        setLoadingCategories(true);

        const [containersRes, categoriesRes] = await Promise.all([
          accountControllerApi.getAllAccountContainer(),
          categoryControllerApi.getAllCategoriesForUser(),
        ]);

        setContainers(containersRes.data ?? []);
        setCategories(categoriesRes.data ?? []);
      } catch (err) {
        console.error('Failed to load containers/categories', err);
        Alert.alert('Error', 'Failed to load containers or categories.');
      } finally {
        setLoadingContainers(false);
        setLoadingCategories(false);
      }
    };

    loadInitialData();
  }, []);

  // --- When container changes → load accounts ---
  useEffect(() => {
    const loadAccounts = async () => {
      if (!selectedContainerId) {
        setAccounts([]);
        setSelectedAccountId(undefined);
        return;
      }

      try {
        setLoadingAccounts(true);
        const res = await accountControllerApi.getAccountsByContainerId(selectedContainerId);
        setAccounts(res.data ?? []);
        setSelectedAccountId(undefined);
      } catch (err) {
        console.error('Failed to load accounts', err);
        Alert.alert('Error', 'Failed to load accounts for the selected container.');
      } finally {
        setLoadingAccounts(false);
      }
    };

    loadAccounts();
  }, [selectedContainerId]);

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

  // --- Date picker handler ---
  const handleDateTimeChange = (event: DateTimePickerEvent, selected?: Date) => {
    if (event.type === 'dismissed') {
      // Close dialog on dismiss
      setShowPicker(false);
      return;
    }

    if (!selected) return;

    if (Platform.OS === 'ios') {
      // iOS: native datetime picker gives full date + time
      setTransactionDate(selected);
      return;
    }

    // ANDROID: step 1 – date selected → now show time picker
    if (pickerMode === 'date') {
      const newDate = new Date(transactionDate);
      newDate.setFullYear(selected.getFullYear(), selected.getMonth(), selected.getDate());
      setTransactionDate(newDate);

      // Move to time picker
      setPickerMode('time');
      setShowPicker(true);
    }

    // ANDROID: step 2 – time selected → merge into date
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
      await transactionControllerApi.createTransaction(payload);
      showBanner("Transaction created successfully!");


      // Reset form
      setDescription('');
      setCurrency('EUR');
      setAmount('0');
      setSelectedContainerId(undefined);
      setSelectedAccountId(undefined);
      setSelectedCategoryId(undefined);
      setTransactionType('EXPENSE');
      setLatitude('0.0');
      setLongitude('0.0');
      setTransactionDate(new Date());
      // reset form...
      if (navigation?.goBack) navigation.goBack();
    } catch (error: any) {
      console.error('Create transaction failed:', error);
      showBanner("Error creating transaction");
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
        <Text style={styles.owner}>User: {user?.username ?? 'unknown'}</Text>

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
          enabled={!!selectedContainerId}
          selectedValue={selectedAccountId}
          onValueChange={(val) => setSelectedAccountId(val)}
          style={styles.picker}
        >
          <Picker.Item
            label={
              !selectedContainerId
                ? 'Select a Container first'
                : loadingAccounts
                  ? 'Loading accounts...'
                  : 'Select Account'
            }
            value={undefined}
          />
          {accounts.map((a) => (
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
            title="🕊 Create Transaction"
            onPress={handleCreate}
            disabled={submitting}
            color={submitting ? '#888' : undefined}
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
