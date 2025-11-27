import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, ActivityIndicator, StyleSheet } from 'react-native';
import {apiClient} from '../../services/apiClient';
import {TransactionControllerApi,
    Configuration,
    AccountTransactionDto
} from '../../services/generated/';
import { env } from '../../utils/env';

type Transaction = {
  id: string;
  description: string;
  amount: number;
  currency: string;
  category: string;
  date: string; // ISO string
};

const config = new Configuration({ basePath: env.baseURL });
const transactionControllerApi = new TransactionControllerApi(config, undefined, apiClient);

export default function ViewTransactionScreen() {
  const [transactions, setTransactions] = useState<AccountTransactionDto[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTransactions = async () => {
      try {
        const res = await transactionControllerApi.getTransactions();
        res.data && setTransactions(res.data);
      } catch (err) {
        console.error('Failed to fetch transactions:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchTransactions();
  }, []);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
        <Text>Loading transactions...</Text>
      </View>
    );
  }

  if (transactions.length === 0) {
    return (
      <View style={styles.center}>
        <Text>No transactions found.</Text>
      </View>
    );
  }

  return (
    <FlatList
      data={transactions}
      keyExtractor={(item) => item.id ?? Math.random().toString()}
      contentContainerStyle={styles.list}
      renderItem={({ item }) => (
        <View style={styles.card}>
          <Text style={styles.amount}>
            {item.amount} {item.currency}
          </Text>
          <Text style={styles.description}>{item.description}</Text>
            <Text style={styles.meta}>
            {item.category?.name} • {item.transactionTime ? new Date(item.transactionTime).toLocaleDateString() : ''}
            </Text>
        </View>
      )}
    />
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  list: {
    padding: 16,
  },
  card: {
    backgroundColor: '#fff',
    padding: 12,
    marginBottom: 12,
    borderRadius: 8,
    elevation: 2,
  },
  amount: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  description: {
    marginTop: 4,
    fontSize: 16,
  },
  meta: {
    marginTop: 4,
    fontSize: 14,
    color: '#666',
  },
});
