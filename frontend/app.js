// ============================================================
// Autenticação — verifica token antes de qualquer coisa
// ============================================================
const TOKEN = localStorage.getItem('taskweb_token');
const NOME_USUARIO = localStorage.getItem('taskweb_nome');

if (!TOKEN) {
  window.location.href = 'login.html';
}

// Função central de fetch — envia o token em toda requisição
function fetchAuth(url, options = {}) {
  return fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${TOKEN}`,
      ...(options.headers || {})
    }
  }).then((res) => {
    // Token expirado ou inválido → volta para o login
    if (res.status === 401 || res.status === 403) {
      localStorage.removeItem('taskweb_token');
      localStorage.removeItem('taskweb_nome');
      window.location.href = 'login.html';
    }
    return res;
  });
}

// ============================================================
// Configuração da API (inalterada)
// ============================================================
const API_BASE_URL = window.TASKWEB_API_URL || 'http://localhost:3000/api';
const API_URL = `${API_BASE_URL}/tarefas`;

// ============================================================
// Elementos do DOM (inalterados)
// ============================================================
const modal = document.getElementById('modal');
const form = document.getElementById('form-tarefa');
const lista = document.getElementById('lista-tarefas');
const mensagem = document.getElementById('mensagem');
const busca = document.getElementById('busca');
const ordenacao = document.getElementById('ordenacao');
const filtros = document.querySelectorAll('.filtros button');
const modalTitulo = document.getElementById('modal-titulo');
const modalDetalhes = document.getElementById('modal-detalhes');
const detalhesTitulo = document.getElementById('detalhes-titulo');
const detalhesMeta = document.getElementById('detalhes-meta');
const detalhesTexto = document.getElementById('detalhes-texto');
const btnSalvarTarefa = document.getElementById('btn-salvar-tarefa');

// ============================================================
// Exibe o nome do usuário logado
// ============================================================
const saudacao = document.getElementById('saudacao');
if (saudacao && NOME_USUARIO) {
  const primeiroNome = NOME_USUARIO.trim().split(' ')[0];
  saudacao.textContent = `Olá, ${primeiroNome} 👋`;
}

// ============================================================
// Logout
// ============================================================
function logout() {
  localStorage.removeItem('taskweb_token');
  localStorage.removeItem('taskweb_nome');
  window.location.href = 'login.html';
}

document.getElementById('btn-sair').addEventListener('click', logout);

// ============================================================
// Estado da aplicação (inalterado)
// ============================================================
let tarefas = [];
let filtroAtual = 'todas';
let ordenacaoAtual = 'titulo';
let tarefaEmEdicaoId = null;

// ============================================================
// Funções utilitárias (inalteradas)
// ============================================================
function obterDataAtualInput() {
  const hoje = new Date();
  const ano = hoje.getFullYear();
  const mes = String(hoje.getMonth() + 1).padStart(2, '0');
  const dia = String(hoje.getDate()).padStart(2, '0');
  return `${ano}-${mes}-${dia}`;
}

function preencherFormularioNovaTarefa() {
  form.reset();
  document.getElementById('prazo').value = obterDataAtualInput();
  document.getElementById('prioridade').value = 'baixa';
}

function abrirModal(tarefa = null) {
  tarefaEmEdicaoId = tarefa ? tarefa.id : null;
  modalTitulo.textContent = tarefa ? 'Editar Tarefa' : 'Nova Tarefa';
  btnSalvarTarefa.textContent = tarefa ? 'Salvar alterações' : 'Criar tarefa';

  if (tarefa) {
    document.getElementById('titulo').value = tarefa.titulo;
    document.getElementById('descricao').value = tarefa.descricao || '';
    document.getElementById('prazo').value = formatarDataParaInput(tarefa.prazo);
    document.getElementById('prioridade').value = tarefa.prioridade;
  } else {
    preencherFormularioNovaTarefa();
  }

  modal.classList.add('show');
  modal.setAttribute('aria-hidden', 'false');
  document.getElementById('titulo').focus();
}

function fecharModal() {
  modal.classList.remove('show');
  modal.setAttribute('aria-hidden', 'true');
  tarefaEmEdicaoId = null;
  modalTitulo.textContent = 'Nova Tarefa';
  btnSalvarTarefa.textContent = 'Criar tarefa';
  form.reset();
}

function abrirDetalhes(tarefa) {
  detalhesTitulo.textContent = tarefa.titulo;
  detalhesMeta.textContent = `Criada em: ${formatarData(tarefa.criado_em)} | Prioridade: ${traduzirPrioridade(tarefa.prioridade)} | Prazo: ${formatarData(tarefa.prazo)} | Status: ${traduzirStatus(tarefa.status)}`;
  detalhesTexto.textContent = tarefa.descricao || 'Esta tarefa não possui descrição.';
  modalDetalhes.classList.add('show');
  modalDetalhes.setAttribute('aria-hidden', 'false');
}

function fecharDetalhes() {
  modalDetalhes.classList.remove('show');
  modalDetalhes.setAttribute('aria-hidden', 'true');
}

function traduzirPrioridade(prioridade) {
  const nomes = { baixa: 'Baixa', media: 'Média', alta: 'Alta' };
  return nomes[prioridade] || prioridade;
}

function traduzirStatus(status) {
  const nomes = { pendente: 'Pendente', concluida: 'Concluída', atrasada: 'Atrasada' };
  return nomes[status] || status;
}

function formatarData(data) {
  if (!data) return '-';
  return new Date(data).toLocaleDateString('pt-BR', { timeZone: 'UTC' });
}

function formatarDataParaInput(data) {
  if (!data) return '';
  return new Date(data).toISOString().slice(0, 10);
}

function criarCelula(texto) {
  const td = document.createElement('td');
  td.textContent = texto;
  return td;
}

function criarCelulaDetalhes(tarefa) {
  const td = document.createElement('td');
  const botao = document.createElement('button');
  botao.className = 'detalhes-btn';
  botao.type = 'button';
  botao.textContent = 'ℹ';
  botao.title = 'Ver detalhes da tarefa';
  botao.addEventListener('click', () => abrirDetalhes(tarefa));
  td.appendChild(botao);
  return td;
}

function criarBadge(texto, classe, tipo) {
  const span = document.createElement('span');
  span.className = `${tipo} ${classe}`;
  span.textContent = texto;
  return span;
}

function obterDataOrdenavel(data) {
  if (!data) return null;
  return new Date(data).toISOString().slice(0, 10);
}

function compararTexto(a, b) {
  return String(a || '').localeCompare(String(b || ''), 'pt-BR', { sensitivity: 'base' });
}

function compararData(a, b, campo) {
  const dataA = obterDataOrdenavel(a[campo]);
  const dataB = obterDataOrdenavel(b[campo]);
  if (!dataA && !dataB) return 0;
  if (!dataA) return 1;
  if (!dataB) return -1;
  return dataA.localeCompare(dataB);
}

function compararPrioridade(a, b) {
  const pesos = { alta: 3, media: 2, baixa: 1 };
  return (pesos[b.prioridade] || 0) - (pesos[a.prioridade] || 0);
}

function compararStatus(a, b) {
  const pesos = { atrasada: 3, pendente: 2, concluida: 1 };
  return (pesos[b.status] || 0) - (pesos[a.status] || 0);
}

function compararPorCampo(a, b, campo) {
  if (campo === 'titulo')    return compararTexto(a.titulo, b.titulo);
  if (campo === 'prioridade') return compararPrioridade(a, b);
  if (campo === 'criado_em' || campo === 'prazo') return compararData(a, b, campo);
  if (campo === 'status')    return compararStatus(a, b);
  return 0;
}

function ordenarTarefas(lista) {
  const criteriosPadrao = ['titulo', 'prioridade', 'criado_em', 'prazo', 'status'];
  const criterios = [ordenacaoAtual, ...criteriosPadrao.filter((c) => c !== ordenacaoAtual)];
  return [...lista].sort((a, b) => {
    for (const criterio of criterios) {
      const resultado = compararPorCampo(a, b, criterio);
      if (resultado !== 0) return resultado;
    }
    return Number(a.id || 0) - Number(b.id || 0);
  });
}

function atualizarResumo() {
  const concluidas = tarefas.filter((t) => t.status === 'concluida').length;
  const atrasadas  = tarefas.filter((t) => t.status === 'atrasada').length;
  const andamento  = tarefas.filter((t) => t.status === 'pendente').length;
  document.getElementById('concluidas').textContent = concluidas;
  document.getElementById('andamento').textContent  = andamento;
  document.getElementById('atrasadas').textContent  = atrasadas;
}

function filtrarTarefas() {
  const termo = busca.value.trim().toLowerCase();
  return tarefas.filter((tarefa) => {
    const passaFiltro = filtroAtual === 'todas' || tarefa.status === filtroAtual;
    const passaBusca  = !termo || tarefa.titulo.toLowerCase().includes(termo);
    return passaFiltro && passaBusca;
  });
}

function renderizar() {
  lista.innerHTML = '';
  mensagem.textContent = '';
  atualizarResumo();

  const tarefasFiltradas = ordenarTarefas(filtrarTarefas());
  if (tarefasFiltradas.length === 0) {
    mensagem.textContent = 'Nenhuma tarefa encontrada.';
    return;
  }

  tarefasFiltradas.forEach((tarefa) => {
    const tr = document.createElement('tr');

    const prioridade = document.createElement('td');
    prioridade.appendChild(criarBadge(traduzirPrioridade(tarefa.prioridade), tarefa.prioridade, 'prioridade'));

    const status = document.createElement('td');
    status.appendChild(criarBadge(traduzirStatus(tarefa.status), tarefa.status, 'badge'));

    const acao = document.createElement('td');
    const botoes = document.createElement('div');
    botoes.className = 'acao';

    const concluir = document.createElement('button');
    const tarefaConcluida = tarefa.status === 'concluida';
    concluir.className = tarefaConcluida ? 'desmarcar' : 'concluir';
    concluir.type = 'button';
    concluir.textContent = tarefaConcluida ? '↩' : '✓';
    concluir.title = tarefaConcluida ? 'Desmarcar conclusão' : 'Marcar como concluída';
    concluir.addEventListener('click', () => alternarConclusao(tarefa));

    const editar = document.createElement('button');
    editar.className = 'editar';
    editar.type = 'button';
    editar.textContent = '✎';
    editar.title = 'Editar tarefa';
    editar.addEventListener('click', () => abrirModal(tarefa));

    const excluir = document.createElement('button');
    excluir.className = 'excluir';
    excluir.type = 'button';
    excluir.textContent = '🗑';
    excluir.title = 'Excluir tarefa';
    excluir.addEventListener('click', () => excluirTarefa(tarefa));

    botoes.append(concluir, editar, excluir);
    acao.appendChild(botoes);

    tr.append(
      criarCelula(tarefa.titulo),
      prioridade,
      criarCelula(formatarData(tarefa.criado_em)),
      criarCelula(formatarData(tarefa.prazo)),
      status,
      criarCelulaDetalhes(tarefa),
      acao
    );

    lista.appendChild(tr);
  });
}

// ============================================================
// Operações de API — agora usam fetchAuth
// ============================================================
async function carregarTarefas() {
  try {
    const response = await fetchAuth(API_URL);
    if (!response || !response.ok) throw new Error('Falha ao carregar tarefas');
    tarefas = await response.json();
    renderizar();
  } catch (error) {
    mensagem.textContent = `Erro ao carregar tarefas: ${error.message}`;
  }
}

async function salvarTarefa(event) {
  event.preventDefault();

  const tarefaAtual = tarefas.find((t) => t.id === tarefaEmEdicaoId);
  const payload = {
    titulo:    document.getElementById('titulo').value,
    descricao: document.getElementById('descricao').value,
    prioridade: document.getElementById('prioridade').value,
    prazo:     document.getElementById('prazo').value || null,
    status:    tarefaAtual ? tarefaAtual.status : 'pendente'
  };

  const url    = tarefaEmEdicaoId ? `${API_URL}/${tarefaEmEdicaoId}` : API_URL;
  const metodo = tarefaEmEdicaoId ? 'PUT' : 'POST';

  const response = await fetchAuth(url, { method: metodo, body: JSON.stringify(payload) });
  if (!response || !response.ok) {
    const erro = await response.json();
    alert(erro.erro || 'Não foi possível cadastrar a tarefa.');
    return;
  }

  fecharModal();
  await carregarTarefas();
}

async function alternarConclusao(tarefa) {
  const novoStatus = tarefa.status === 'concluida' ? 'pendente' : 'concluida';
  const response = await fetchAuth(`${API_URL}/${tarefa.id}`, {
    method: 'PUT',
    body: JSON.stringify({ status: novoStatus })
  });
  if (!response || !response.ok) { alert('Não foi possível atualizar o status.'); return; }
  await carregarTarefas();
}

async function excluirTarefa(tarefa) {
  const confirmouExclusao = window.confirm(
    `Deseja realmente excluir a tarefa "${tarefa.titulo}"?\n\nEssa ação não poderá ser desfeita.`
  );
  if (!confirmouExclusao) return;

  const response = await fetchAuth(`${API_URL}/${tarefa.id}`, { method: 'DELETE' });
  if (!response || !response.ok) { alert('Não foi possível excluir a tarefa.'); return; }
  await carregarTarefas();
}

// ============================================================
// Event listeners (inalterados)
// ============================================================
document.getElementById('btn-nova-tarefa').addEventListener('click', () => abrirModal());
document.getElementById('btn-cancelar').addEventListener('click', fecharModal);
document.getElementById('btn-fechar-detalhes').addEventListener('click', fecharDetalhes);
form.addEventListener('submit', salvarTarefa);
busca.addEventListener('input', renderizar);
ordenacao.addEventListener('change', () => { ordenacaoAtual = ordenacao.value; renderizar(); });

filtros.forEach((botao) => {
  botao.addEventListener('click', () => {
    filtros.forEach((item) => item.classList.remove('ativo'));
    botao.classList.add('ativo');
    filtroAtual = botao.dataset.filtro;
    renderizar();
  });
});

modal.addEventListener('click', (event) => { if (event.target === modal) fecharModal(); });
modalDetalhes.addEventListener('click', (event) => { if (event.target === modalDetalhes) fecharDetalhes(); });

carregarTarefas();