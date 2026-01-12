# Análise da Aplicação Web e Paridade Mobile

## 1. Estrutura de Componentes e Hierarquia (Web)

A aplicação Web segue uma arquitetura baseada em React com Vite.

### Principais Componentes:
*   **LayoutPrincipal**: Wrapper que contém Sidebar (navegação) e Header.
*   **Dashboard**: Componente principal com estatísticas e lista de chamados recentes.
*   **TicketList**: Tabela de chamados com filtros e paginação.
*   **NewTicketModal**: Modal complexo para abertura de chamados, com upload de arquivos.
*   **TicketDetailModal**: Modal para visualização e interação (chat) no chamado.
*   **AuthLayout**: Wrapper para Login/Registro.

### Estrutura de Diretórios (Espelhada no Mobile):
*   `/components`: Componentes reutilizáveis (Botões, Inputs, Cards).
*   `/pages`: Telas principais (Login, Dashboard, Chamados).
*   `/contexts`: AuthContext para gestão de sessão.
*   `/services`: Camada de API (Axios).

## 2. Fluxos de Navegação

### Fluxo de Autenticação
1.  **Login**: Usuário insere credenciais -> API valida -> Token JWT salvo (LocalStorage/SecureStore) -> Redirecionamento para Dashboard.
2.  **Registro**: Formulário de cadastro -> API cria usuário -> Redirecionamento para Login.
3.  **Logout**: Limpeza de token -> Redirecionamento para Login.

### Fluxo de Chamados
1.  **Listagem**: Dashboard exibe resumo. Clicar em "Ver todos" ou no menu leva à lista completa.
2.  **Criação**: Botão FAB ou "Novo Chamado" abre Modal/Tela. Preenchimento de formulário (Tipo, Equipamento, Prioridade, Anexos).
3.  **Detalhamento**: Clicar em um chamado abre detalhes.
    *   **Chat**: Troca de mensagens entre Cliente e Suporte.
    *   **Edição**: Técnico pode alterar Status/Prioridade.

## 3. Lógica de Negócio e Estados

*   **Autenticação**: Persistência de token e verificação de validade na carga da app.
*   **Permissões**:
    *   *Cliente*: Vê apenas seus chamados. Pode abrir chamados apenas para sua unidade.
    *   *Suporte/Admin*: Vê todos os chamados. Pode editar qualquer chamado.
*   **Estados dos Chamados**: Aberto -> Em Análise -> Em Andamento -> Resolvido.

## 4. Design System (Web -> Mobile)

O design utiliza Tailwind CSS na Web. No mobile, utilizamos `StyleSheet` mas mantendo os tokens de design:

*   **Cores**:
    *   Background: `#111827` (Gray 900)
    *   Surface: `#1f2937` (Gray 800)
    *   Primary: `#3b82f6` (Blue 500)
    *   Text Primary: `#ffffff`
    *   Text Secondary: `#9ca3af` (Gray 400)
    *   Status:
        *   Aberto: Blue
        *   Em Análise: Amber
        *   Resolvido: Emerald
        *   Crítica: Red

*   **Tipografia**:
    *   San-serif padrão (System font no mobile).
    *   Títulos: Bold, 20px+.
    *   Corpo: Regular, 14-16px.

## 5. Implementação Mobile (Expo)

A versão mobile foi implementada para garantir paridade funcional e visual:

*   **Navegação**: React Navigation (Stack) substituindo o Router DOM.
*   **Armazenamento**: Abstração `storage.ts` para suportar Web (localStorage) e Native (SecureStore).
*   **Componentes Nativos**:
    *   `CustomPicker`: Substitui `<select>` HTML com modal nativo.
    *   `ImagePicker`: Substitui `<input type="file">` para câmera/galeria.
    *   `FlatList`: Substitui tabelas/listas HTML para performance.
*   **Layout**: SafeAreaView para compatibilidade com notch/ilhas dinâmicas.

## 6. Critérios de Qualidade e Testes

Para validar a paridade:

1.  **Visual**: Comparar lado-a-lado telas de Login, Dashboard e Detalhes. Cores e espaçamentos devem ser idênticos.
2.  **Fluxo**:
    *   Login com sucesso redireciona.
    *   Criar chamado com anexo funciona e aparece na lista.
    *   Enviar mensagem no detalhe atualiza em tempo real (polling).
3.  **Performance**: Scroll da lista de chamados deve manter 60fps.
4.  **Responsividade**: Inputs devem ajustar ao teclado (KeyboardAvoidingView).
