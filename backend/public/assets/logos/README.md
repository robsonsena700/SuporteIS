# Gerenciamento de Logos - SuporteIS

Este diretório contém os ativos de marca (logos) utilizados na aplicação, organizados por plataforma e formato.

## Estrutura de Pastas

*   `/source`: Arquivos originais em alta resolução (upload do usuário).
*   `/web`: Versões otimizadas para uso na interface Web (Desktop/Tablet).
*   `/mobile`: Versões otimizadas para dispositivos móveis (App React Native).

## Especificações Técnicas

### Formatos Suportados
*   **SVG** (Recomendado para vetores)
*   **PNG** (Com fundo transparente)
*   **JPG** (Para fundos sólidos)

### Dimensões Recomendadas

#### Web
*   Tamanho mínimo: 500x500px
*   Proporção: 1:1 (Quadrado) ou 4:3 (Retangular Horizontal)

#### Mobile
As imagens são geradas automaticamente em múltiplas densidades para garantir nitidez em telas Retina/High-DPI:
*   `@1x`: Tamanho base
*   `@2x`: Dobro da resolução
*   `@3x`: Triplo da resolução

## Guia para Administradores

1.  Acesse a área administrativa do sistema.
2.  Navegue até **Configurações > Identidade Visual**.
3.  Faça o upload do arquivo original na seção "Upload de Logo".
    *   O sistema processará automaticamente a imagem e gerará as versões otimizadas.
    *   A versão anterior será arquivada (se houver).

## Mapeamento de Arquivos

| Arquivo | Localização | Uso |
| :--- | :--- | :--- |
| `logo_primary.svg` | `/source` | Arquivo Mestre |
| `logo_web.png` | `/web` | Header do Dashboard Web |
| `logo_mobile.png` | `/mobile` | Tela de Login Mobile |
| `logo_mobile@2x.png` | `/mobile` | Telas de alta densidade |

## Metadados e Auditoria

Todas as alterações de logos são registradas na tabela `audit_logs` do banco de dados, contendo:
*   ID do usuário que realizou a alteração.
*   Data e hora.
*   Nome do arquivo anterior e do novo arquivo.
