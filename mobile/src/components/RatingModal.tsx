import React, { useState } from 'react';
import { View, Text, Modal, StyleSheet, TouchableOpacity, TextInput, ActivityIndicator, Alert } from 'react-native';
import { Star, X } from 'lucide-react-native';

import { useTheme } from '../context/ThemeContext';

interface RatingModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (rating: number, feedback: string) => Promise<void>;
  loading?: boolean;
}

export const RatingModal: React.FC<RatingModalProps> = ({ visible, onClose, onSubmit, loading = false }) => {
  const { theme } = useTheme();
  const [rating, setRating] = useState(0);
  const [feedback, setFeedback] = useState('');

  const handleSubmit = () => {
    if (loading) return;
    if (rating === 0) {
      Alert.alert('Aviso', 'Por favor, selecione uma nota para o atendimento.');
      return;
    }
    if (rating <= 2 && !feedback.trim()) {
      Alert.alert('Aviso', 'Por favor, informe o motivo da insatisfação.');
      return;
    }
    onSubmit(rating, feedback);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={[styles.container, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <View style={styles.header}>
            <Text style={[styles.title, { color: theme.text }]}>Avaliar Atendimento</Text>
            <TouchableOpacity onPress={onClose} disabled={loading}>
              <X stroke={theme.subtext} size={24} />
            </TouchableOpacity>
          </View>

          <Text style={[styles.subtitle, { color: theme.subtext }]}>
            Por favor, avalie o atendimento recebido para finalizarmos o chamado.
          </Text>

          <View style={styles.starsContainer}>
            {[1, 2, 3, 4, 5].map((star) => (
              <TouchableOpacity
                key={star}
                onPress={() => setRating(star)}
                disabled={loading}
                accessibilityLabel={`Definir avaliação ${star} estrelas`}
              >
                <Star
                  size={32}
                  color={star <= rating ? '#fbbf24' : theme.border}
                  fill={star <= rating ? '#fbbf24' : 'none'}
                  style={styles.star}
                />
              </TouchableOpacity>
            ))}
          </View>

          {rating > 0 && rating <= 2 && (
            <TextInput
              style={[styles.input, { backgroundColor: theme.inputBg, borderColor: theme.inputBorder, color: theme.text }]}
              placeholder="Por favor, conte-nos brevemente o que houve..."
              placeholderTextColor={theme.placeholder}
              multiline
              numberOfLines={4}
              value={feedback}
              onChangeText={setFeedback}
              editable={!loading}
            />
          )}

          <TouchableOpacity
            style={[
              styles.submitButton,
              { backgroundColor: theme.success },
              (rating === 0 || loading) && styles.disabledButton
            ]}
            onPress={handleSubmit}
            disabled={rating === 0 || loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.submitButtonText}>Confirmar e Resolver</Text>
            )}
          </TouchableOpacity>
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
    padding: 16,
  },
  container: {
    backgroundColor: '#1f2937',
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    borderColor: '#374151',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  subtitle: {
    fontSize: 14,
    color: '#9ca3af',
    marginBottom: 24,
  },
  starsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 24,
    gap: 8,
  },
  star: {
    marginHorizontal: 4,
  },
  input: {
    backgroundColor: '#111827',
    borderWidth: 1,
    borderColor: '#374151',
    borderRadius: 8,
    padding: 12,
    color: '#fff',
    height: 100,
    textAlignVertical: 'top',
    marginBottom: 24,
  },
  submitButton: {
    backgroundColor: '#10b981',
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  disabledButton: {
    opacity: 0.5,
  },
  submitButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
});
