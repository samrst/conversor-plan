# Consolidador de Macrodados

Aplicação web estática, 100% client-side, para consolidação de microdados e geração automática de planilhas de **macrodados padronizadas** prontas para dashboards do **SENAI-BA**.

---

## 🎯 Objetivo & Princípio

O sistema é orientado à conversão direta de microdados educacionais em macrodados consolidados:

> **Automático por padrão → Intervenção manual somente quando necessário → Geração do macro.**

---

## 🔒 Segurança e Privacidade de Dados

* **100% Client-Side:** Todo o processamento ocorre em memória no navegador do usuário.
* **Sem Backend / Sem Banco de Dados:** Não requer servidor nem conexão com banco de dados externo.
* **Zero Transmissão:** Nenhum microdado é enviado para servidores externos ou serviços de terceiros.
* **Compatível com Hospedagem Estática:** Pronto para publicação direta no **GitHub Pages**, **Vercel**, **Netlify** ou execução local offline.

---

## 📊 Modelo Suportado: Prova Objetiva

O sistema implementa integralmente todas as regras de negócio da **Prova Objetiva**:

### 1. Identificação de Arquivos e Estrutura de Campos
* **Planilha Principal (`aptos`)** *(Obrigatória)*:
  * Campos esperados: `ESCOLA`, `CURSO`, `TURMADESCRICAO`.
  * Identificação: nome do arquivo contendo `aptos`.
* **Planilha de Matriculados CHP** *(Obrigatória)*:
  * Identificação: nome do arquivo contendo `chp` (ex: `alunos matriculados chp.xlsx`).
  * Campo esperado: `CODTURMA`.
  * Atribuição automática: `Categoria = CHP`.
* **Planilha de Matriculados IFTP** *(Obrigatória)*:
  * Identificação: nome do arquivo contendo `iftp` (ex: `alunos matriculados iftp.xlsx`).
  * Campo esperado: `CODTURMA`.
  * Atribuição automática: `Categoria = IFTP`.
* **Planilha de Participação (`participação`)** *(Opcional)*:
  * Campos esperados: `ESCOLA`, `CURSO`, `TURMADESCRICAO`, `PRESENTES`, `AUSENTES`.
  * Sua ausência é devidamente sinalizada como `ℹ Arquivo opcional não enviado` e não bloqueia a conversão (gera `Presentes = 0`, `Ausentes = 0` e `Percentuais = 0%`).

### 2. Normalização e Associação de Turma (Prefixos T, B, G, SAEP)
* **Remoção de Prefixos:** Os prefixos `T`, `B`, `G` e `SAEP` são removidos (case-insensitive) **estritamente no início do código**.
  * Exemplos: `T1234` &rarr; `1234`, `B1234` &rarr; `1234`, `G1234` &rarr; `1234`, `SAEP1234` &rarr; `1234`, `saep1234` &rarr; `1234`, `1234` &rarr; `1234`.
  * `TURMADESCRICAO` com hífen: obtém a parte anterior ao hífen e remove o prefixo (ex: `G1234 - Matutino` &rarr; `1234`, `SAEP1234 - Lauro de Freitas` &rarr; `1234`).
* **Coluna Final `Turma`:** Exibe **somente o código geral normalizado** (sem os prefixos `T`, `B`, `G` ou `SAEP`).
* **Associação Aptos ↔ Matriculados:** A chave de contagem de alunos matriculados utiliza o código geral normalizado.

### 3. Regra Especial SENAI ITED
* Quando `ESCOLA = SENAI ITED`, a **Unidade Operacional** é extraída da parte posterior ao hífen de `TURMADESCRICAO` (ex: `"SAEP1234 - Lauro de Freitas"` &rarr; `"Lauro de Freitas"`).
* A **Modalidade** é determinada automaticamente:
  * `ESCOLA = SENAI ITED` &rarr; `Semipresencial`
  * `ESCOLA ≠ SENAI ITED` &rarr; `Presencial`

### 4. Mecanismo de Conferência e Mapeamento Manual de Colunas (Definitivo)
* **Sugestão Inicial Automática:** O sistema identifica automaticamente as colunas correspondentes e exibe o status `✓ Automático`.
* **Revisão e Sobrescrita Total:** A identificação automática NÃO é travada. Ao lado de **qualquer associação**, existe a ação `[ Alterar ]` (ou `[ Selecionar coluna ]` para status `⚠ Pendente`).
* **Modal com Todas as Colunas da Planilha de Origem:** Ao clicar em `[ Alterar ]`, o usuário visualiza **todas as colunas disponíveis pertencentes àquela planilha específica**, com prévia de dados da primeira linha.
* **Sobrescrita Definitiva:** O usuário pode escolher qualquer coluna (ex: `CURSO` &rarr; `NOME_CURSO` &rarr; `CODCURSO`). A última seleção manual confirmada (`✓ Manual`) substitui integralmente a automática e passa a ser a fonte oficial utilizada na conversão.

### 5. Consolidação e Cálculo de Alunos
* **Consolidação por Categoria:** A chave lógica de agrupamento inclui a `Categoria`. Duas turmas com mesma escola, curso e código de turma em categorias diferentes (`CHP` e `IFTP`) permanecem como linhas separadas.
* **Alunos:** Contabilizados a partir da base de Matriculados correspondente.
* **Alunos Aptos/Agendados:** Total de registros da base Aptos correspondentes à turma.
* **Alunos Inaptos/Não Agendados:** $\text{Alunos} - \text{Alunos Aptos/Agendados}$.
* **Percentuais de Presença e Ausência:**
  * $\text{Presentes (\%)} = \frac{\text{Presentes}}{\text{Alunos Aptos/Agendados}} \times 100$
  * $\text{Ausentes (\%)} = \frac{\text{Ausentes}}{\text{Alunos Aptos/Agendados}} \times 100$

### 6. Exportação com Máxima Fidelidade ao Modelo Oficial (`modelo final po.xlsx`)
O exportador gera o arquivo `.xlsx` reproduzindo integralmente o modelo visual e estrutural oficial:
* **Banner de Título (Linha 1):** Altura de 82,5 pt, fundo azul institucional (`#2A579A`), tipografia Calibri 48pt e **logomarca SENAI** incorporada via desenho vetorial/imagem.
* **Cabeçalho da Tabela (Linha 2):** 13 colunas com altura de 16,5 pt, fundo azul e texto branco centralizado.
* **Tabela Dinâmica (`Tabela1`):** Estilo oficial `TableStyleMedium9` com suporte a AutoFiltro (`ref="A2:M{N+2}"`) e ordenação nativa do Excel.
* **Linha de Totais Dinâmica:** Fórmulas nativas `=SUBTOTAL(109,Tabela1[...])` (somas) e `=SUBTOTAL(101,Tabela1[...])` (médias de percentuais).
* **Abas Auxiliares Preservadas:** Inclui as abas `Listagem de dados ` e `Associação` conforme a referência oficial.
* **Larguras e Alinhamentos de Coluna:** Dimensões exatas preservadas de A a M.

---

## 📑 Estrutura Final do Macro (13 Colunas Padronizadas)

A planilha final gerada possui **exatamente 13 colunas** na seguinte ordem:

1. `Departamento Regional (DR)` (Valor fixo: `SENAI-BA`)
2. `Unidade operacional (Escola)`
3. `Curso`
4. `Categoria` (`CHP` ou `IFTP`)
5. `Modalidade` (`Presencial` ou `Semipresencial`)
6. `Turma` (código geral normalizado)
7. `Alunos`
8. `Alunos Aptos/Agendados`
9. `Alunos Inaptos/Não Agendados`
10. `Presentes`
11. `Presentes (%)`
12. `Ausentes`
13. `Ausentes (%)`

---

## 🚀 Como Executar Localmente

```bash
# Servidor estático local
python -m http.server 8000
```

Acesse no navegador:
`http://localhost:8000`

---

## 🧪 Testes Automatizados

Para rodar as suítes de validação funcional e fidelidade visual:

```bash
# 1. Teste de Associação e Sobrescrita Manual de Colunas (Casos A, B, C, D)
python test_manual_mapping_flow.py

# 2. Teste Geral de Regras de Negócio e Associação de Turmas
python test_functional_validation.py

# 3. Teste de Fidelidade Estrutural com 'modelo final po.xlsx'
python test_model_fidelity.py
```
