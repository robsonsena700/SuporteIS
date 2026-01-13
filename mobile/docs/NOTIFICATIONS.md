# Adaptação do Sistema de Notificações para Mobile

## Visão Geral
Este documento descreve as adaptações realizadas no sistema de notificações do aplicativo mobile para garantir paridade com a versão web, conforme solicitado.

## 1. Arquitetura e Estado
Foi criado o `NotificationContext` (`mobile/src/context/NotificationContext.tsx`) para centralizar o estado das notificações, replicando a lógica da versão web.

### Funcionalidades Implementadas:
- **Sincronização**: Polling automático a cada 10 segundos (mesmo intervalo da web) para buscar novas notificações.
- **Estado Global**: `notifications`, `unreadCount`, `loading`, `alertEnabled`.
- **Ações**: `markAsRead`, `markAllAsRead`, `refreshNotifications`, `toggleAlert`.
- **Alertas**: Utilização da API `Vibration` do React Native para feedback tátil (substituindo o áudio da web) quando chegam novas notificações não lidas.
- **Optimistic Updates**: Atualização imediata da interface ao marcar como lida, antes mesmo da confirmação da API.

## 2. Interface (UI/UX)
A interface foi adaptada para o contexto mobile, mantendo a consistência visual.

### Componentes:
- **Header**: Integração com `NotificationContext` para exibir badge de contagem em tempo real e controlar o modal.
- **NotificationModal**: Exibição da lista de notificações em um modal nativo, com suporte a gestos de toque.
  - Ícones consistentes com a web (`lucide-react-native`).
  - Formatação de data localizada (`date-fns` com locale `ptBR`).
  - Indicadores visuais de "não lido" (fundo destacado e ponto azul).
  - Botão "Ler todas" condicional.

## 3. Paridade Web vs Mobile

| Funcionalidade | Web (React) | Mobile (React Native) |
| :--- | :--- | :--- |
| **Busca de Dados** | `NotificationService.getAll()` | `NotificationService.getAll()` (Mesmo endpoint) |
| **Polling** | `setInterval(10s)` | `setInterval(10s)` |
| **Som/Alerta** | `window.AudioContext` (Beep) | `Vibration.vibrate(400)` (Vibração) |
| **Controle de Alerta** | Botão de Mute (Som) | `toggleAlert` (Vibração) |
| **UI** | Dropdown Menu | Modal Full/Partial Screen |
| **Interação** | Clique | Toque (Touch) |

## 4. Testes
Foi criado um arquivo de teste unitário (`mobile/src/context/__tests__/NotificationContext.test.tsx`) cobrindo os principais cenários:
- Busca inicial de notificações.
- Contagem de não lidas.
- Marcação como lida (individual e todas).
- Disparo de vibração em novas notificações.
- Respeito à configuração de "Alerta Ativo/Inativo".

## 5. Próximos Passos (Sugestões)
- **Push Notifications**: Para notificações em background (app fechado), seria necessário integrar com Expo Push Notifications ou Firebase Cloud Messaging (FCM) e atualizar o backend para armazenar tokens de dispositivo.
- **Gestos**: Implementar "swipe to read" ou "swipe to delete" na lista de notificações para uma experiência mobile mais nativa.
