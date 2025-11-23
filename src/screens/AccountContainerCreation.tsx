import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Button,
  ScrollView,
  StyleSheet,
  Alert,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { apiClient } from '../services/apiClient';
import { useAppSelector } from '../store';
import { AccountControllerApi, Configuration } from '../services/generated'
import { env } from '../utils/env';
import AsyncStorage from '@react-native-async-storage/async-storage';

type AccountType = 'CHECKING' | 'SAVINGS' | 'CASH';
type Currency = 'EUR' | 'USD' | 'HUF' | 'CHF';


type AccountInput = {
  name: string;
  accountType: AccountType;
  currency: Currency;
  balance: string;
};



export default function CreateAccountContainerScreen({ navigation }: any) {
  const [containerName, setContainerName] = useState('');
  const [accounts, setAccounts] = useState<AccountInput[]>([
    { name: '', accountType: 'CHECKING', currency: 'EUR', balance: '0' },
  ]);
  const [submitting, setSubmitting] = useState(false);

  const user = useAppSelector((s) => s.auth.user);

  const handleAddAccount = () => {
    setAccounts((prev) => [
      ...prev,
      { name: '', accountType: 'CHECKING', currency: 'EUR', balance: '0' },
    ]);
  };

  const handleRemoveAccount = (index: number) => {
    setAccounts((prev) => prev.filter((_, i) => i !== index));
  };

  const handleAccountChange = <K extends keyof AccountInput>(
    index: number,
    field: K,
    value: AccountInput[K]
  ) => {
    setAccounts((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const validate = () => {
    if (!containerName.trim()) {
      Alert.alert('Validation', 'Account Container Name is required.');
      return false;
    }
    for (let i = 0; i < accounts.length; i++) {
      const a = accounts[i];
      if (!a.name.trim()) {
        Alert.alert('Validation', `Account ${i + 1}: Name is required.`);
        return false;
      }
      if (Number.isNaN(parseFloat(a.balance))) {
        Alert.alert('Validation', `Account ${i + 1}: Balance must be a number.`);
        return false;
      }
    }
    return true;
  };

  const accountControllerApi = new AccountControllerApi(
    new Configuration({
      basePath: env.baseURL,
    }),
    undefined,
    apiClient
  );


  const handleCreate = async () => {
    if (!validate()) return;
    setSubmitting(true);
    try {

      //BEGIN
      const createContainerResponse = await accountControllerApi.createAccountContainer({
        name: containerName.trim(),
        subaccounts: accounts.map(acc => ({
          name: acc.name.trim(),
          accountType: acc.accountType,
          currency: acc.currency,
          balance: parseFloat(acc.balance),
        })),
      })

      // //END
      // // 1) Create container
      // const containerRes = await apiClient.post('/api/v1/account-container', {
      //   name: containerName.trim(),
      // });

      // const containerId: string = containerRes.data.id;
      // if (!containerId) {
      //   throw new Error('Container creation did not return an id.');
      // }

      // // 2) Create accounts (multiple)
      // for (const acc of accounts) {
      //   await apiClient.post(`/api/v1/account-container/${containerId}/accounts`, {
      //     name: acc.name.trim(),
      //     accountType: acc.accountType,
      //     currency: acc.currency,
      //     balance: parseFloat(acc.balance),
      //     accountContainer: containerId,
      //   });
      // }

      Alert.alert('Success', 'Container and accounts created.');
      // Reset form
      setContainerName('');
      setAccounts([{ name: '', accountType: 'CHECKING', currency: 'EUR', balance: '0' }]);
      // Navigálás vissza (opcionális)
      if (navigation?.goBack) navigation.goBack();
    } catch (error: any) {
      console.error('Creation failed:', error);
      Alert.alert('Error', error?.message ?? 'Something went wrong.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Create Account Container</Text>

      <Text style={styles.label}>Account Container Name *</Text>
      <TextInput
        style={styles.input}
        placeholder="e.g., Personal Finances"
        value={containerName}
        onChangeText={setContainerName}
      />

      <Text style={styles.owner}>Owner: {user?.username ?? 'unknown'}</Text>

      <Text style={styles.subTitle}>Accounts</Text>
      {accounts.map((account, index) => (
        <View key={index} style={styles.accountBlock}>
          <View style={styles.rowBetween}>
            <Text style={styles.accountTitle}>Account {index + 1}</Text>
            {accounts.length > 1 && (
              <Button title="Remove" color="#b00020" onPress={() => handleRemoveAccount(index)} />
            )}
          </View>

          <Text style={styles.label}>Name *</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g., Checking"
            value={account.name}
            onChangeText={(text) => handleAccountChange(index, 'name', text)}
          />

          <Text style={styles.label}>Account Type *</Text>
          <Picker
            selectedValue={account.accountType}
            onValueChange={(value: AccountType) =>
              handleAccountChange(index, 'accountType', value)
            }
            style={styles.picker}
          >
            <Picker.Item label="CHECKING" value="CHECKING" />
            <Picker.Item label="SAVINGS" value="SAVINGS" />
            <Picker.Item label="CASH" value="CASH" />
          </Picker>

          <Text style={styles.label}>Currency *</Text>
          <Picker
            selectedValue={account.currency}
            onValueChange={(value: Currency) =>
              handleAccountChange(index, 'currency', value)
            }
            style={styles.picker}
          >
            <Picker.Item label="EUR" value="EUR" />
            <Picker.Item label="USD" value="USD" />
            <Picker.Item label="HUF" value="HUF" />
            <Picker.Item label="CHF" value="CHF" />
          </Picker>

          <Text style={styles.label}>Initial Balance</Text>
          <TextInput
            style={styles.input}
            placeholder="0"
            keyboardType="numeric"
            value={account.balance}
            onChangeText={(text) => handleAccountChange(index, 'balance', text)}
          />
        </View>
      ))}

      <View style={{ marginTop: 8 }}>
        <Button title="+ Add Account" onPress={handleAddAccount} />
      </View>

      <View style={{ marginTop: 16 }}>
        <Button
          title="🗂 Create Container & Accounts"
          onPress={handleCreate}
          disabled={submitting}
          color={submitting ? '#888' : undefined}
        />
      </View>
    </ScrollView>
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
  subTitle: {
    fontSize: 18,
    marginTop: 16,
    marginBottom: 8,
  },
  owner: {
    marginTop: 8,
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
    borderWidth: 1,
    borderColor: '#ccc',
    marginTop: 4,
  } as any, // Picker nem támogatja a border alapból RN-ben, style kompat miatt
  accountBlock: {
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  accountTitle: {
    fontWeight: '700',
    fontSize: 16,
  },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
});
