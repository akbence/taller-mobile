import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { listItems, Item } from '../../services/items';

export default function ItemsListScreen({ navigation }: any) {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    listItems().then(setItems).finally(() => setLoading(false));
  }, []);

  if (loading) return <ActivityIndicator style={{ marginTop: 20 }} />;

  return (
    <View style={{ padding: 16 }}>
      <Text style={{ fontSize: 24, marginBottom: 12 }}>Items</Text>
      <FlatList
        data={items}
        keyExtractor={(i) => i.id}
        renderItem={({ item }) => (
          <TouchableOpacity
            onPress={() => navigation.navigate('ItemDetail', { id: item.id })}
            style={{ paddingVertical: 12, borderBottomWidth: 1 }}
          >
            <Text style={{ fontWeight: '600' }}>{item.title}</Text>
            {item.description ? <Text>{item.description}</Text> : null}
          </TouchableOpacity>
        )}
      />
    </View>
  );
}
