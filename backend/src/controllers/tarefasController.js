const pool = require('../config/db');

const prioridadesValidas = ['baixa', 'media', 'alta'];
const statusValidos = ['pendente', 'concluida', 'atrasada'];

function normalizarTexto(valor) {
  if (typeof valor !== 'string') return valor;
  return valor.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
}

function validarTitulo(titulo) {
  if (typeof titulo !== 'string' || !titulo.trim()) return 'O campo titulo é obrigatório.';
  return null;
}

function normalizarDescricao(descricao) {
  if (descricao === undefined || descricao === null) return null;
  if (typeof descricao !== 'string') return null;
  return descricao.trim() || null;
}

function validarPrioridade(prioridade) {
  if (prioridade === undefined) return null;
  if (!prioridadesValidas.includes(normalizarTexto(prioridade))) {
    return 'Prioridade inválida. Use: baixa, média ou alta.';
  }
  return null;
}

function validarStatus(status) {
  if (status === undefined) return null;
  if (!statusValidos.includes(normalizarTexto(status))) {
    return 'Status inválido. Use: pendente, concluída ou atrasada.';
  }
  return null;
}

function validarPrazo(prazo) {
  if (prazo === undefined || prazo === null || prazo === '') return null;
  const data = new Date(prazo);
  if (Number.isNaN(data.getTime())) return 'Prazo inválido. Use o formato YYYY-MM-DD.';
  return null;
}

// "Hoje" sempre no fuso de São Paulo (o servidor e o banco rodam em UTC,
// que já vira o dia seguinte a partir das 21h no Brasil).
function hojeEmSaoPaulo() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date());
}

function formatarDataISO(prazo) {
  if (prazo instanceof Date) {
    const ano = prazo.getFullYear();
    const mes = String(prazo.getMonth() + 1).padStart(2, '0');
    const dia = String(prazo.getDate()).padStart(2, '0');
    return `${ano}-${mes}-${dia}`;
  }
  return String(prazo).slice(0, 10);
}

function prazoEstaAtrasado(prazo) {
  if (!prazo) return false;
  return formatarDataISO(prazo) < hojeEmSaoPaulo();
}

function aplicarStatusPorPrazo(status, prazo) {
  if (status === 'concluida') return status;
  if (prazoEstaAtrasado(prazo)) return 'atrasada';
  if (status === 'atrasada') return 'pendente';
  return status;
}

function parseId(id) {
  const numero = Number(id);
  if (!Number.isInteger(numero) || numero <= 0) return null;
  return numero;
}

async function atualizarTarefasAtrasadas(usuarioId) {
  const hoje = hojeEmSaoPaulo();

  await pool.query(`
    UPDATE tarefas
    SET status = 'atrasada'
    WHERE status <> 'concluida'
      AND prazo IS NOT NULL
      AND prazo < ?
      AND usuario_id = ?
  `, [hoje, usuarioId]);

  // Desfaz marcações indevidas (ex.: prazo é hoje, mas estava como atrasada)
  await pool.query(`
    UPDATE tarefas
    SET status = 'pendente'
    WHERE status = 'atrasada'
      AND (prazo IS NULL OR prazo >= ?)
      AND usuario_id = ?
  `, [hoje, usuarioId]);
}

async function listarTarefas(req, res) {
  const usuarioId = req.usuario.id;
  try {
    await atualizarTarefasAtrasadas(usuarioId);
    const [rows] = await pool.query(
      'SELECT * FROM tarefas WHERE usuario_id = ? ORDER BY prazo ASC, id DESC',
      [usuarioId]
    );
    return res.json(rows);
  } catch (error) {
    return res.status(500).json({ erro: 'Erro ao listar tarefas.', detalhe: error.message });
  }
}

async function criarTarefa(req, res) {
  const usuarioId = req.usuario.id;
  const { titulo, descricao = null, prioridade = 'baixa', prazo = null, status = 'pendente' } = req.body;

  const erroTitulo     = validarTitulo(titulo);
  const erroPrioridade = validarPrioridade(prioridade);
  const erroStatus     = validarStatus(status);
  const erroPrazo      = validarPrazo(prazo);

  if (erroTitulo || erroPrioridade || erroStatus || erroPrazo) {
    return res.status(400).json({ erro: erroTitulo || erroPrioridade || erroStatus || erroPrazo });
  }

  const prioridadeNormalizada = normalizarTexto(prioridade);
  const statusNormalizado = aplicarStatusPorPrazo(normalizarTexto(status), prazo);

  try {
    const [result] = await pool.query(
      'INSERT INTO tarefas (titulo, descricao, prioridade, prazo, status, usuario_id) VALUES (?, ?, ?, ?, ?, ?)',
      [titulo.trim(), normalizarDescricao(descricao), prioridadeNormalizada, prazo || null, statusNormalizado, usuarioId]
    );
    const [novaTarefa] = await pool.query('SELECT * FROM tarefas WHERE id = ?', [result.insertId]);
    return res.status(201).json(novaTarefa[0]);
  } catch (error) {
    return res.status(500).json({ erro: 'Erro ao criar tarefa.', detalhe: error.message });
  }
}

async function atualizarTarefa(req, res) {
  const usuarioId = req.usuario.id;
  const id = parseId(req.params.id);
  if (!id) return res.status(400).json({ erro: 'ID inválido.' });

  const { titulo, descricao, prioridade, prazo, status } = req.body;
  const semCampos = [titulo, descricao, prioridade, prazo, status].every((campo) => campo === undefined);
  if (semCampos) return res.status(400).json({ erro: 'Envie ao menos um campo para atualização.' });

  const erroTitulo     = titulo     !== undefined ? validarTitulo(titulo) : null;
  const erroPrioridade = validarPrioridade(prioridade);
  const erroStatus     = validarStatus(status);
  const erroPrazo      = validarPrazo(prazo);

  if (erroTitulo || erroPrioridade || erroStatus || erroPrazo) {
    return res.status(400).json({ erro: erroTitulo || erroPrioridade || erroStatus || erroPrazo });
  }

  try {
    const [tarefaAtual] = await pool.query(
      'SELECT * FROM tarefas WHERE id = ? AND usuario_id = ?',
      [id, usuarioId]
    );
    if (tarefaAtual.length === 0) return res.status(404).json({ erro: 'Tarefa não encontrada.' });

    const tarefa = tarefaAtual[0];
    const tarefaAtualizada = {
      titulo:     titulo     !== undefined ? titulo.trim()                 : tarefa.titulo,
      descricao:  descricao  !== undefined ? normalizarDescricao(descricao) : tarefa.descricao,
      prioridade: prioridade !== undefined ? normalizarTexto(prioridade)    : tarefa.prioridade,
      prazo:      prazo      !== undefined ? prazo                          : tarefa.prazo,
      status:     status     !== undefined ? normalizarTexto(status)        : tarefa.status
    };
    tarefaAtualizada.status = aplicarStatusPorPrazo(tarefaAtualizada.status, tarefaAtualizada.prazo);

    await pool.query(
      'UPDATE tarefas SET titulo = ?, descricao = ?, prioridade = ?, prazo = ?, status = ? WHERE id = ? AND usuario_id = ?',
      [tarefaAtualizada.titulo, tarefaAtualizada.descricao, tarefaAtualizada.prioridade,
       tarefaAtualizada.prazo, tarefaAtualizada.status, id, usuarioId]
    );

    const [resultado] = await pool.query('SELECT * FROM tarefas WHERE id = ?', [id]);
    return res.json(resultado[0]);
  } catch (error) {
    return res.status(500).json({ erro: 'Erro ao atualizar tarefa.', detalhe: error.message });
  }
}

async function excluirTarefa(req, res) {
  const usuarioId = req.usuario.id;
  const id = parseId(req.params.id);
  if (!id) return res.status(400).json({ erro: 'ID inválido.' });

  try {
    const [result] = await pool.query(
      'DELETE FROM tarefas WHERE id = ? AND usuario_id = ?',
      [id, usuarioId]
    );
    if (result.affectedRows === 0) return res.status(404).json({ erro: 'Tarefa não encontrada.' });
    return res.status(204).send();
  } catch (error) {
    return res.status(500).json({ erro: 'Erro ao excluir tarefa.', detalhe: error.message });
  }
}

module.exports = { listarTarefas, criarTarefa, atualizarTarefa, excluirTarefa };