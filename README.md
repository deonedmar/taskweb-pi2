# TaskWeb - PI1 (UNIVESP) 

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

# TaskWeb - PI2 (UNIVESP) Atualizado dia 08/09/2026

Sistema web para gerenciamento de tarefas academicas com autenticacao de usuarios, dashboard em HTML/CSS/JS e API REST em Node.js + Express + MySQL.

## Estrutura do projeto

```
taskweb-pi2/
+-- index.html
+-- frontend/
|   +-- index.html
|   +-- styles.css
|   +-- app.js
|   +-- login.html
|   +-- registro.html
|   +-- auth.css
|   +-- auth.js
+-- backend/
|   +-- src/
|   |   +-- app.js
|   |   +-- server.js
|   |   +-- config/db.js
|   |   +-- controllers/tarefasController.js
|   |   +-- controllers/authController.js
|   |   +-- middleware/autenticar.js
|   |   +-- routes/tarefas.js
|   |   +-- routes/auth.js
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

Execute os scripts abaixo no MySQL Workbench, nesta ordem:

1. `backend/sql/schema.sql`
2. `backend/sql/migrations/002_add_usuarios.sql`

O schema cria:

- Banco `taskweb`
- Tabela `tarefas`

A migration cria:

- Tabela `usuarios`
- Coluna `usuario_id` na tabela `tarefas` (chave estrangeira)

Campos da tabela `usuarios`:

- `id`
- `nome`
- `email` (unico)
- `senha_hash`
- `criado_em`

Campos adicionados a `tarefas`:

- `usuario_id`: vincula cada tarefa ao usuario que a criou

## Como executar o backend

bash
npm install
copy backend\.env.example backend\.env
npm run dev


Ajuste usuario, senha do MySQL e a chave JWT no arquivo `backend/.env`:


PORT=3000
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=sua_senha
DB_NAME=taskweb
JWT_SECRET=sua_chave_secreta


API em:

```
http://localhost:3000
```

## Rotas de autenticacao

- `POST /api/auth/registrar`: cria nova conta de usuario
- `POST /api/auth/login`: autentica usuario e retorna token JWT

Exemplo de corpo para registro:

json
{
  "nome": "Edmar",
  "email": "edmar@email.com",
  "senha": "minhasenha"
}


Exemplo de corpo para login:

json
{
  "email": "edmar@email.com",
  "senha": "minhasenha"
}


Resposta do login:

json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "nome": "Edmar",
  "email": "edmar@email.com"
}


## Rotas de tarefas (autenticadas)

Todas as rotas abaixo exigem o header:


Authorization: Bearer <token>


- `GET /api/tarefas`: lista tarefas do usuario autenticado
- `POST /api/tarefas`: cria tarefa vinculada ao usuario
- `PUT /api/tarefas/:id`: atualiza tarefa/status (somente propria tarefa)
- `DELETE /api/tarefas/:id`: exclui tarefa (somente propria tarefa)

## Como executar o frontend

Abra o projeto com o Live Server/Go Live pela raiz. O arquivo `index.html` da raiz redireciona para:


http://127.0.0.1:5500/frontend/login.html


O fluxo de acesso e:


login.html ou registro.html
                v
  Autenticacao via API
                v
  Token salvo no localStorage
                v
  index.html (dashboard)


O frontend consome a API em:

```
http://localhost:3000/api
```

## Escopo desta entrega

- Sistema de autenticacao com registro e login de usuarios
- Senhas armazenadas com hash seguro via `bcryptjs`
- Autenticacao stateless com tokens JWT (`jsonwebtoken`)
- Middleware de protecao das rotas de tarefas
- Cada usuario visualiza e gerencia apenas suas proprias tarefas
- Telas de login e cadastro com validacao no frontend e no backend
- Nome do usuario exibido dinamicamente no dashboard apos o login
- Botao de logout que encerra a sessao e redireciona para o login
- Backend com CRUD de tarefas vinculado ao usuario autenticado
- Conexao com MySQL via `mysql2`
- Dashboard frontend com cards de resumo, filtros, busca, modal e detalhes da tarefa
- Integração do frontend com a API usando `fetch` autenticado

## Dependencias adicionadas

```json
{
  "bcryptjs": "^2.4.3",
  "jsonwebtoken": "^9.0.2"
}
```

## Observacoes de integração 

- O backend normaliza prioridade e status, aceitando entradas com ou sem acento.
- O frontend permite configurar a URL da API com `window.TASKWEB_API_URL` antes de carregar `app.js`.
- O token JWT expira em 8 horas. Apos a expiracao, o usuario e redirecionado automaticamente para o login.
- O middleware `autenticar.js` valida o token em todas as requisicoes de tarefas e injeta o `usuario_id` na requisicao.
- As rotas de autenticacao (`/api/auth/registrar` e `/api/auth/login`) sao publicas e nao exigem token.
  
