import React, { useState } from 'react';
import { View, Text, Modal, StyleSheet, TouchableOpacity, ScrollView, Clipboard, Platform } from 'react-native';
import { AlertTriangle, X, Copy, ChevronDown, ChevronUp, RefreshCw, MessageSquareWarning } from 'lucide-react-native';

export interface ErrorDetails {
  title: string;
  message: string;
  code?: string | number;
  technicalDetails?: string;
  suggestion?: string;
}

interface ErrorModalProps {
  visible: boolean;
  onClose: () => void;
  error: ErrorDetails | null;
  onRetry?: () => void;
  onReport?: () => void;
}

export const ErrorModal: React.FC<ErrorModalProps> = ({ 
  visible, 
  onClose, 
  error, 
  onRetry, 
  onReport 
}) => {
  const [showDetails, setShowDetails] = useState(false);

  if (!error) return null;

  const copyToClipboard = () => {
    const textToCopy = `Erro: ${error.title}\nMensagem: ${error.message}\nCódigo: ${error.code}\nDetalhes: ${error.technicalDetails}`;
    Clipboard.setString(textToCopy);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          <View style={styles.header}>
            <View style={styles.headerTitleContainer}>
              <AlertTriangle color="#ef4444" size={24} />
              <Text style={styles.title}>{error.title}</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <X stroke="#9ca3af" size={24} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent}>
            <Text style={styles.message}>{error.message}</Text>
            
            {error.suggestion && (
              <View style={styles.suggestionContainer}>
                <Text style={styles.suggestionLabel}>Sugestão:</Text>
                <Text style={styles.suggestionText}>{error.suggestion}</Text>
              </View>
            )}

            <TouchableOpacity 
              style={styles.detailsToggle} 
              onPress={() => setShowDetails(!showDetails)}
            >
              <Text style={styles.detailsToggleText}>
                {showDetails ? 'Ocultar detalhes técnicos' : 'Ver detalhes técnicos'}
              </Text>
              {showDetails ? <ChevronUp size={16} color="#6b7280" /> : <ChevronDown size={16} color="#6b7280" />}
            </TouchableOpacity>

            {showDetails && (
              <View style={styles.technicalContainer}>
                <View style={styles.technicalHeader}>
                  <Text style={styles.technicalLabel}>Log de Erro:</Text>
                  <TouchableOpacity onPress={copyToClipboard}>
                    <Copy size={16} color="#6b7280" />
                  </TouchableOpacity>
                </View>
                <View style={styles.codeBlock}>
                    {error.code && <Text style={styles.codeText}>Código: {error.code}</Text>}
                    <Text style={styles.technicalText}>{error.technicalDetails}</Text>
                </View>
              </View>
            )}
          </ScrollView>

          <View style={styles.footer}>
            {onRetry && (
                <TouchableOpacity style={styles.retryButton} onPress={onRetry}>
                    <RefreshCw color="#fff" size={18} />
                    <Text style={styles.retryButtonText}>Tentar Novamente</Text>
                </TouchableOpacity>
            )}
            
            {onReport && (
                 <TouchableOpacity style={styles.reportButton} onPress={onReport}>
                    <MessageSquareWarning color="#4b5563" size={18} />
                    <Text style={styles.reportButtonText}>Reportar</Text>
                 </TouchableOpacity>
            )}
            
            {!onRetry && !onReport && (
                <TouchableOpacity style={styles.okButton} onPress={onClose}>
                    <Text style={styles.okButtonText}>OK, Entendi</Text>
                </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  container: {
    backgroundColor: '#1f2937',
    borderRadius: 16,
    width: '100%',
    maxWidth: 400,
    maxHeight: '80%',
    borderWidth: 1,
    borderColor: '#374151',
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
    elevation: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#374151',
  },
  headerTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ef4444',
  },
  closeButton: {
    padding: 4,
  },
  content: {
    maxHeight: 400,
  },
  scrollContent: {
    padding: 16,
  },
  message: {
    fontSize: 16,
    color: '#f3f4f6',
    marginBottom: 16,
    lineHeight: 24,
  },
  suggestionContainer: {
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    borderLeftWidth: 4,
    borderLeftColor: '#3b82f6',
    padding: 12,
    borderRadius: 4,
    marginBottom: 16,
  },
  suggestionLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#60a5fa',
    marginBottom: 4,
  },
  suggestionText: {
    fontSize: 14,
    color: '#dbeafe',
  },
  detailsToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: '#374151',
    marginTop: 8,
  },
  detailsToggleText: {
    fontSize: 14,
    color: '#9ca3af',
  },
  technicalContainer: {
    backgroundColor: '#111827',
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  technicalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  technicalLabel: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#9ca3af',
  },
  codeBlock: {
    gap: 4,
  },
  codeText: {
    fontSize: 12,
    color: '#f87171',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  technicalText: {
    fontSize: 12,
    color: '#9ca3af',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  footer: {
    flexDirection: 'row',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#374151',
    gap: 12,
  },
  retryButton: {
    flex: 1,
    backgroundColor: '#3b82f6',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 8,
    gap: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  reportButton: {
    flex: 1,
    backgroundColor: '#374151',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 8,
    gap: 8,
  },
  reportButtonText: {
    color: '#e5e7eb',
    fontWeight: 'bold',
    fontSize: 14,
  },
  okButton: {
    flex: 1,
    backgroundColor: '#3b82f6',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 8,
  },
  okButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
});
