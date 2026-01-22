import React, { useState, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useAuth } from '../auth/AuthContext';
import { useLocationIBGE } from '../hooks/useLocationIBGE';
import { CustomPicker } from '../components/CustomPicker';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Mail, Lock, User, Briefcase, ArrowLeft, CheckSquare, Square, Eye, EyeOff } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';

export const SignupScreen = () => {
  const navigation = useNavigation();
  const { signUp } = useAuth();
  const { estados, municipios, loadingEstados, loadingMunicipios, error, fetchMunicipios, clearMunicipios } = useLocationIBGE();
  
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    company: '',
    uf: '',
    municipality: '',
    password: '',
    confirmPassword: '',
    agreeTerms: false
  });
  
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  const lastNameRef = useRef<any>(null);
  const emailRef = useRef<any>(null);
  const companyRef = useRef<any>(null);
  const passwordRef = useRef<any>(null);
  const confirmPasswordRef = useRef<any>(null);

  const handleChange = (name: string, value: string | boolean) => {
    setFormData(prev => {
      const updated = { ...prev, [name]: value };
      runAllValidations(updated);
      return updated;
    });
  };

  const validatePasswordStrength = (password: string) => {
    return /[a-zA-Z]/.test(password) && /[0-9]/.test(password);
  };

  const runAllValidations = (data: any) => {
    const validationErrors: { [key: string]: string } = {};
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!data.firstName) {
      validationErrors.firstName = 'Informe seu nome.';
    }

    if (!data.lastName) {
      validationErrors.lastName = 'Informe seu sobrenome.';
    }

    if (!data.email) {
      validationErrors.email = 'Informe seu e-mail.';
    } else if (!emailRegex.test(String(data.email).toLowerCase())) {
      validationErrors.email = 'Por favor, insira um e-mail válido.';
    }

    if (!data.company) {
      validationErrors.company = 'Informe o nome da empresa ou unidade.';
    }

    if (!data.uf) {
      validationErrors.uf = 'Selecione o estado.';
    }

    if (!data.municipality) {
      validationErrors.municipality = 'Selecione o município.';
    }

    if (!data.password) {
      validationErrors.password = 'Informe uma senha.';
    } else if (data.password.length < 8) {
      validationErrors.password = 'A senha deve ter no mínimo 8 caracteres.';
    } else if (!validatePasswordStrength(data.password)) {
      validationErrors.password = 'A senha deve conter letras e números.';
    }

    if (!data.confirmPassword) {
      validationErrors.confirmPassword = 'Confirme sua senha.';
    } else if (data.password !== data.confirmPassword) {
      validationErrors.confirmPassword = 'As senhas não coincidem.';
    }

    if (!data.agreeTerms) {
      validationErrors.agreeTerms = 'Você deve concordar com os termos para continuar.';
    }

    setErrors(validationErrors);
    return validationErrors;
  };

  const areRequiredFieldsFilled =
    !!formData.firstName &&
    !!formData.lastName &&
    !!formData.email &&
    !!formData.company &&
    !!formData.uf &&
    !!formData.municipality &&
    !!formData.password &&
    !!formData.confirmPassword &&
    !!formData.agreeTerms;

  const hasErrors = Object.values(errors).some(message => message);
  const canSubmit = areRequiredFieldsFilled && !hasErrors && !isSubmitting;

  const handleSignup = async () => {
    const validationErrors = runAllValidations(formData);
    if (Object.values(validationErrors).some(message => message)) {
      Alert.alert('Erro', 'Por favor, corrija os campos destacados.');
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
        profile: 'Cliente',
        uf: formData.uf,
        municipality: formData.municipality
      });
      // AuthContext.signUp calls signIn automatically, so no need to navigate manually if RootNavigator handles it
    } catch (error: any) {
      console.error('Signup error:', error);
      let msg = 'Erro ao realizar cadastro. Tente novamente.';

      if (error.response) {
        msg = error.response.data?.message || msg;
      } else if (error.request) {
        msg = 'Não foi possível conectar ao servidor. Verifique sua internet ou se o servidor está online.';
      } else if (error.message?.includes('timeout')) {
        msg = 'Tempo de conexão esgotado. Tente novamente em instantes.';
      }

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
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <ScrollView 
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ flexGrow: 1, paddingBottom: 100 }}
          keyboardShouldPersistTaps="handled"
        >
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
              <View style={[styles.inputContainer, styles.halfInput, errors.firstName && styles.inputError]}>
                <User color="#9ca3af" size={20} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Nome"
                  placeholderTextColor="#6b7280"
                  value={formData.firstName}
                  onChangeText={(text) => handleChange('firstName', text)}
                  autoCapitalize="words"
                  returnKeyType="next"
                  onSubmitEditing={() => lastNameRef.current?.focus()}
                />
              </View>
              <View style={[styles.inputContainer, styles.halfInput, errors.lastName && styles.inputError]}>
                <TextInput
                  ref={lastNameRef}
                  style={styles.input}
                  placeholder="Sobrenome"
                  placeholderTextColor="#6b7280"
                  value={formData.lastName}
                  onChangeText={(text) => handleChange('lastName', text)}
                  autoCapitalize="words"
                  returnKeyType="next"
                  onSubmitEditing={() => emailRef.current?.focus()}
                />
              </View>
            </View>

            <View style={[styles.inputContainer, errors.email && styles.inputError]}>
              <Mail color="#9ca3af" size={20} style={styles.inputIcon} />
              <TextInput
                ref={emailRef}
                style={styles.input}
                placeholder="E-mail"
                placeholderTextColor="#6b7280"
                value={formData.email}
                onChangeText={(text) => handleChange('email', text)}
                autoCapitalize="none"
                keyboardType="email-address"
                returnKeyType="next"
                onSubmitEditing={() => companyRef.current?.focus()}
              />
            </View>
            {errors.email ? <Text style={styles.errorText}>{errors.email}</Text> : null}

            <CustomPicker
              label="Estado (UF) *"
              value={formData.uf}
              options={estados.map(estado => ({
                label: `${estado.sigla} - ${estado.nome}`,
                value: estado.sigla,
              }))}
              onSelect={(value) => {
                handleChange('uf', value);
                handleChange('municipality', '');
                clearMunicipios();
                fetchMunicipios(value);
              }}
              placeholder={loadingEstados ? 'Carregando estados...' : 'Selecione o estado'}
              disabled={loadingEstados}
            />
            {errors.uf ? <Text style={styles.errorText}>{errors.uf}</Text> : null}

            <CustomPicker
              label="Município *"
              value={formData.municipality}
              options={municipios.map(municipio => ({
                label: municipio.nome,
                value: municipio.nome,
              }))}
              onSelect={(value) => handleChange('municipality', value)}
              placeholder={
                !formData.uf
                  ? 'Selecione primeiro o estado'
                  : loadingMunicipios
                  ? 'Carregando municípios...'
                  : 'Selecione o município'
              }
              disabled={!formData.uf || loadingMunicipios}
              searchable
            />
            {loadingMunicipios ? (
              <View style={styles.loadingMunicipios}>
                <ActivityIndicator color="#9ca3af" />
              </View>
            ) : null}
            {errors.municipality ? <Text style={styles.errorText}>{errors.municipality}</Text> : null}
            {error ? <Text style={styles.errorText}>{error}</Text> : null}

            <View style={[styles.inputContainer, errors.company && styles.inputError]}>
              <Briefcase color="#9ca3af" size={20} style={styles.inputIcon} />
              <TextInput
                ref={companyRef}
                style={styles.input}
                placeholder="Unidade / Empresa"
                placeholderTextColor="#6b7280"
                value={formData.company}
                onChangeText={(text) => handleChange('company', text)}
                autoCapitalize="words"
                returnKeyType="next"
                onSubmitEditing={() => passwordRef.current?.focus()}
              />
            </View>
            {errors.company ? <Text style={styles.errorText}>{errors.company}</Text> : null}

            <View style={[styles.inputContainer, errors.password && styles.inputError]}>
              <Lock color="#9ca3af" size={20} style={styles.inputIcon} />
              <TextInput
                ref={passwordRef}
                style={styles.input}
                placeholder="Senha"
                placeholderTextColor="#6b7280"
                value={formData.password}
                onChangeText={(text) => handleChange('password', text)}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                returnKeyType="next"
                onSubmitEditing={() => confirmPasswordRef.current?.focus()}
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeIcon}>
                {showPassword ? (
                  <EyeOff color="#9ca3af" size={20} />
                ) : (
                  <Eye color="#9ca3af" size={20} />
                )}
              </TouchableOpacity>
            </View>

            {errors.password ? <Text style={styles.errorText}>{errors.password}</Text> : null}

            <View style={[styles.inputContainer, errors.confirmPassword && styles.inputError]}>
              <Lock color="#9ca3af" size={20} style={styles.inputIcon} />
              <TextInput
                ref={confirmPasswordRef}
                style={styles.input}
                placeholder="Confirmar Senha"
                placeholderTextColor="#6b7280"
                value={formData.confirmPassword}
                onChangeText={(text) => handleChange('confirmPassword', text)}
                secureTextEntry={!showConfirmPassword}
                autoCapitalize="none"
                returnKeyType="done"
                onSubmitEditing={handleSignup}
              />
              <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)} style={styles.eyeIcon}>
                {showConfirmPassword ? (
                  <EyeOff color="#9ca3af" size={20} />
                ) : (
                  <Eye color="#9ca3af" size={20} />
                )}
              </TouchableOpacity>
            </View>
            {errors.confirmPassword ? <Text style={styles.errorText}>{errors.confirmPassword}</Text> : null}

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
            {errors.agreeTerms ? <Text style={styles.errorText}>{errors.agreeTerms}</Text> : null}

            <TouchableOpacity 
              style={[styles.button, !canSubmit && styles.buttonDisabled]} 
              onPress={handleSignup}
              disabled={!canSubmit}
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
  inputError: {
    borderColor: '#ef4444',
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
  errorText: {
    color: '#f87171',
    fontSize: 12,
    marginTop: 4,
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
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  loadingMunicipios: {
    marginTop: 4,
  },
});
