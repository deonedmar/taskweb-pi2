# TaskWeb - PI2 (UNIVESP)

Sistema web para gerenciamento de tarefas academicas com dashboard em HTML/CSS/JS e API REST em Node.js + Express + MySQL.

## Estrutura do projeto

```bash
taskweb-pji1/
+-- index.html
+-- frontend/
|   +-- index.html
|   +-- styles.css
|   +-- app.js
+-- backend/
|   +-- src/
|   |   +-- app.js
|   |   +-- server.js
|   |   +-- config/db.js
|   |   +-- controllers/tarefasController.js
|   |   +-- routes/tarefas.js
|   +-- sql/schema.sql
|   +-- sql/migrations/
|   +-- .env.example
+-- package.json
+-- package-lock.json
+-- README.md
```

## Requisitos

- Node.js 18+
- MySQL 8+

## Banco de dados

Execute o script abaixo no MySQL:

- `backend/sql/schema.sql`

Ele cria:

- Banco `taskweb`
- Tabela `tarefas`

Campos principais:

- `id`
- `titulo`
- `descricao`
- `prioridade`: `baixa`, `media` ou `alta`
- `prazo`
- `status`: `pendente`, `concluida` ou `atrasada`

Para bancos criados antes da coluna `descricao`, execute a migracao uma vez:

- `backend/sql/migrations/001_add_descricao_to_tarefas.sql`

## Como executar o backend

```bash
npm install
copy backend\.env.example backend\.env
npm run dev
```

Ajuste usuario e senha do MySQL no arquivo `backend/.env`.

API em:

```text
http://localhost:3000
```

## Rotas

- `GET /api/tarefas`: lista tarefas
- `POST /api/tarefas`: cria tarefa
- `PUT /api/tarefas/:id`: atualiza tarefa/status
- `DELETE /api/tarefas/:id`: exclui tarefa

## Como executar o frontend

Abra o projeto com o Live Server/Go Live pela raiz. O arquivo `index.html` da raiz redireciona para:

```text
http://127.0.0.1:5500/frontend/
```

O frontend consome a API em:

```text
http://localhost:3000/api/tarefas
```

## Escopo desta entrega

- Backend com CRUD de tarefas
- Conexao com MySQL via `mysql2`
- Script SQL para criacao do banco e tabela
- Dashboard frontend com cards de resumo, filtros, busca, modal e detalhes da tarefa
- Integracao do frontend com a API usando `fetch`

## Observacoes de integracao

- O backend normaliza prioridade e status, aceitando entradas com ou sem acento.
- O frontend permite configurar a URL da API com `window.TASKWEB_API_URL` antes de carregar `app.js`.
