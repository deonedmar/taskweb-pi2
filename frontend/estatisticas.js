// ============================================================
// Página de estatísticas (análise dos dados do usuário)
// ============================================================
const TOKEN = localStorage.getItem('taskweb_token');
if (!TOKEN) {
  window.location.href = 'login.html';
}

const API_BASE_URL = window.TASKWEB_API_URL || 'http://localhost:3000/api';

function fetchAuth(url, options = {}) {
  return fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${TOKEN}`,
      ...(options.headers || {})
    }
  }).then((res) => {
    if (res.status === 401 || res.status === 403) {
      localStorage.removeItem('taskweb_token');
      localStorage.removeItem('taskweb_nome');
      window.location.href = 'login.html';
    }
    return res;
  });
}

document.getElementById('btn-sair').addEventListener('click', () => {
  localStorage.removeItem('taskweb_token');
  localStorage.removeItem('taskweb_nome');
  window.location.href = 'login.html';
});

// ---------- utilidades ----------
const DIA_MS = 24 * 60 * 60 * 1000;
const formatadorDiaSP = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' });

function diaEmSaoPaulo(data) { return formatadorDiaSP.format(data); }

function ultimosDiasSP(quantidade) {
  const agora = Date.now();
  const dias = [];
  for (let i = quantidade - 1; i >= 0; i--) dias.push(diaEmSaoPaulo(new Date(agora - i * DIA_MS)));
  return dias;
}

function rotuloDia(diaISO) {
  return new Date(`${diaISO}T12:00:00Z`).toLocaleDateString('pt-BR', {
    weekday: 'short', day: '2-digit', month: '2-digit', timeZone: 'UTC'
  });
}

function formatarDuracao(segundos) {
  if (segundos < 60) return segundos > 0 ? `${segundos} s` : '0 min';
  const minutos = Math.round(segundos / 60);
  const horas = Math.floor(minutos / 60);
  const resto = minutos % 60;
  return horas > 0 ? `${horas} h ${String(resto).padStart(2, '0')} min` : `${minutos} min`;
}

function criar(tag, classe, texto) {
  const el = document.createElement(tag);
  if (classe) el.className = classe;
  if (texto !== undefined) el.textContent = texto;
  return el;
}

// Barra horizontal acessível: rótulo e valor são texto; a barra é só reforço visual.
function preencherBarras(ul, itens) {
  ul.replaceChildren();
  const maximo = Math.max(1, ...itens.map((i) => i.valor));
  itens.forEach((item) => {
    const li = criar('li', 'barra-item');
    const trilho = criar('span', 'barra-trilho');
    trilho.setAttribute('aria-hidden', 'true');
    const preench = criar('span', `barra-preench ${item.classe || ''}`);
    preench.style.width = `${Math.round((item.valor / maximo) * 100)}%`;
    trilho.appendChild(preench);
    li.append(criar('span', 'barra-rotulo', item.rotulo), trilho, criar('span', 'barra-valor', item.texto));
    ul.appendChild(li);
  });
}

function definirTexto(id, texto) { document.getElementById(id).textContent = texto; }

// ---------- renderização ----------
function renderizarTarefas(tarefas) {
  const total = tarefas.length;
  const contar = (campo, valor) => tarefas.filter((t) => t[campo] === valor).length;
  const pct = (n) => (total ? Math.round((n / total) * 100) : 0);

  const concluidas = contar('status', 'concluida');
  const pendentes = contar('status', 'pendente');
  const atrasadas = contar('status', 'atrasada');

  definirTexto('stat-total', String(total));
  definirTexto('stat-total-nota', `${pendentes} pendentes · ${atrasadas} atrasadas`);
  definirTexto('stat-taxa', `${pct(concluidas)}%`);
  definirTexto('stat-taxa-nota', `${concluidas} de ${total} concluídas`);

  preencherBarras(document.getElementById('barras-status'), [
    { rotulo: 'Concluídas', valor: concluidas, classe: 'concluida', texto: `${concluidas} (${pct(concluidas)}%)` },
    { rotulo: 'Pendentes', valor: pendentes, classe: 'pendente', texto: `${pendentes} (${pct(pendentes)}%)` },
    { rotulo: 'Atrasadas', valor: atrasadas, classe: 'atrasada', texto: `${atrasadas} (${pct(atrasadas)}%)` }
  ]);

  const alta = contar('prioridade', 'alta');
  const media = contar('prioridade', 'media');
  const baixa = contar('prioridade', 'baixa');
  preencherBarras(document.getElementById('barras-prioridade'), [
    { rotulo: 'Alta', valor: alta, classe: 'alta', texto: `${alta} (${pct(alta)}%)` },
    { rotulo: 'Média', valor: media, classe: 'media', texto: `${media} (${pct(media)}%)` },
    { rotulo: 'Baixa', valor: baixa, classe: 'baixa', texto: `${baixa} (${pct(baixa)}%)` }
  ]);

  const dias = ultimosDiasSP(7);
  const porDia = Object.fromEntries(dias.map((d) => [d, 0]));
  tarefas.filter((t) => t.status === 'concluida' && t.atualizado_em).forEach((t) => {
    const dia = diaEmSaoPaulo(new Date(t.atualizado_em));
    if (dia in porDia) porDia[dia] += 1;
  });
  preencherBarras(document.getElementById('barras-concluidas-dia'), dias.map((d) => ({
    rotulo: rotuloDia(d), valor: porDia[d], classe: 'concluida',
    texto: `${porDia[d]} ${porDia[d] === 1 ? 'tarefa' : 'tarefas'}`
  })));

  // próximos prazos
  const hoje = diaEmSaoPaulo(new Date());
  const hojeMs = Date.parse(`${hoje}T00:00:00Z`);
  const proximos = tarefas
    .filter((t) => t.status === 'pendente' && t.prazo)
    .map((t) => ({ t, dia: String(t.prazo).slice(0, 10) }))
    .map((x) => ({ ...x, diff: Math.round((Date.parse(`${x.dia}T00:00:00Z`) - hojeMs) / DIA_MS) }))
    .filter((x) => x.diff >= 0 && x.diff <= 7)
    .sort((a, b) => a.diff - b.diff);

  const lista = document.getElementById('lista-prazos');
  lista.replaceChildren();
  document.getElementById('vazio-prazos').hidden = proximos.length > 0;
  proximos.forEach(({ t, dia, diff }) => {
    const quando = diff === 0 ? 'hoje' : diff === 1 ? 'amanhã' : `em ${diff} dias`;
    const [, mes, d] = dia.split('-');
    const li = criar('li');
    li.append(criar('span', '', t.titulo), criar('strong', '', `${d}/${mes} (${quando})`));
    lista.appendChild(li);
  });
}

function renderizarFoco(resumo) {
  definirTexto('stat-foco', formatarDuracao(resumo.total_segundos));
  definirTexto('stat-foco-nota', 'somando todas as sessões');
  definirTexto('stat-sessoes', String(resumo.total_sessoes));
  definirTexto('stat-sessoes-nota', `${resumo.sessoes_completas} concluídas até o fim`);

  preencherBarras(document.getElementById('barras-foco-dia'), resumo.por_dia.map((d) => ({
    rotulo: rotuloDia(d.dia), valor: d.segundos, classe: 'foco', texto: formatarDuracao(d.segundos)
  })));

  const lista = document.getElementById('lista-top');
  lista.replaceChildren();
  document.getElementById('vazio-top').hidden = resumo.por_tarefa.length > 0;
  resumo.por_tarefa.forEach((item) => {
    const li = criar('li');
    li.append(
      criar('span', '', item.titulo),
      criar('strong', '', `${formatarDuracao(item.segundos)} · ${item.sessoes} ${item.sessoes === 1 ? 'sessão' : 'sessões'}`)
    );
    lista.appendChild(li);
  });
}

function resumoVazio() {
  return { total_segundos: 0, total_sessoes: 0, sessoes_completas: 0, por_tarefa: [],
    por_dia: ultimosDiasSP(7).map((dia) => ({ dia, segundos: 0 })) };
}

// ---------- carregamento ----------
async function carregar() {
  const estado = document.getElementById('estado');
  const [respTarefas, respFoco] = await Promise.allSettled([
    fetchAuth(`${API_BASE_URL}/api/tarefas`).then((r) => (r.ok ? r.json() : Promise.reject(new Error('tarefas')))),
    fetchAuth(`${API_BASE_URL}/api/sessoes/resumo`).then((r) => (r.ok ? r.json() : Promise.reject(new Error('foco'))))
  ]);

  if (respTarefas.status !== 'fulfilled') {
    estado.textContent = 'Não foi possível carregar as estatísticas. Tente novamente em instantes.';
    estado.setAttribute('role', 'alert');
    return;
  }

  renderizarTarefas(respTarefas.value);

  if (respFoco.status === 'fulfilled') {
    renderizarFoco(respFoco.value);
  } else {
    renderizarFoco(resumoVazio());
    const aviso = document.getElementById('aviso-foco');
    aviso.textContent = 'Os dados de tempo de foco não puderam ser carregados agora. As demais estatísticas estão atualizadas.';
    aviso.hidden = false;
  }

  document.getElementById('conteudo').hidden = false;
  estado.textContent = 'Estatísticas carregadas.';
  estado.classList.add('sr-only');
}

carregar();
