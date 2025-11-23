import React, { useState } from 'react';
import { View, TextInput, Button } from 'react-native';
import { apiClient } from '../services/apiClient';

export default function AccountScreen() {
  const [name, setName] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [accountType, setAccountType] = useState('CHECKING');
  const [containerId, setContainerId] = useState('');

  const createAccount = async () => {
    await apiClient.post(`/api/v1/account-container/${containerId}/accounts`, {
      name,
      currency,
      accountType,
      balance: 0,
      accountContainer: containerId,
    });
    alert('Account created!');
  };

  return (
    <View style={{ padding: 16 }}>
      <TextInput placeholder="Account name" value={name} onChangeText={setName} />
      <TextInput placeholder="Currency (USD/EUR/HUF)" value={currency} onChangeText={setCurrency} />
      <TextInput placeholder="Type (CHECKING/SAVINGS/CASH)" value={accountType} onChangeText={setAccountType} />
      <TextInput placeholder="Container ID" value={containerId} onChangeText={setContainerId} />
      <Button title="Create Account" onPress={createAccount} />
    </View>
  );
}
