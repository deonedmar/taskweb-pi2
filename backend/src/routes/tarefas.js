const express = require('express');
const {
  listarTarefas,
  criarTarefa,
  atualizarTarefa,
  excluirTarefa
} = require('../controllers/tarefasController');

const router = express.Router();

router.get('/tarefas', listarTarefas);
router.post('/tarefas', criarTarefa);
router.put('/tarefas/:id', atualizarTarefa);
router.delete('/tarefas/:id', excluirTarefa);

module.exports = router;
