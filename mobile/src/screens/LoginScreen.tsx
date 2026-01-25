import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { useAuth } from '../auth/AuthContext';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Mail, Lock, Eye, EyeOff } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { ErrorModal, ErrorDetails } from '../components/ErrorModal';

export const LoginScreen = () => {
  const navigation = useNavigation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { signIn } = useAuth();

  const [errorModalVisible, setErrorModalVisible] = useState(false);
  const [currentError, setCurrentError] = useState<ErrorDetails | null>(null);

  const handleLogin = async () => {
    if (!email || !password) {
      setCurrentError({
        title: 'Campos Obrigatórios',
        message: 'Por favor, preencha seu e-mail e senha para continuar.',
        suggestion: 'Certifique-se de que nenhum campo está vazio.',
        technicalDetails: 'Validation Error: Empty fields'
      });
      setErrorModalVisible(true);
      return;
    }

    setIsSubmitting(true);
    try {
      await signIn(email, password);
    } catch (error: any) {
      console.error('Login error:', error);
      
      let title = 'Falha no Login';
      let msg = 'Erro ao realizar login. Verifique suas credenciais.';
      let suggestion = 'Tente digitar sua senha novamente.';
      let code = error.code || 'UNKNOWN';

      if (error.response) {
        msg = error.response.data?.message || msg;
        code = error.response.status;
        
        if (code === 404) {
             title = 'Usuário não encontrado';
             suggestion = 'Verifique se o endereço de e-mail está correto. Se não tiver conta, cadastre-se.';
        } else if (code === 401) {
             title = 'Credenciais Inválidas';
             suggestion = 'A senha informada está incorreta. Use a opção "Esqueceu a senha?" se necessário.';
        }
      } else if (error.request) {
        msg = 'Não foi possível conectar ao servidor. O servidor pode estar offline ou inacessível.';
        suggestion = 'Verifique sua conexão com a internet e tente novamente.';
        code = 'NO_RESPONSE';
      } else if (error.message?.includes('timeout') || error.code === 'ECONNABORTED') {
        msg = 'O servidor demorou muito para responder.';
        suggestion = 'Sua conexão pode estar lenta. Tente novamente em alguns instantes.';
        code = 'TIMEOUT';
      } else if (error.message === 'Network Error') {
        msg = 'Erro de conexão com a rede.';
        suggestion = 'Verifique se o Wi-Fi ou dados móveis estão ativos.';
        code = 'NETWORK_ERROR';
      }

      setCurrentError({
        title,
        message: msg,
        code: code.toString(),
        technicalDetails: error.message || JSON.stringify(error),
        suggestion
      });
      setErrorModalVisible(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReportError = () => {
      // Stub implementation for reporting error
      console.log('Reporting error:', currentError);
      Alert.alert('Relatório Enviado', 'Obrigado por nos ajudar a melhorar. Nossa equipe analisará o erro.');
      setErrorModalVisible(false);
  };

  return (
    <SafeAreaView style={styles.container}>
      <ErrorModal
        visible={errorModalVisible}
        onClose={() => setErrorModalVisible(false)}
        error={currentError}
        onRetry={handleLogin}
        onReport={handleReportError}
      />
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.content}
      >
        <View style={styles.header}>
          <Text style={styles.title}>SuporteIS</Text>
          <Text style={styles.subtitle}>Entre para acessar seus chamados</Text>
        </View>

        <View style={styles.form}>
          <View style={styles.inputContainer}>
            <Mail color="#9ca3af" size={20} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="E-mail"
              placeholderTextColor="#6b7280"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
            />
          </View>

          <View style={styles.inputContainer}>
            <Lock color="#9ca3af" size={20} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Senha"
              placeholderTextColor="#6b7280"
              value={password}
              onChangeText={setPassword}
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

          <TouchableOpacity 
            style={styles.forgotPasswordContainer}
            onPress={() => navigation.navigate('ForgotPassword' as never)}
          >
            <Text style={styles.forgotPasswordText}>Esqueceu a senha?</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.button} 
            onPress={handleLogin}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Entrar</Text>
            )}
          </TouchableOpacity>

          <View style={styles.footer}>
            <Text style={styles.footerText}>Não tem uma conta?</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Signup' as never)}>
              <Text style={styles.signupText}>Crie agora</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#111827', // Dark theme background
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
  },
  header: {
    alignItems: 'center',
    marginBottom: 48,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#3b82f6', // Primary blue
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#9ca3af',
  },
  form: {
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
  button: {
    backgroundColor: '#3b82f6',
    height: 56,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  forgotPasswordContainer: {
    alignSelf: 'flex-end',
  },
  forgotPasswordText: {
    color: '#3b82f6',
    fontSize: 14,
    fontWeight: '500',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 24,
    gap: 8,
  },
  footerText: {
    color: '#9ca3af',
    fontSize: 14,
  },
  signupText: {
    color: '#3b82f6',
    fontSize: 14,
    fontWeight: 'bold',
  },
});
