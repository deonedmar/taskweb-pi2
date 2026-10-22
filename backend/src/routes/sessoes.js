const express = require('express');
const { registrarSessao, resumoSessoes } = require('../controllers/sessoesController');

const router = express.Router();

router.post('/sessoes', registrarSessao);
router.get('/sessoes/resumo', resumoSessoes);

module.exports = router;
