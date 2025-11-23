import React, { useState } from 'react';
import { View, TextInput, Button } from 'react-native';
import { apiClient } from '../services/apiClient';

export default function CategoryScreen() {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  const createCategory = async () => {
    await apiClient.post('/api/v1/category', { name, description });
    alert('Category created!');
  };

  return (
    <View style={{ padding: 16 }}>
      <TextInput placeholder="Category name" value={name} onChangeText={setName} />
      <TextInput placeholder="Description" value={description} onChangeText={setDescription} />
      <Button title="Create Category" onPress={createCategory} />
    </View>
  );
}
