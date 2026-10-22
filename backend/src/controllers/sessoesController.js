const pool = require('../config/db');

const LIMITE_SEGUNDOS = 4 * 60 * 60; // uma sessão de foco não passa de 4 horas
const DIA_MS = 24 * 60 * 60 * 1000;

// Cria a tabela na primeira chamada (e só tenta de novo se falhar).
let tabelaPronta = null;
function garantirTabela() {
  if (!tabelaPronta) {
    tabelaPronta = pool.query(`
      CREATE TABLE IF NOT EXISTS sessoes_foco (
        id INT AUTO_INCREMENT PRIMARY KEY,
        usuario_id INT NOT NULL,
        tarefa_id INT NULL,
        titulo_tarefa VARCHAR(255) NULL,
        duracao_segundos INT NOT NULL,
        completou TINYINT(1) NOT NULL DEFAULT 0,
        criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_sessoes_usuario_data (usuario_id, criado_em)
      )
    `).catch((erro) => {
      tabelaPronta = null;
      throw erro;
    });
  }
  return tabelaPronta;
}

// Dia (AAAA-MM-DD) no fuso de São Paulo. O servidor roda em UTC.
function diaEmSaoPaulo(data) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(data);
}

function ultimosDias(quantidade) {
  const agora = Date.now();
  const dias = [];
  for (let i = quantidade - 1; i >= 0; i--) {
    dias.push(diaEmSaoPaulo(new Date(agora - i * DIA_MS)));
  }
  return dias;
}

async function registrarSessao(req, res) {
  const usuarioId = req.usuario.id;
  const { tarefa_id, titulo_tarefa, duracao_segundos, completou } = req.body || {};

  const duracao = Number(duracao_segundos);
  if (!Number.isInteger(duracao) || duracao < 1 || duracao > LIMITE_SEGUNDOS) {
    return res.status(400).json({ erro: 'Duração inválida.' });
  }

  let tarefaId = null;
  let titulo = typeof titulo_tarefa === 'string' && titulo_tarefa.trim()
    ? titulo_tarefa.trim().slice(0, 255)
    : null;

  try {
    await garantirTabela();

    if (tarefa_id !== undefined && tarefa_id !== null) {
      if (!Number.isInteger(Number(tarefa_id))) {
        return res.status(400).json({ erro: 'Tarefa inválida.' });
      }
      // A tarefa precisa ser do próprio usuário
      const [linhas] = await pool.query(
        'SELECT id, titulo FROM tarefas WHERE id = ? AND usuario_id = ?',
        [Number(tarefa_id), usuarioId]
      );
      if (linhas.length === 0) {
        return res.status(404).json({ erro: 'Tarefa não encontrada.' });
      }
      tarefaId = linhas[0].id;
      titulo = linhas[0].titulo;
    }

    await pool.query(
      `INSERT INTO sessoes_foco (usuario_id, tarefa_id, titulo_tarefa, duracao_segundos, completou)
       VALUES (?, ?, ?, ?, ?)`,
      [usuarioId, tarefaId, titulo, duracao, completou ? 1 : 0]
    );
    return res.status(201).json({ mensagem: 'Sessão registrada.' });
  } catch (error) {
    console.error('Erro ao registrar sessão de foco:', error);
    return res.status(500).json({ erro: 'Não foi possível registrar a sessão.' });
  }
}

async function resumoSessoes(req, res) {
  const usuarioId = req.usuario.id;

  try {
    await garantirTabela();

    const [[totais]] = await pool.query(
      `SELECT COALESCE(SUM(duracao_segundos), 0) AS total_segundos,
              COUNT(*) AS total_sessoes,
              COALESCE(SUM(completou), 0) AS sessoes_completas
       FROM sessoes_foco WHERE usuario_id = ?`,
      [usuarioId]
    );

    const [recentes] = await pool.query(
      'SELECT duracao_segundos, criado_em FROM sessoes_foco WHERE usuario_id = ? AND criado_em >= ?',
      [usuarioId, new Date(Date.now() - 8 * DIA_MS)]
    );

    const porDia = ultimosDias(7).map((dia) => ({ dia, segundos: 0 }));
    recentes.forEach((sessao) => {
      const dia = diaEmSaoPaulo(new Date(sessao.criado_em));
      const alvo = porDia.find((item) => item.dia === dia);
      if (alvo) alvo.segundos += Number(sessao.duracao_segundos);
    });

    const [porTarefa] = await pool.query(
      `SELECT titulo_tarefa AS titulo, SUM(duracao_segundos) AS segundos, COUNT(*) AS sessoes
       FROM sessoes_foco WHERE usuario_id = ?
       GROUP BY tarefa_id, titulo_tarefa
       ORDER BY segundos DESC LIMIT 5`,
      [usuarioId]
    );

    return res.json({
      total_segundos: Number(totais.total_segundos),
      total_sessoes: Number(totais.total_sessoes),
      sessoes_completas: Number(totais.sessoes_completas),
      por_dia: porDia,
      por_tarefa: porTarefa.map((linha) => ({
        titulo: linha.titulo || '(tarefa removida)',
        segundos: Number(linha.segundos),
        sessoes: Number(linha.sessoes)
      }))
    });
  } catch (error) {
    console.error('Erro ao montar resumo de sessões:', error);
    return res.status(500).json({ erro: 'Não foi possível carregar o resumo de foco.' });
  }
}

module.exports = { registrarSessao, resumoSessoes, diaEmSaoPaulo };
