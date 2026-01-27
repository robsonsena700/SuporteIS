import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, KeyboardAvoidingView, Platform, Image, PixelRatio } from 'react-native';
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import { makeRedirectUri } from 'expo-auth-session';
import { useAuth } from '../auth/AuthContext';
import { useTheme } from '../context/ThemeContext';

WebBrowser.maybeCompleteAuthSession();
import { api } from '../api/api';
import { LogoConfig } from '../types';
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
  const { signIn, googleSignIn } = useAuth();
  const { theme } = useTheme();

  const [errorModalVisible, setErrorModalVisible] = useState(false);
  const [currentError, setCurrentError] = useState<ErrorDetails | null>(null);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [loadingLogo, setLoadingLogo] = useState(true);

  // Google Auth Config
  const [request, response, promptAsync] = Google.useAuthRequest({
    androidClientId: 'YOUR_ANDROID_CLIENT_ID', // Replace with your ID
    iosClientId: 'YOUR_IOS_CLIENT_ID',         // Replace with your ID
    webClientId: 'YOUR_WEB_CLIENT_ID',         // Replace with your ID
    scopes: ['profile', 'email'],
  });

  useEffect(() => {
    // Log the Redirect URI for the user to add to Google Console
    const redirectUri = makeRedirectUri({ scheme: 'suporteis' });
    console.log('>>> URI de Redirecionamento para o Google Console:', redirectUri);
  }, []);

  useEffect(() => {
    if (response?.type === 'success') {
      const { authentication } = response;
      if (authentication?.accessToken) {
        fetchUserInfo(authentication.accessToken);
      }
    }
  }, [response]);

  const fetchUserInfo = async (token: string) => {
    setIsSubmitting(true);
    try {
      const res = await fetch('https://www.googleapis.com/userinfo/v2/me', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const userGoogle = await res.json();
      
      console.log('Google User:', userGoogle);
      
      // Authenticate with the app context
      await googleSignIn(userGoogle, token);
      
    } catch (error) {
      console.error(error);
      Alert.alert('Erro', 'Falha ao realizar login com Google. Verifique sua conexão.');
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    const fetchLogo = async () => {
      try {
        const response = await api.get<LogoConfig>('/logos');
        const data = response.data;
        if (data && data.mobile) {
            const pixelDensity = PixelRatio.get();
            let selectedLogo = data.mobile.x1;
            
            // Choose resolution based on pixel density
            if (pixelDensity >= 3 && data.mobile.x3) {
                selectedLogo = data.mobile.x3;
            } else if (pixelDensity >= 2 && data.mobile.x2) {
                selectedLogo = data.mobile.x2;
            }
            
            setLogoUrl(selectedLogo);
        }
      } catch (error) {
        console.log('Failed to fetch logo configuration', error);
      } finally {
        setLoadingLogo(false);
      }
    };
    
    fetchLogo();
  }, []);

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
        suggestion = 'Verifique se o Wi-Fi ou dados móveis estão ativos. O IP do servidor pode ter mudado.';
        code = 'NETWORK_ERROR';
      }

      const apiUrl = process.env.EXPO_PUBLIC_API_URL || 'Unknown URL';
      const techDetails = `${error.message || JSON.stringify(error)}\nTarget: ${apiUrl}`;

      setCurrentError({
        title,
        message: msg,
        code: code.toString(),
        technicalDetails: techDetails,
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
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
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
          {logoUrl ? (
            <Image 
              source={{ uri: logoUrl }} 
              style={styles.logo} 
              resizeMode="contain"
            />
          ) : null}
          <Text style={[styles.title, { color: theme.primary }]}>SuporteIS</Text>
          <Text style={[styles.subtitle, { color: theme.subtext }]}>Entre para acessar seus chamados</Text>
        </View>

        <View style={styles.form}>
          <View style={[styles.inputContainer, { backgroundColor: theme.inputBg, borderColor: theme.inputBorder }]}>
            <Mail color={theme.subtext} size={20} style={styles.inputIcon} />
            <TextInput
              style={[styles.input, { color: theme.text }]}
              placeholder="E-mail"
              placeholderTextColor={theme.placeholder}
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
            />
          </View>

          <View style={[styles.inputContainer, { backgroundColor: theme.inputBg, borderColor: theme.inputBorder }]}>
            <Lock color={theme.subtext} size={20} style={styles.inputIcon} />
            <TextInput
              style={[styles.input, { color: theme.text }]}
              placeholder="Senha"
              placeholderTextColor={theme.placeholder}
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
            />
            <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeIcon}>
              {showPassword ? (
                <EyeOff color={theme.subtext} size={20} />
              ) : (
                <Eye color={theme.subtext} size={20} />
              )}
            </TouchableOpacity>
          </View>

          <TouchableOpacity 
            style={styles.forgotPasswordContainer}
            onPress={() => navigation.navigate('ForgotPassword' as never)}
          >
            <Text style={[styles.forgotPasswordText, { color: theme.primary }]}>Esqueceu a senha?</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.button, { backgroundColor: theme.primary }]} 
            onPress={handleLogin}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Entrar</Text>
            )}
          </TouchableOpacity>

          {/* Google Login Button */}
          <TouchableOpacity 
            style={[styles.googleButton, (!request || isSubmitting) && { opacity: 0.7 }]} 
            onPress={() => promptAsync()}
            disabled={!request || isSubmitting}
            activeOpacity={0.8}
          >
            {(!request || isSubmitting) ? (
              <ActivityIndicator color="#1F2937" />
            ) : (
              <>
                <Image 
                  source={{ uri: 'https://developers.google.com/identity/images/g-logo.png' }} 
                  style={styles.googleLogo} 
                  resizeMode="contain"
                />
                <Text style={styles.googleButtonText}>Continuar com o Google</Text>
              </>
            )}
          </TouchableOpacity>

          <View style={styles.footer}>
            <Text style={[styles.footerText, { color: theme.subtext }]}>Não tem uma conta?</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Signup' as never)}>
              <Text style={[styles.signupText, { color: theme.primary }]}>Crie agora</Text>
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
  logo: {
    width: 120,
    height: 120,
    marginBottom: 16,
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
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    height: 56,
    borderRadius: 12,
    marginTop: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    gap: 12,
    width: '100%',
  },
  googleButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  googleLogo: {
    width: 24,
    height: 24,
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
