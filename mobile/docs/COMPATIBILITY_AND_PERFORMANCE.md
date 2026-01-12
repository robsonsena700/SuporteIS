# Compatibilidade e Performance Mobile

Este documento descreve as implementações realizadas para garantir que o aplicativo mobile do SuporteIS funcione corretamente em uma ampla gama de dispositivos (smartphones e tablets), orientações (retrato e paisagem) e resoluções.

## 1. Layout Responsivo

Implementamos um sistema de layout flexível que se adapta dinamicamente ao tamanho da tela.

### Hook `useResponsive`
Criamos um hook personalizado (`src/hooks/useResponsive.ts`) que fornece:
*   `isTablet`: Boolean (largura >= 768px).
*   `isLandscape`: Boolean (largura > altura).
*   `screenWidth` / `screenHeight`: Dimensões atualizadas em tempo real (suporte a rotação).
*   `wp` / `hp`: Utilitários para largura/altura percentual.

### Adaptações por Tela

#### Dashboard (`DashboardScreen`)
*   **Smartphone**: Lista vertical única de chamados.
*   **Tablet/Paisagem**: Grid de 2 colunas (`numColumns={2}`) para aproveitar o espaço horizontal.
*   **Ajustes**: A largura dos cards é calculada dinamicamente: `(screenWidth - gaps) / numColumns`.

#### Novo Chamado (`NewTicketScreen`)
*   **Smartphone**: Formulário em coluna única (vertical).
*   **Tablet/Paisagem**: Formulário em Grid de 2 colunas.
    *   Campos "menores" (Equipamento, Prioridade, Cliente, Localização) ocupam 48% da largura.
    *   Campos "maiores" (Assunto, Descrição, Anexos) ocupam 100% da largura.
*   **Input Groups**: Reorganizados para usar `flexWrap: 'wrap'` e `justifyContent: 'space-between'`.

#### Detalhes do Chamado (`TicketDetailScreen`)
*   **Smartphone**: Detalhes listados verticalmente.
*   **Tablet/Paisagem**: Grid de 2 colunas para as informações técnicas (Equipamento, Prioridade, Cliente, Local), mantendo Assunto e Descrição em largura total.

## 2. Testes de Compatibilidade

Recomenda-se o seguinte plano de testes em dispositivos físicos ou emuladores:

### Dispositivos Alvo
1.  **Smartphone Pequeno**: iPhone SE / Android 5" (320px - 360px largura).
    *   *Verificar*: Se textos não quebram ou sobrepõem, se botões são clicáveis (min 44px).
2.  **Smartphone Padrão**: iPhone 12/13/14 / Android 6" (375px - 400px largura).
    *   *Verificar*: Layout padrão vertical.
3.  **Tablet Pequeno / Foldable**: iPad Mini / Galaxy Fold (aberto) (~768px).
    *   *Verificar*: Ativação do modo Grid (2 colunas) no Dashboard e Formulários.
4.  **Tablet Grande**: iPad Pro / Galaxy Tab S (~1024px+).
    *   *Verificar*: Espaçamento e legibilidade.

### Orientação
*   **Retrato**: Modo padrão de uso.
*   **Paisagem**: Girar o dispositivo em todas as telas.
    *   *Dashboard*: Deve mudar para 2 colunas.
    *   *Formulários*: Devem reorganizar para aproveitar a largura.
    *   *Teclado*: Verificar se o teclado virtual não cobre o campo de input (uso de `KeyboardAvoidingView` e `ScrollView`).

## 3. Melhorias Específicas

*   **Toque Preciso**: Inputs e Botões mantidos com altura mínima de `56px` para facilitar o toque.
*   **Densidade de Pixels**: Imagens de anexo são processadas pelo `expo-image-picker` com qualidade `0.7` para equilibrar resolução e tamanho.
*   **Texto**: Fontes utilizam tamanhos legíveis (14px labels, 16px inputs).

## 4. Performance

*   **Listas**: Uso de `FlatList` no Dashboard e Chat para renderização virtualizada de grandes listas.
*   **Imagens**: Compressão de imagens antes do envio (base64) para reduzir uso de memória e banda.
*   **Renderização**: Hooks de responsividade ouvem mudanças de dimensão mas só disparam re-renderizações necessárias. O layout flexível evita cálculos complexos de JS no render loop.

## Próximos Passos
*   Testar em dispositivo físico com "Notch" (iPhone X+) e "Dynamic Island" para validar `SafeAreaView`.
*   Verificar comportamento do teclado em tablets Android (que podem ter barra de ferramentas extra).
