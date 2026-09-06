const express = require('express');
const cors = require('cors');
const tarefasRoutes = require('./routes/tarefas');
const authRoutes    = require('./routes/auth');
const autenticar   = require('./middleware/autenticar');

const app = express();

app.use(cors());
app.use(express.json());

// Rotas públicas (não exigem login)
app.use('/api/auth', authRoutes);

// Rotas protegidas (exigem token JWT válido)
app.use('/api', autenticar, tarefasRoutes);

module.exports = app;