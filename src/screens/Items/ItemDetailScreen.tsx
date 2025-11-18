import React, { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { getItem, Item } from '../../services/items';

export default function ItemDetailScreen({ route }: any) {
  const { id } = route.params;
  const [item, setItem] = useState<Item | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getItem(id).then(setItem).finally(() => setLoading(false));
  }, [id]);

  if (loading) return <ActivityIndicator style={{ marginTop: 20 }} />;
  if (!item) return <Text style={{ padding: 16 }}>Not found</Text>;

  return (
    <View style={{ padding: 16 }}>
      <Text style={{ fontSize: 24, fontWeight: '700' }}>{item.title}</Text>
      {item.description ? <Text style={{ marginTop: 8 }}>{item.description}</Text> : null}
      {item.createdAt ? <Text style={{ marginTop: 8, color: '#666' }}>Created: {item.createdAt}</Text> : null}
    </View>
  );
}
