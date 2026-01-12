import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useAuth } from '../auth/AuthContext';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Mail, Lock, User, Briefcase, ArrowLeft, CheckSquare, Square, Eye, EyeOff } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';

export const SignupScreen = () => {
  const navigation = useNavigation();
  const { signUp } = useAuth();
  
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    company: '',
    password: '',
    confirmPassword: '',
    agreeTerms: false
  });
  
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (name: string, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const validatePasswordStrength = (password: string) => {
    return /[a-zA-Z]/.test(password) && /[0-9]/.test(password);
  };

  const handleSignup = async () => {
    if (!formData.firstName || !formData.lastName || !formData.email || !formData.password || !formData.confirmPassword) {
      Alert.alert('Erro', 'Por favor, preencha todos os campos obrigatórios.');
      return;
    }

    if (formData.password.length < 8) {
      Alert.alert('Senha Fraca', 'A senha deve ter no mínimo 8 caracteres.');
      return;
    }

    if (!validatePasswordStrength(formData.password)) {
      Alert.alert('Senha Fraca', 'A senha deve conter letras e números.');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      Alert.alert('Erro', 'As senhas não coincidem.');
      return;
    }

    if (!formData.agreeTerms) {
      Alert.alert('Termos de Serviço', 'Você deve concordar com os Termos de Serviço e Política de Privacidade para continuar.');
      return;
    }

    setIsSubmitting(true);
    try {
      await signUp({
        name: `${formData.firstName} ${formData.lastName}`.trim(),
        email: formData.email,
        company: formData.company,
        password: formData.password,
        role: 'Cliente',
        profile: 'Cliente'
      });
      // AuthContext.signUp calls signIn automatically, so no need to navigate manually if RootNavigator handles it
    } catch (error: any) {
      const msg = error.response?.data?.message || 'Erro ao realizar cadastro. Tente novamente.';
      Alert.alert('Falha no Cadastro', msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.content}
      >
        <ScrollView showsVerticalScrollIndicator={false}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <ArrowLeft color="#9ca3af" size={24} />
            <Text style={styles.backText}>Voltar</Text>
          </TouchableOpacity>

          <View style={styles.header}>
            <Text style={styles.title}>Crie sua conta</Text>
            <Text style={styles.subtitle}>Preencha os dados abaixo para começar</Text>
          </View>

          <View style={styles.form}>
            <View style={styles.row}>
              <View style={[styles.inputContainer, styles.halfInput]}>
                <User color="#9ca3af" size={20} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Nome"
                  placeholderTextColor="#6b7280"
                  value={formData.firstName}
                  onChangeText={(text) => handleChange('firstName', text)}
                />
              </View>
              <View style={[styles.inputContainer, styles.halfInput]}>
                <TextInput
                  style={styles.input}
                  placeholder="Sobrenome"
                  placeholderTextColor="#6b7280"
                  value={formData.lastName}
                  onChangeText={(text) => handleChange('lastName', text)}
                />
              </View>
            </View>

            <View style={styles.inputContainer}>
              <Mail color="#9ca3af" size={20} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="E-mail"
                placeholderTextColor="#6b7280"
                value={formData.email}
                onChangeText={(text) => handleChange('email', text)}
                autoCapitalize="none"
                keyboardType="email-address"
              />
            </View>

            <View style={styles.inputContainer}>
              <Briefcase color="#9ca3af" size={20} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Empresa / Unidade"
                placeholderTextColor="#6b7280"
                value={formData.company}
                onChangeText={(text) => handleChange('company', text)}
              />
            </View>

            <View style={styles.inputContainer}>
              <Lock color="#9ca3af" size={20} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Senha"
                placeholderTextColor="#6b7280"
                value={formData.password}
                onChangeText={(text) => handleChange('password', text)}
                secureTextEntry={!showPassword}
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeIcon}>
                {showPassword ? (
                  <EyeOff color="#9ca3af" size={20} />
                ) : (
                  <Eye color="#9ca3af" size={20} />
                )}
              </TouchableOpacity>
            </View>

            <View style={styles.inputContainer}>
              <Lock color="#9ca3af" size={20} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Confirmar Senha"
                placeholderTextColor="#6b7280"
                value={formData.confirmPassword}
                onChangeText={(text) => handleChange('confirmPassword', text)}
                secureTextEntry={!showConfirmPassword}
              />
              <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)} style={styles.eyeIcon}>
                {showConfirmPassword ? (
                  <EyeOff color="#9ca3af" size={20} />
                ) : (
                  <Eye color="#9ca3af" size={20} />
                )}
              </TouchableOpacity>
            </View>

            <TouchableOpacity 
              style={styles.termsContainer}
              onPress={() => handleChange('agreeTerms', !formData.agreeTerms)}
            >
              {formData.agreeTerms ? (
                <CheckSquare color="#3b82f6" size={24} />
              ) : (
                <Square color="#6b7280" size={24} />
              )}
              <Text style={styles.termsText}>
                Eu concordo com os <Text style={styles.linkText}>Termos de Serviço</Text> e confirmo que li a <Text style={styles.linkText}>Política de Privacidade</Text>.
              </Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.button} 
              onPress={handleSignup}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>Cadastrar</Text>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#111827',
  },
  content: {
    flex: 1,
    padding: 24,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  backText: {
    color: '#9ca3af',
    fontSize: 16,
    marginLeft: 8,
  },
  header: {
    marginBottom: 32,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#3b82f6',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#9ca3af',
  },
  form: {
    gap: 16,
  },
  row: {
    flexDirection: 'row',
    gap: 16,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1f2937',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#374151',
    paddingHorizontal: 16,
    height: 56,
  },
  halfInput: {
    flex: 1,
  },
  inputIcon: {
    marginRight: 12,
  },
  eyeIcon: {
    padding: 4,
  },
  input: {
    flex: 1,
    color: '#fff',
    fontSize: 16,
  },
  termsContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginTop: 8,
    marginBottom: 8,
  },
  termsText: {
    flex: 1,
    color: '#9ca3af',
    fontSize: 14,
    lineHeight: 20,
  },
  linkText: {
    color: '#3b82f6',
    fontWeight: 'bold',
  },
  button: {
    backgroundColor: '#3b82f6',
    height: 56,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 32,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
