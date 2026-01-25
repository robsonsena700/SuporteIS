# Manual do Sistema - Atualizações Recentes

## 1. Novos Status de Chamado

Foram adicionados dois novos status ao fluxo de vida dos chamados para melhor controle de processos externos e logísticos:

- **Encaminhado Aquisição**: Indica que a solicitação do chamado necessita de aquisição de peças ou equipamentos e foi encaminhada para o setor responsável.
- **Em Rota**: Indica que o técnico ou o equipamento está em deslocamento para atendimento ou entrega.

Estes status estão disponíveis:
- Na abertura de chamados (embora o padrão seja 'Aberto').
- Na edição de chamados (para técnicos e administradores).
- Nos filtros de pesquisa e dashboards.
- Nos aplicativos Web e Mobile.

## 2. Alteração de Tipo de Chamado (SUP → EQP)

Foi implementada a funcionalidade de alterar o tipo de um chamado de "Sistema" (prefixo **SUP**) para "Equipamento" (prefixo **EQP**).

### Regras de Negócio:
1. **Permissão**: Apenas usuários com perfil de **Suporte Técnico**, **Líder** ou **Administrador** podem realizar essa alteração.
2. **Estado do Chamado**: A alteração só é permitida se o chamado estiver com status **"Aberto"**. Chamados em andamento, resolvidos ou em análise não podem ser alterados.
3. **Sentido Único**: A alteração é permitida apenas de SUP para EQP. Não é possível alterar de EQP para SUP (pois EQP implica controle de patrimônio/equipamento físico).
4. **Geração de Código**: Ao alterar o tipo, um novo código sequencial **EQP-XXXXXXXXXX** é gerado automaticamente e substitui o código anterior.
5. **Auditoria**: A ação é registrada no histórico do chamado, mantendo o rastro da alteração (quem alterou, quando, e qual era o código anterior).

### Como Utilizar:
- **Web**: Na tela de detalhes do chamado, se o chamado for do tipo SUP e estiver Aberto, um botão "Alterar para Tipo Equipamento" estará visível (para usuários autorizados) acima dos botões de ação.
- **Mobile**: Na tela de detalhes do chamado, um botão similar estará disponível.

## 3. Painéis e Relatórios

Os novos status ("Encaminhado Aquisição" e "Em Rota") foram integrados aos painéis de controle (Dashboard):
- Eles são contabilizados no grupo **"Em Tratativa"** ou **"Em Andamento"** nas estatísticas gerais.
- Aparecem nos gráficos e contagens de status.

## 4. Permissões de Gerenciamento de Usuários

As permissões de criação, edição e exclusão de usuários foram ajustadas para reforçar o controle de acesso:

- Usuários com perfil **Técnico** não podem editar nem excluir usuários na tela **Gerenciar Usuários** (Web e Mobile).
- Usuários com perfil **Líder** ou **Administrador** podem editar dados dos usuários e alterar senhas pela tela de gerenciamento.
- Apenas usuários com perfil **Administrador** podem criar novos usuários diretamente pelo módulo de gerenciamento.
- Todas as operações de edição, alteração de senha e exclusão também são validadas no backend, garantindo que chamadas diretas à API respeitem as mesmas regras de permissão.

## 5. Avaliação de Atendimento pelo Cliente

Foi padronizado o fluxo de avaliação de chamados entre as versões Web e Mobile, garantindo as mesmas regras de negócio em todas as plataformas.

- **Quem pode avaliar**:
  - O solicitante do chamado (perfil/role **Cliente**) pode avaliar seu próprio chamado após ele ser marcado como **Resolvido**.
  - Administradores podem visualizar e acompanhar as avaliações, mas a avaliação registrada pelo cliente é a referência principal.
- **Onde avaliar**:
  - **Web**: na tela de detalhes do chamado, o solicitante visualiza o botão **"Avaliar Atendimento"** quando o chamado está Resolvido e ainda não possui nota.
  - **Mobile**: na tela de detalhes do chamado, o cliente visualiza o ícone de estrela para abrir o modal de avaliação nas mesmas condições.
- **Escala de avaliação**:
  - A avaliação é feita em uma escala de **1 a 5 estrelas**, com rótulos:
    - 1: Péssimo
    - 2: Ruim
    - 3: Bom
    - 4: Ótimo
    - 5: Excelente
- **Obrigatoriedade de feedback**:
  - Para avaliações **1** ou **2 estrelas**, é obrigatório preencher um comentário explicando o motivo da insatisfação.
  - Para avaliações **3, 4 ou 5 estrelas**, o comentário é opcional.
  - Essa regra é aplicada tanto na interface (Web/Mobile) quanto no backend, impedindo que avaliações baixas sejam registradas sem justificativa.
- **Segurança e permissões**:
  - O backend valida se o usuário autenticado é o **solicitante do chamado** antes de aceitar a avaliação ou tentativa de reabertura.
  - Atualizações diretas na API que tentem avaliar chamados de outros usuários são rejeitadas com erro de permissão.

## 6. Controle de Acesso e Visualização

Reforçamos as regras de visibilidade e acesso para perfis específicos, garantindo uma interface mais limpa e segura.

### Filtro "Meus Chamados"
- **Clientes**: O botão de filtro "Meus Chamados" foi completamente removido da interface (Web e Mobile). Clientes visualizam, por padrão e exclusivamente, seus próprios chamados.
- **Backend**: O sistema garante que usuários com perfil "Cliente" só tenham acesso aos chamados criados por eles, independente dos parâmetros de filtro enviados.

### Seção de Avaliação
- **Visibilidade Restrita**: A funcionalidade e os componentes visuais de avaliação (botões, modais, estrelas) são exibidos **apenas** para usuários com perfil de **Administrador** ou **Cliente**.
- **Outros Perfis**: Usuários de Suporte Técnico, Líderes e Analistas **não visualizam** a opção de avaliar chamados, evitando ruídos na interface.
- **Validação de Segurança**: O backend implementa uma verificação estrita que rejeita qualquer tentativa de avaliação vinda de usuários que não sejam Administradores ou Clientes, retornando erro de permissão (403 Forbidden).
