import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, FlatList, StyleSheet, Alert, ActivityIndicator, Button } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { 
    AccountTransactionDto, 
    TransactionControllerApi,
    Configuration
} from '../../services/generated'; 
import { apiClient } from '../../services/apiClient';
import { env } from '../../utils/env';
import { useBanner } from '../../components/BannerContext'; 

import { OFFLINE_STORAGE_KEYS } from '../../utils/const';

const config = new Configuration({ basePath: env.baseURL });
const transactionControllerApi = new TransactionControllerApi(config, undefined, apiClient);

export default function PendingElementsScreen() {
    const [pendingTransactions, setPendingTransactions] = useState<AccountTransactionDto[]>([]);
    const [loading, setLoading] = useState(false);
    const [syncing, setSyncing] = useState(false);
    const { showBanner } = useBanner();

    /**
     * Betölti a függő tranzakciókat az AsyncStorage-ből
     */
    const loadPendingTransactions = useCallback(async () => {
        setLoading(true);
        try {
            const storedQueue = await AsyncStorage.getItem(OFFLINE_STORAGE_KEYS.PENDING_TRANSACTIONS);
            const queue: AccountTransactionDto[] = storedQueue ? JSON.parse(storedQueue) : [];
            setPendingTransactions(queue);
        } catch (error) {
            console.error('Hiba a függő tranzakciók betöltésekor:', error);
            Alert.alert('Hiba', 'Nem sikerült betölteni a függő tranzakciókat.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        // Töltse be az adatokat, amikor a képernyő megjelenik
        loadPendingTransactions();
    }, [loadPendingTransactions]);

    /**
     * Megpróbálja elküldeni a függő tranzakciókat a szervernek
     */
    const syncTransactions = async () => {
        if (pendingTransactions.length === 0) {
            showBanner('Nincs függő tranzakció a szinkronizáláshoz.', 'info');
            return;
        }

        setSyncing(true);
        let successfullySyncedCount = 0;
        const failedTransactions: AccountTransactionDto[] = [];
        
        // Tranzakciók egyenkénti küldése
        for (const transaction of pendingTransactions) {
            try {
                // API hívás
                await transactionControllerApi.createTransaction(transaction);
                successfullySyncedCount++;
            } catch (error) {
                // Ha hiba van, a tranzakciót visszatesszük a sikertelen listába
                console.error(`Tranzakció szinkronizálása sikertelen: ${transaction.description}`, error);
                failedTransactions.push(transaction);
            }
        }

        // 1. Frissítjük az AsyncStorage-t a sikertelen tranzakciókkal
        try {
            await AsyncStorage.setItem(OFFLINE_STORAGE_KEYS.PENDING_TRANSACTIONS, JSON.stringify(failedTransactions));
            setPendingTransactions(failedTransactions); // Frissítjük a lokális állapotot
        } catch (e) {
            console.error('Hiba az AsyncStorage frissítésekor szinkronizálás után:', e);
        }

        // 2. Visszajelzés a felhasználónak
        if (successfullySyncedCount > 0) {
            showBanner(`${successfullySyncedCount} tranzakció sikeresen szinkronizálva!`, 'success');
        }
        
        if (failedTransactions.length > 0) {
            Alert.alert(
                'Szinkronizálási hiba',
                `${failedTransactions.length} tranzakciót nem sikerült szinkronizálni. Valószínűleg a token lejárt, vagy a tranzakciós adatok érvénytelenek.`,
            );
        }

        setSyncing(false);
    };

    const renderItem = ({ item }: { item: AccountTransactionDto }) => (
        <View style={styles.transactionCard}>
            <Text style={styles.description}>{item.description}</Text>
            <Text style={styles.amount}>
                {item.amount?.toFixed(2)} {item.currency} ({item.transactionType})
            </Text>
            <Text style={styles.date}>
                Dátum: {new Date(item.transactionTime!).toLocaleString()}
            </Text>
        </View>
    );

    if (loading) {
        return (
            <View style={[styles.container, styles.center]}>
                <ActivityIndicator size="large" />
                <Text style={styles.statusText}>Függő tranzakciók betöltése...</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Függő Tranzakciók ({pendingTransactions.length})</Text>

            <View style={styles.syncButtonContainer}>
                <Button 
                    title={syncing ? "Szinkronizálás..." : "Szinkronizálás most"}
                    onPress={syncTransactions}
                    disabled={syncing || pendingTransactions.length === 0}
                    color={pendingTransactions.length > 0 ? '#5A67D8' : '#aaa'}
                />
            </View>

            {pendingTransactions.length === 0 ? (
                <View style={styles.center}>
                    <Text style={styles.emptyText}>Nincs függő tranzakció. Minden szinkronizálva! 🎉</Text>
                </View>
            ) : (
                <FlatList
                    data={pendingTransactions}
                    renderItem={renderItem}
                    keyExtractor={(_, index) => index.toString()}
                    contentContainerStyle={styles.listContent}
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 16,
        backgroundColor: '#f4f4f9',
    },
    center: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    title: {
        fontSize: 22,
        fontWeight: 'bold',
        marginBottom: 12,
        color: '#333',
    },
    syncButtonContainer: {
        marginBottom: 16,
    },
    listContent: {
        paddingBottom: 20,
    },
    transactionCard: {
        backgroundColor: '#fff',
        padding: 15,
        borderRadius: 8,
        marginBottom: 10,
        borderLeftWidth: 5,
        borderLeftColor: 'orange', // Megjelölés: függőben lévő
        shadowColor: '#000',
        shadowOpacity: 0.05,
        shadowRadius: 5,
        elevation: 2,
    },
    description: {
        fontSize: 18,
        fontWeight: '600',
        color: '#333',
    },
    amount: {
        fontSize: 16,
        color: '#5A67D8',
        marginTop: 4,
        fontWeight: 'bold',
    },
    date: {
        fontSize: 12,
        color: '#777',
        marginTop: 8,
    },
    statusText: {
        marginTop: 10,
        color: '#555',
    },
    emptyText: {
        fontSize: 16,
        color: '#999',
        textAlign: 'center',
    }
});