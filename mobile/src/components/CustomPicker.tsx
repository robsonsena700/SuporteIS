import React, { useState, useMemo } from 'react';
import { View, Text, TouchableOpacity, Modal, FlatList, StyleSheet, Platform, ViewStyle, TextInput } from 'react-native';
import { ChevronDown, X, Search } from 'lucide-react-native';
import { useTheme } from '../context/ThemeContext';

interface Option {
  label: string;
  value: string;
}

interface CustomPickerProps {
  label: string;
  value: string;
  options: Option[];
  onSelect: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  containerStyle?: ViewStyle;
  searchable?: boolean;
}

export const CustomPicker: React.FC<CustomPickerProps> = ({ 
  label, 
  value, 
  options, 
  onSelect, 
  placeholder = 'Selecione...',
  disabled = false,
  containerStyle,
  searchable = false
}) => {
  const { theme } = useTheme();
  const [modalVisible, setModalVisible] = useState(false);
  const [searchText, setSearchText] = useState('');

  const selectedOption = options.find(opt => opt.value === value);

  const filteredOptions = useMemo(() => {
    if (!searchText) return options;
    return options.filter(opt => 
      opt.label.toLowerCase().includes(searchText.toLowerCase())
    );
  }, [options, searchText]);

  const handleClose = () => {
    setModalVisible(false);
    setSearchText('');
  };

  return (
    <View style={[styles.container, containerStyle]}>
      <Text style={[styles.label, { color: theme.subtext }]}>{label}</Text>
      <TouchableOpacity 
        style={[styles.selector, disabled && styles.disabled, { backgroundColor: theme.inputBg, borderColor: theme.inputBorder }]} 
        onPress={() => !disabled && setModalVisible(true)}
      >
        <Text style={[styles.valueText, !selectedOption && styles.placeholder, { color: !selectedOption ? theme.subtext : theme.text }]}>
          {selectedOption ? selectedOption.label : placeholder}
        </Text>
        <ChevronDown size={20} color={theme.subtext} />
      </TouchableOpacity>

      <Modal
        visible={modalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={handleClose}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.card }]}>
            <View style={[styles.modalHeader, { borderBottomColor: theme.border }]}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>{label}</Text>
              <TouchableOpacity onPress={handleClose}>
                <X size={24} color={theme.subtext} />
              </TouchableOpacity>
            </View>

            {searchable && (
              <View style={[styles.searchContainer, { borderBottomColor: theme.border, backgroundColor: theme.background }]}>
                <Search size={20} color={theme.subtext} style={styles.searchIcon} />
                <TextInput
                  style={[styles.searchInput, { color: theme.text }]}
                  placeholder="Pesquisar..."
                  placeholderTextColor={theme.subtext}
                  value={searchText}
                  onChangeText={setSearchText}
                  autoCapitalize="none"
                />
              </View>
            )}
            
            <FlatList
              data={filteredOptions}
              keyExtractor={(item) => item.value}
              renderItem={({ item }) => (
                <TouchableOpacity 
                  style={[
                    styles.optionItem, 
                    item.value === value && { backgroundColor: theme.background },
                    { borderBottomColor: theme.border }
                  ]}
                  onPress={() => {
                    onSelect(item.value);
                    handleClose();
                  }}
                >
                  <Text style={[
                    styles.optionText,
                    item.value === value && { color: theme.primary, fontWeight: 'bold' },
                    { color: item.value === value ? theme.primary : theme.text }
                  ]}>
                    {item.label}
                  </Text>
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  label: {
    color: '#9ca3af',
    marginBottom: 8,
    fontSize: 14,
  },
  selector: {
    backgroundColor: '#1f2937',
    borderWidth: 1,
    borderColor: '#374151',
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  disabled: {
    opacity: 0.6,
  },
  valueText: {
    color: '#fff',
    fontSize: 16,
  },
  placeholder: {
    color: '#6b7280',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#1f2937',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '70%',
    paddingBottom: Platform.OS === 'ios' ? 40 : 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#374151',
  },
  modalTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  optionItem: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#374151',
  },
  selectedOption: {
    backgroundColor: '#374151',
  },
  optionText: {
    color: '#d1d5db',
    fontSize: 16,
  },
  selectedOptionText: {
    color: '#3b82f6',
    fontWeight: 'bold',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#374151',
    backgroundColor: '#111827',
  },
  searchIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    color: '#fff',
    fontSize: 16,
    height: 40,
  },
});
