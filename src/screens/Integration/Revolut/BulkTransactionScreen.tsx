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
  Modal,
  TextInput,
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
  TransactionControllerApi
} from '../../../services/generated';
import { env } from '../../../utils/env';
import { useBanner } from '../../../components/BannerContext';

const config = new Configuration({ basePath: env.baseURL });
const categoryApi = new CategoryControllerApi(config, undefined, apiClient);
const transactionControllerApi = new TransactionControllerApi(config, undefined, apiClient);

// Palette for group identification
const SPLIT_COLORS = [
  '#E9D8FD', // Purple
  '#BEE3F8', // Blue
  '#C6F6D5', // Green
  '#FEEBC8', // Orange
  '#FED7D7', // Red
  '#E2E8F0', // Gray
];

interface ExtendedTransaction extends AccountTransactionDto {
  tempId?: string;
  parentId?: string;
  splitColor?: string;
}

export default function BulkTransactionScreen() {
  const navigation = useNavigation();
  const { showBanner } = useBanner();

  const [file, setFile] = useState<DocumentPicker.DocumentPickerAsset | null>(null);
  const [uploading, setUploading] = useState(false);
  const [previewData, setPreviewData] = useState<ExtendedTransaction[]>([]);
  const [categories, setCategories] = useState<CategoryDto[]>([]);

  // Split state
  const [splitModalVisible, setSplitModalVisible] = useState(false);
  const [splitIndex, setSplitIndex] = useState<number | null>(null);
  const [splitValue, setSplitValue] = useState('');

  useEffect(() => {
    const loadCategories = async () => {
      try {
        const res = await categoryApi.getAllCategoriesForUser();
        setCategories(res.data || []);
      } catch (err) {
        console.error('Error loading categories:', err);
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
      Alert.alert('Error', 'Failed to open document picker.');
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
      const result = await apiClient.post(requestArgs.url, formData, {
        headers: { 'Accept': 'application/json' },
        transformRequest: (data) => data,
      });

      // Initialize items with unique IDs for tracking
      const dataWithIds = result.data.map((item: any, idx: number) => ({
        ...item,
        tempId: `orig-${idx}-${Date.now()}`
      }));

      setPreviewData(dataWithIds);
      showBanner(`Successfully loaded ${result.data.length} items`, 'success');
    } catch (error: any) {
      showBanner('Upload failed.', 'error');
    } finally {
      setUploading(false);
    }
  };

  const confirmSplit = () => {
    if (splitIndex === null) return;
    
    const original = previewData[splitIndex];
    const totalAmount = original.amount || 0;
    const splitAmount1 = parseFloat(splitValue.replace(',', '.'));

    if (isNaN(splitAmount1) || splitAmount1 <= 0 || splitAmount1 >= totalAmount) {
      Alert.alert('Error', 'Please enter a valid amount less than the total.');
      return;
    }

    // Assign a parent ID and a consistent color if it's the first split
    const parentId = original.parentId || original.tempId;
    const splitColor = original.splitColor || SPLIT_COLORS[Math.floor(Math.random() * SPLIT_COLORS.length)];
    const splitAmount2 = totalAmount - splitAmount1;

    const commonProps = { 
      ...original, 
      parentId, 
      splitColor,
      category: undefined 
    };

    const firstPart: ExtendedTransaction = { ...commonProps, amount: splitAmount1, tempId: `split-${Math.random()}` };
    const secondPart: ExtendedTransaction = { ...commonProps, amount: splitAmount2, tempId: `split-${Math.random()}` };

    const newData = [...previewData];
    newData.splice(splitIndex, 1, firstPart, secondPart);

    setPreviewData(newData);
    setSplitModalVisible(false);
  };

  const handleMerge = (parentId: string) => {
    const relatedItems = previewData.filter(item => item.parentId === parentId || item.tempId === parentId);
    const totalAmount = relatedItems.reduce((sum, item) => sum + (item.amount || 0), 0);
    
    const firstItem = { 
      ...relatedItems[0], 
      amount: totalAmount, 
      parentId: undefined, 
      splitColor: undefined, 
      tempId: parentId 
    };
    
    const filteredData = previewData.filter(item => item.parentId !== parentId && item.tempId !== parentId);
    setPreviewData([firstItem, ...filteredData]);
    showBanner('Transactions merged back to original', 'info');
  };

const handleSaveAll = async () => {

    if (previewData.length === 0) return;

    // 1. Validation check
    const missingCategories = previewData.some(item => !item.category?.id);
    if (missingCategories) {
      Alert.alert('Missing Categories', 'Please select a category for all transactions before saving.');
      return;
    }

    setUploading(true);
    try {
      // 2. SANITIZE DATA: Remove frontend-only helper properties (tempId, parentId, splitColor)
      // This ensures the object strictly matches AccountTransactionDto
      const sanitizedData: AccountTransactionDto[] = previewData.map(({ 
        tempId, 
        parentId, 
        splitColor, 
        ...rest 
      }) => rest);

      // 3. API Call using the sanitized array
      await transactionControllerApi.createBulkTransactions(sanitizedData);
      
      showBanner(`Successfully saved ${sanitizedData.length} transactions`, 'success');
      
      setPreviewData([]);
      navigation.goBack();
    } catch (error: any) {
      console.error('Failed to save bulk transactions:', error);
      // Log the actual error response if available for debugging
      const errorMessage = error.response?.data?.message || 'Failed to save transactions to the database.';
      showBanner(errorMessage, 'error');
    } finally {
      setUploading(false);
    }
  };
  
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.header}>Revolut Import</Text>

        {/* File Picker View */}
        {previewData.length === 0 && (
          <View style={styles.card}>
            <TouchableOpacity style={styles.filePicker} onPress={handleSelectFile} disabled={uploading}>
              <Text style={styles.filePickerText}>{file ? `📄 ${file.name}` : 'Select CSV File'}</Text>
            </TouchableOpacity>
            {file && (
              <TouchableOpacity style={styles.uploadButton} onPress={handleUpload} disabled={uploading}>
                {uploading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Generate Preview</Text>}
              </TouchableOpacity>
            )}
            <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
                <Text style={styles.backButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Preview List View */}
        {previewData.length > 0 && (
          <View style={{ flex: 1 }}>
            <View style={styles.infoBox}>
              <Text style={styles.infoText}>Previewing {previewData.length} transactions</Text>
            </View>

            <FlatList
              data={previewData}
              keyExtractor={(item) => item.tempId!}
              contentContainerStyle={{ paddingBottom: 20 }}
              renderItem={({ item, index }) => {
                const isSplitChild = !!item.parentId;
                return (
                  <View style={[
                    styles.transactionItem, 
                    isSplitChild && { backgroundColor: item.splitColor || '#fdfbff', borderColor: 'rgba(0,0,0,0.05)' }
                  ]}>
                    {isSplitChild && <View style={[styles.splitIndicator, { backgroundColor: 'rgba(0,0,0,0.1)' }]} />}
                    <View style={{ flex: 1 }}>
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
                          onValueChange={(val) => {
                            const newData = [...previewData];
                            newData[index] = { ...newData[index], category: categories.find(c => c.id === val) };
                            setPreviewData(newData);
                          }}
                          style={styles.picker}
                        >
                          <Picker.Item label="Select category..." value={undefined} />
                          {categories.map(cat => <Picker.Item key={cat.id} label={cat.name!} value={cat.id} />)}
                        </Picker>
                      </View>

                      <View style={styles.itemFooter}>
                        <Text style={styles.itemDate}>{item.transactionTime ? new Date(item.transactionTime).toLocaleDateString() : ''}</Text>
                        <View style={{ flexDirection: 'row' }}>
                          {isSplitChild && (
                            <TouchableOpacity onPress={() => handleMerge(item.parentId!)} style={styles.mergeButton}>
                              <Text style={styles.mergeButtonText}>🔗 Merge</Text>
                            </TouchableOpacity>
                          )}
                          <TouchableOpacity 
                            onPress={() => { 
                                setSplitIndex(index); 
                                setSplitValue(((item.amount || 0) / 2).toString()); 
                                setSplitModalVisible(true); 
                            }} 
                            style={styles.smallButton}
                          >
                            <Text style={styles.smallButtonText}>✂️ Split</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    </View>
                  </View>
                );
              }}
            />

            <View style={styles.footer}>
              <TouchableOpacity style={styles.saveButton} onPress={handleSaveAll}>
                <Text style={styles.buttonText}>Save All</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.clearButton} onPress={() => setPreviewData([])}>
                <Text style={styles.clearButtonText}>Clear / Back</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Modal for Split Action */}
        <Modal visible={splitModalVisible} transparent animationType="fade">
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Split Transaction</Text>
              <Text style={styles.modalLabel}>First part amount:</Text>
              <TextInput 
                style={styles.input} 
                keyboardType="numeric" 
                value={splitValue} 
                onChangeText={setSplitValue} 
                autoFocus 
              />
              <View style={styles.modalActions}>
                <TouchableOpacity onPress={() => setSplitModalVisible(false)} style={styles.modalButton}>
                  <Text style={styles.cancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={confirmSplit} style={[styles.modalButton, styles.confirmButton]}>
                  <Text style={{ color: '#fff', fontWeight: 'bold' }}>OK</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
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
  transactionItem: { backgroundColor: '#fff', padding: 15, borderRadius: 12, marginBottom: 10, borderWidth: 1, borderColor: '#edf2f7', flexDirection: 'row' },
  splitIndicator: { width: 4, borderRadius: 10, marginRight: 10 },
  itemRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  itemDescription: { fontSize: 15, fontWeight: '600', color: '#2d3748', flex: 1, marginRight: 10 },
  itemAmount: { fontSize: 16, fontWeight: 'bold' },
  itemFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 },
  itemDate: { fontSize: 11, color: '#a0aec0' },
  smallButton: { backgroundColor: '#edf2f7', paddingVertical: 5, paddingHorizontal: 10, borderRadius: 6, borderWidth: 1, borderColor: '#cbd5e0' },
  smallButtonText: { fontSize: 11, fontWeight: 'bold', color: '#4a5568' },
  mergeButton: { backgroundColor: 'rgba(255,255,255,0.4)', paddingVertical: 5, paddingHorizontal: 10, borderRadius: 6, marginRight: 8, borderWidth: 1, borderColor: 'rgba(0,0,0,0.1)' },
  mergeButtonText: { fontSize: 11, color: '#444' },
  pickerWrapper: { borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 8, marginTop: 10, backgroundColor: 'rgba(255,255,255,0.5)', overflow: 'hidden' },
  picker: { height: 45 },
  footer: { paddingTop: 15, borderTopWidth: 1, borderTopColor: '#e2e8f0' },
  saveButton: { backgroundColor: '#38a169', padding: 16, borderRadius: 12, alignItems: 'center', marginBottom: 10 },
  clearButton: { padding: 10, alignItems: 'center' },
  clearButtonText: { color: '#718096', textDecorationLine: 'underline' },
  backButton: { marginTop: 15, alignItems: 'center' },
  backButtonText: { color: '#a0aec0', textDecorationLine: 'underline' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { backgroundColor: '#fff', width: '80%', padding: 20, borderRadius: 16, elevation: 5 },
  modalTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 10, color: '#2d3748' },
  modalLabel: { fontSize: 14, color: '#718096', marginBottom: 8 },
  input: { borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 8, padding: 12, fontSize: 18, marginBottom: 15, color: '#2d3748' },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end' },
  modalButton: { paddingVertical: 10, paddingHorizontal: 20, borderRadius: 8, marginLeft: 10 },
  confirmButton: { backgroundColor: '#5a67d8' },
  cancelText: { color: '#718096', fontWeight: '600' }
});