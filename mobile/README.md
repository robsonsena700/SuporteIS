# SuporteIS Mobile App

Este é o aplicativo móvel do sistema SuporteIS, desenvolvido com React Native e Expo.

## 🚀 Como Rodar

1.  **Instale as dependências:**
    ```bash
    cd mobile
    npm install
    ```

2.  **Configure o IP da API:**
    Abra `src/api/api.ts` e altere `DEV_API_URL` para o IP da sua máquina local onde o backend está rodando.
    *   Para emulador Android: `http://10.0.2.2:5000/api`
    *   Para dispositivo físico: `http://SEU_IP_LOCAL:5000/api` (ex: 192.168.1.5)

3.  **Inicie o projeto:**
    ```bash
    npm start
    ```
    *   Pressione `a` para abrir no Android Emulator.
    *   Pressione `i` para abrir no iOS Simulator (apenas macOS).
    *   Escaneie o QR Code com o app Expo Go no seu celular.

## 📱 Funcionalidades (MVP)

*   **Login:** Acesso com mesmas credenciais do sistema web.
*   **Meus Chamados:** Lista de chamados atribuídos ou criados pelo usuário.
*   **Status:** Visualização rápida de status e prioridade.

## 📦 Como Gerar Build (APK/IPA)

Para gerar os arquivos instaláveis, você precisará de uma conta na [Expo](https://expo.dev).

1.  **Instale a CLI do EAS:**
    ```bash
    npm install -g eas-cli
    ```

2.  **Faça login:**
    ```bash
    eas login
    ```

3.  **Configure o projeto:**
    ```bash
    eas build:configure
    ```

4.  **Gere o Build (Android):**
    ```bash
    eas build --platform android --profile preview
    ```
    Isso gerará um APK instalável.

5.  **Gere o Build (iOS):**
    ```bash
    eas build --platform ios --profile preview
    ```
    Necessário conta Apple Developer paga para distribuição, ou provisionamento ad-hoc.
