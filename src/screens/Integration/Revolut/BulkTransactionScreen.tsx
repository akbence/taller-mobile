import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Alert,
  StyleSheet,
  SafeAreaView,
  ActivityIndicator,
  Platform,
  FlatList,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import * as DocumentPicker from 'expo-document-picker';
import { useNavigation } from '@react-navigation/native';
import { apiClient } from '../../../services/apiClient';
import {
  Configuration,
  RevolutIntegrationControllerApi,
  AccountTransactionDto,
  RevolutIntegrationControllerApiAxiosParamCreator,
  CategoryControllerApi,
  CategoryDto,
} from '../../../services/generated';
import { env } from '../../../utils/env';
import { useBanner } from '../../../components/BannerContext';

const config = new Configuration({ basePath: env.baseURL });
const revolutApi = new RevolutIntegrationControllerApi(config, undefined, apiClient);
const categoryApi = new CategoryControllerApi(config, undefined, apiClient);


export default function BulkTransactionScreen() {
  const navigation = useNavigation();
  const { showBanner } = useBanner();

  const [file, setFile] = useState<DocumentPicker.DocumentPickerAsset | null>(null);
  const [uploading, setUploading] = useState(false);
  const [previewData, setPreviewData] = useState<AccountTransactionDto[]>([]);
  const [categories, setCategories] = useState<CategoryDto[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(false);

  useEffect(() => {
    const loadCategories = async () => {
      setLoadingCategories(true);
      try {
        const res = await categoryApi.getAllCategoriesForUser();
        setCategories(res.data || []);
      } catch (err) {
        console.error('Hiba a kategóriák betöltésekor:', err);
      } finally {
        setLoadingCategories(false);
      }
    };
    loadCategories();
  }, []);

  const handleSelectFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['text/comma-separated-values', 'text/csv'],
        copyToCacheDirectory: true,
      });

      if (!result.canceled) {
        setFile(result.assets[0]);
        setPreviewData([]);
      }
    } catch (err) {
      Alert.alert('Error', 'Nem sikerült megnyitni a fájlválasztót.');
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    setUploading(true);
    try {
      const formData = new FormData();

      if (Platform.OS === 'web') {
        const response = await fetch(file.uri);
        const blob = await response.blob();
        formData.append('file', blob, file.name);
      } else {
        // @ts-ignore
        formData.append('file', {
          uri: Platform.OS === 'android' ? file.uri : file.uri.replace('file://', ''),
          name: file.name,
          type: file.mimeType || 'text/csv',
        });
      }

      const paramCreator = RevolutIntegrationControllerApiAxiosParamCreator(config);
      const requestArgs = await paramCreator.createTransactionsBulkPreview(file as any);
      const url = requestArgs.url;

      const result = await apiClient.post(url, formData, {
        headers: {
          'Accept': 'application/json',
        },
        transformRequest: (data) => data,
      });

      setPreviewData(result.data);
      showBanner(`Sikeresen betöltve ${result.data.length} tétel`, 'success');
      console.log(result.data)

    } catch (error: any) {
      console.error('Upload error:', error);
      showBanner('Hiba a feltöltés során.', 'error');
    } finally {
      setUploading(false);
    }
  };

  const updateItemCategory = (index: number, categoryId: string) => {
    const newData = [...previewData];
    const selectedCat = categories.find(c => c.id === categoryId);
    if (selectedCat) {
      newData[index] = { ...newData[index], category: selectedCat };
      setPreviewData(newData);
    }
  };

  const handleFinalSave = async () => {
    Alert.alert('Mentés', 'Fejlesztés alatt: Itt küldjük el a véglegesített tömböt a backendnek.');
    // Ide jön majd: await revolutApi.saveBulkTransactions(previewData);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.header}>Revolut Import</Text>

        {previewData.length === 0 && (
          <View style={styles.card}>
            <TouchableOpacity style={styles.filePicker} onPress={handleSelectFile} disabled={uploading}>
              <Text style={styles.filePickerText}>
                {file ? `📄 ${file.name}` : 'CSV fájl kiválasztása'}
              </Text>
            </TouchableOpacity>

            {file && (
              <TouchableOpacity style={styles.uploadButton} onPress={handleUpload} disabled={uploading}>
                {uploading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Előnézet generálása</Text>}
              </TouchableOpacity>
            )}
          </View>
        )}

        {previewData.length > 0 && (
          <View style={{ flex: 1 }}>
            <View style={styles.infoBox}>
              <Text style={styles.infoText}>Beolvasva: {previewData.length} tranzakció</Text>
            </View>

            <FlatList
              data={previewData}
              keyExtractor={(_, index) => index.toString()}
              contentContainerStyle={{ paddingBottom: 20 }}
              renderItem={({ item, index }) => (
                <View style={styles.transactionItem}>
                  <View style={styles.itemRow}>
                    <Text style={styles.itemDescription} numberOfLines={1}>{item.description}</Text>
                    <Text style={[styles.itemAmount, { color: item.transactionType === 'EXPENSE' ? '#e53e3e' : '#38a169' }]}>
                      {item.transactionType === 'EXPENSE' ? '-' : '+'}
                      {item.amount?.toLocaleString()} {item.currency}
                    </Text>
                  </View>

                  <View style={styles.pickerWrapper}>
                    <Picker
                      selectedValue={item.category?.id}
                      onValueChange={(val) => updateItemCategory(index, val)}
                      style={styles.picker}
                    >
                      <Picker.Item label="Válassz kategóriát..." value={undefined} />
                      {categories.map(cat => (
                        <Picker.Item key={cat.id} label={cat.name!} value={cat.id} />
                      ))}
                    </Picker>
                  </View>

                  <Text style={styles.itemDate}>
                    {item.transactionTime ? new Date(item.transactionTime).toLocaleDateString() : ''}
                  </Text>
                </View>
              )}
            />

            <View style={styles.footer}>
              <TouchableOpacity style={styles.saveButton} onPress={handleFinalSave}>
                <Text style={styles.buttonText}>Összes mentése</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.clearButton} onPress={() => setPreviewData([])}>
                <Text style={styles.clearButtonText}>Vissza / Törlés</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {previewData.length === 0 && (
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Text style={styles.backButtonText}>Mégsem</Text>
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f7fafc' },
  content: { padding: 20, flex: 1 },
  header: { fontSize: 28, fontWeight: 'bold', color: '#2d3748', textAlign: 'center', marginBottom: 20 },
  card: { backgroundColor: '#fff', padding: 20, borderRadius: 16, elevation: 3, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10 },
  filePicker: { borderWidth: 2, borderColor: '#e2e8f0', borderStyle: 'dashed', borderRadius: 12, padding: 30, alignItems: 'center', backgroundColor: '#f8fafc', marginBottom: 20 },
  filePickerText: { color: '#4a5568', fontWeight: '600', fontSize: 16 },
  uploadButton: { backgroundColor: '#5a67d8', padding: 16, borderRadius: 12, alignItems: 'center' },
  buttonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  infoBox: { marginVertical: 10, padding: 12, backgroundColor: '#ebf4ff', borderRadius: 10, borderWidth: 1, borderColor: '#bee3f8' },
  infoText: { color: '#2b6cb0', fontWeight: '600', textAlign: 'center' },
  transactionItem: { backgroundColor: '#fff', padding: 15, borderRadius: 12, marginBottom: 10, borderWidth: 1, borderColor: '#edf2f7' },
  itemRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  itemDescription: { fontSize: 15, fontWeight: '600', color: '#2d3748', flex: 1, marginRight: 10 },
  itemAmount: { fontSize: 16, fontWeight: 'bold' },
  itemDate: { fontSize: 11, color: '#a0aec0', marginTop: 5 },
  pickerWrapper: { borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 8, backgroundColor: '#f8fafc', marginVertical: 5, overflow: 'hidden' },
  picker: { height: 45, width: '100%' },
  footer: { paddingTop: 15, borderTopWidth: 1, borderTopColor: '#e2e8f0' },
  saveButton: { backgroundColor: '#38a169', padding: 16, borderRadius: 12, alignItems: 'center', marginBottom: 10 },
  clearButton: { padding: 10, alignItems: 'center' },
  clearButtonText: { color: '#718096', textDecorationLine: 'underline' },
  backButton: { marginTop: 20, padding: 12, alignItems: 'center' },
  backButtonText: { color: '#a0aec0', textDecorationLine: 'underline' },
});