// ============================================================
// Cronômetro de foco (estilo Pomodoro) com intervalos
// Depende do app.js: fetchAuth, API_BASE_URL, mostrarToast,
// confirmarAcao, abrirModalAcessivel e fecharModalAcessivel.
// ============================================================
const FOCO_CHAVE_ESTADO = 'taskweb_foco_estado';
const FOCO_CHAVE_PRESET = 'taskweb_foco_preset';
const FOCO_MIN_REGISTRO_MS = 60 * 1000; // foco com menos de 1 min não é registrado
const FOCOS_ATE_PAUSA_LONGA = 4;

const PRESETS_FOCO = {
  pomodoro: { foco: 25, pausa: 5, pausaLonga: 15 },
  longo: { foco: 50, pausa: 10, pausaLonga: 30 },
  curto: { foco: 15, pausa: 3, pausaLonga: 10 }
};
const MODOS_FOCO = ['foco', 'pausa', 'pausa-longa'];
const ROTULOS_MODO = { foco: 'Foco', pausa: 'Pausa curta', 'pausa-longa': 'Pausa longa' };

const painelFoco = document.getElementById('painel-foco');
const focoModoEl = document.getElementById('foco-modo');
const focoTarefaEl = document.getElementById('foco-tarefa');
const focoTempoEl = document.getElementById('foco-tempo');
const focoProgressoEl = document.getElementById('foco-progresso');
const btnFocoPausar = document.getElementById('btn-foco-pausar');
const btnFocoPular = document.getElementById('btn-foco-pular');
const btnFocoParar = document.getElementById('btn-foco-parar');
const btnFocoFalar = document.getElementById('btn-foco-falar');
const anuncioFoco = document.getElementById('anuncio-foco');
const alertaFoco = document.getElementById('alerta-foco');
const modalFoco = document.getElementById('modal-foco');
const focoModalTarefa = document.getElementById('foco-modal-tarefa');
const seletorPreset = document.getElementById('foco-preset');
const btnFocoIniciar = document.getElementById('btn-foco-iniciar');
const btnFocoCancelar = document.getElementById('btn-foco-cancelar');
const tituloOriginalPagina = document.title;

let cronometro = null; // { tarefaId, titulo, preset, modo, ciclo, rodando, fimEm, restanteMs, totalMs }
let focoIntervalo = null;
let tarefaPendenteDeFoco = null;

// ---------- utilidades ----------
function duracaoDoModoMs(preset, modo) {
  const p = PRESETS_FOCO[preset] || PRESETS_FOCO.pomodoro;
  const minutos = modo === 'foco' ? p.foco : modo === 'pausa' ? p.pausa : p.pausaLonga;
  return minutos * 60 * 1000;
}

function formatarTempo(ms) {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const m = String(Math.floor(total / 60)).padStart(2, '0');
  const s = String(total % 60).padStart(2, '0');
  return `${m}:${s}`;
}

function tempoPorExtenso(ms) {
  // mesmo arredondamento (para cima) do relógio na tela, para voz e visual concordarem
  const total = Math.max(0, Math.ceil(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  const partes = [];
  if (m > 0) partes.push(`${m} ${m === 1 ? 'minuto' : 'minutos'}`);
  if (s > 0 || m === 0) partes.push(`${s} ${s === 1 ? 'segundo' : 'segundos'}`);
  return partes.join(' e ');
}

function minutosPorExtenso(ms) {
  const m = Math.round(ms / 60000);
  if (m < 1) return 'menos de 1 minuto';
  return `${m} ${m === 1 ? 'minuto' : 'minutos'}`;
}

function restanteAtualMs() {
  if (!cronometro) return 0;
  return cronometro.rodando ? Math.max(0, cronometro.fimEm - Date.now()) : cronometro.restanteMs;
}

function salvarEstadoFoco() {
  try {
    if (cronometro) localStorage.setItem(FOCO_CHAVE_ESTADO, JSON.stringify(cronometro));
    else localStorage.removeItem(FOCO_CHAVE_ESTADO);
  } catch { /* armazenamento indisponível: segue sem persistir */ }
}

function presetSalvo() {
  try {
    const valor = localStorage.getItem(FOCO_CHAVE_PRESET);
    return PRESETS_FOCO[valor] ? valor : 'pomodoro';
  } catch { return 'pomodoro'; }
}

// ---------- avisos (leitor de tela, som, notificação) ----------
function anunciarFoco(texto) {
  anuncioFoco.textContent = '';
  setTimeout(() => { anuncioFoco.textContent = texto; }, 30);
}

function alertarFoco(texto) {
  alertaFoco.textContent = '';
  setTimeout(() => { alertaFoco.textContent = texto; }, 30);
}

function tocarSom() {
  try {
    const Contexto = window.AudioContext || window.webkitAudioContext;
    if (!Contexto) return;
    const ctx = new Contexto();
    const t0 = ctx.currentTime;
    [660, 880, 660].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const ganho = ctx.createGain();
      const ini = t0 + i * 0.28;
      osc.frequency.value = freq;
      ganho.gain.setValueAtTime(0.0001, ini);
      ganho.gain.exponentialRampToValueAtTime(0.25, ini + 0.03);
      ganho.gain.exponentialRampToValueAtTime(0.0001, ini + 0.24);
      osc.connect(ganho);
      ganho.connect(ctx.destination);
      osc.start(ini);
      osc.stop(ini + 0.26);
    });
    setTimeout(() => ctx.close(), 1500);
  } catch { /* sem áudio: os outros avisos continuam */ }
}

function pedirPermissaoNotificacao() {
  try {
    if ('Notification' in window && Notification.permission === 'default') Notification.requestPermission();
  } catch { /* ignora */ }
}

function notificarSistema(titulo, corpo) {
  try {
    if ('Notification' in window && Notification.permission === 'granted' && document.hidden) {
      new Notification(titulo, { body: corpo });
    }
  } catch { /* ignora */ }
}

// ---------- painel ----------
function atualizarPainelFoco() {
  if (!cronometro) {
    painelFoco.hidden = true;
    document.body.classList.remove('com-painel-foco');
    document.title = tituloOriginalPagina;
    return;
  }

  const restante = restanteAtualMs();
  const pronto = !cronometro.rodando && cronometro.restanteMs === cronometro.totalMs;

  painelFoco.hidden = false;
  document.body.classList.add('com-painel-foco');
  painelFoco.dataset.modo = cronometro.modo;
  focoModoEl.textContent = ROTULOS_MODO[cronometro.modo];
  focoTarefaEl.textContent = cronometro.titulo;
  focoTempoEl.textContent = formatarTempo(restante);
  focoProgressoEl.style.width = `${Math.min(100, Math.round((1 - restante / cronometro.totalMs) * 100))}%`;
  btnFocoPausar.textContent = cronometro.rodando ? 'Pausar' : pronto ? 'Iniciar' : 'Retomar';
  btnFocoPular.textContent = cronometro.modo === 'foco' ? 'Ir para a pausa' : 'Pular pausa';
  document.title = cronometro.rodando
    ? `${formatarTempo(restante)} · ${ROTULOS_MODO[cronometro.modo]} — TaskWeb`
    : tituloOriginalPagina;
}

function tickFoco() {
  if (!cronometro || !cronometro.rodando) return;
  if (Date.now() >= cronometro.fimEm) { finalizarSegmento(true); return; }
  atualizarPainelFoco();
}

function garantirTick() {
  if (focoIntervalo === null) focoIntervalo = setInterval(tickFoco, 250);
}

function pararTick() {
  if (focoIntervalo !== null) { clearInterval(focoIntervalo); focoIntervalo = null; }
}

// ---------- fases do cronômetro ----------
function comecarSegmento(base, rodando) {
  const total = duracaoDoModoMs(base.preset, base.modo);
  cronometro = {
    ...base,
    totalMs: total,
    rodando,
    fimEm: rodando ? Date.now() + total : 0,
    restanteMs: total
  };
  salvarEstadoFoco();
  atualizarPainelFoco();
  if (rodando) garantirTick();
}

async function registrarSessaoFoco(segmento, decorridoMs, completou) {
  const segundos = Math.round(decorridoMs / 1000);
  if (!completou && decorridoMs < FOCO_MIN_REGISTRO_MS) return; // ignora cliques acidentais
  if (segundos < 1) return;
  try {
    await fetchAuth(`${API_BASE_URL}/api/sessoes`, {
      method: 'POST',
      body: JSON.stringify({
        tarefa_id: segmento.tarefaId,
        titulo_tarefa: segmento.titulo,
        duracao_segundos: segundos,
        completou
      })
    });
  } catch { /* sem conexão: a sessão não é registrada, o cronômetro segue normal */ }
}

function avisarMudancaDeFase(modoAnterior, proximoModo, natural, atual) {
  let texto;
  if (modoAnterior === 'foco') {
    const minutos = minutosPorExtenso(duracaoDoModoMs(atual.preset, proximoModo));
    texto = natural
      ? `Foco concluído! Hora da ${ROTULOS_MODO[proximoModo].toLowerCase()} de ${minutos}.`
      : `Foco encerrado antes do fim. ${ROTULOS_MODO[proximoModo]} de ${minutos} iniciada.`;
  } else {
    texto = natural
      ? `A pausa terminou. Pronto para o próximo foco em "${atual.titulo}". Ative o botão Iniciar.`
      : `Pausa pulada. Pronto para o próximo foco em "${atual.titulo}". Ative o botão Iniciar.`;
  }
  mostrarToast(texto, 'info');
  alertarFoco(texto);
  if (natural) {
    tocarSom();
    try { if (navigator.vibrate) navigator.vibrate([200, 100, 200]); } catch { /* ignora */ }
    notificarSistema('TaskWeb', texto);
  }
}

function finalizarSegmento(concluidoNatural) {
  const atual = cronometro;
  if (!atual) return;

  const restante = concluidoNatural ? 0 : restanteAtualMs();
  const decorridoMs = atual.totalMs - restante;
  const base = { tarefaId: atual.tarefaId, titulo: atual.titulo, preset: atual.preset };
  let proximoModo;

  if (atual.modo === 'foco') {
    const ciclo = atual.ciclo + 1;
    proximoModo = ciclo % FOCOS_ATE_PAUSA_LONGA === 0 ? 'pausa-longa' : 'pausa';
    comecarSegmento({ ...base, modo: proximoModo, ciclo }, true); // a pausa começa sozinha
    registrarSessaoFoco(atual, decorridoMs, concluidoNatural);
  } else {
    proximoModo = 'foco';
    comecarSegmento({ ...base, modo: 'foco', ciclo: atual.ciclo }, false); // o próximo foco espera você
  }
  avisarMudancaDeFase(atual.modo, proximoModo, concluidoNatural, atual);
}

function encerrarFoco() {
  const atual = cronometro;
  if (!atual) return;
  const decorridoMs = atual.totalMs - restanteAtualMs();
  if (atual.modo === 'foco') registrarSessaoFoco(atual, decorridoMs, false);
  cronometro = null;
  salvarEstadoFoco();
  pararTick();
  atualizarPainelFoco();
  anunciarFoco('Cronômetro encerrado.');
}

async function pararFoco() {
  if (!cronometro) return;
  const decorridoMs = cronometro.totalMs - restanteAtualMs();
  if (cronometro.modo === 'foco' && decorridoMs >= FOCO_MIN_REGISTRO_MS) {
    const confirmou = await confirmarAcao(
      `Encerrar o foco em "${cronometro.titulo}"? Os ${minutosPorExtenso(decorridoMs)} focados serão registrados.`,
      { titulo: 'Encerrar foco', confirmar: 'Encerrar', cancelar: 'Continuar' }
    );
    if (!confirmou) return;
  }
  encerrarFoco();
}

function alternarPausaFoco() {
  if (!cronometro) return;
  if (cronometro.rodando) {
    cronometro.restanteMs = Math.max(0, cronometro.fimEm - Date.now());
    cronometro.rodando = false;
    anunciarFoco('Cronômetro pausado.');
  } else {
    const pronto = cronometro.restanteMs === cronometro.totalMs;
    cronometro.fimEm = Date.now() + cronometro.restanteMs;
    cronometro.rodando = true;
    garantirTick();
    anunciarFoco(pronto ? `${ROTULOS_MODO[cronometro.modo]} iniciado.` : 'Cronômetro retomado.');
  }
  salvarEstadoFoco();
  atualizarPainelFoco();
}

function falarTempoRestante() {
  if (!cronometro) return;
  const estado = cronometro.rodando ? '' : ' O cronômetro está pausado.';
  anunciarFoco(`Restam ${tempoPorExtenso(restanteAtualMs())} de ${ROTULOS_MODO[cronometro.modo].toLowerCase()}.${estado}`);
}

// ---------- início do foco (janela de escolha do ritmo) ----------
function fecharModalInicioFoco() {
  fecharModalAcessivel(modalFoco);
  tarefaPendenteDeFoco = null;
}

function abrirModalInicioFoco(tarefa) {
  tarefaPendenteDeFoco = tarefa;
  focoModalTarefa.textContent = `Tarefa: ${tarefa.titulo}`;
  seletorPreset.value = presetSalvo();
  abrirModalAcessivel(modalFoco, seletorPreset, fecharModalInicioFoco);
}

async function iniciarFoco(tarefa) {
  if (cronometro && cronometro.tarefaId === tarefa.id) {
    mostrarToast('O cronômetro desta tarefa já está em andamento.', 'info');
    return;
  }
  if (cronometro) {
    const trocar = await confirmarAcao(
      `Já existe um cronômetro em andamento em "${cronometro.titulo}". Deseja encerrá-lo e iniciar outro em "${tarefa.titulo}"? O tempo já focado será registrado.`,
      { titulo: 'Trocar de tarefa', confirmar: 'Trocar', cancelar: 'Continuar o atual' }
    );
    if (!trocar) return;
    encerrarFoco();
  }
  abrirModalInicioFoco(tarefa);
}

btnFocoIniciar.addEventListener('click', () => {
  const tarefa = tarefaPendenteDeFoco;
  const preset = PRESETS_FOCO[seletorPreset.value] ? seletorPreset.value : 'pomodoro';
  fecharModalInicioFoco();
  if (!tarefa) return;
  try { localStorage.setItem(FOCO_CHAVE_PRESET, preset); } catch { /* ignora */ }
  comecarSegmento({ tarefaId: tarefa.id, titulo: tarefa.titulo, preset, modo: 'foco', ciclo: 0 }, true);
  pedirPermissaoNotificacao();
  anunciarFoco(`Foco iniciado: ${minutosPorExtenso(duracaoDoModoMs(preset, 'foco'))} em "${tarefa.titulo}".`);
});

btnFocoCancelar.addEventListener('click', fecharModalInicioFoco);
btnFocoPausar.addEventListener('click', alternarPausaFoco);
btnFocoPular.addEventListener('click', () => finalizarSegmento(false));
btnFocoParar.addEventListener('click', pararFoco);
btnFocoFalar.addEventListener('click', falarTempoRestante);
document.addEventListener('visibilitychange', () => { if (!document.hidden) tickFoco(); });

// ---------- retoma o cronômetro ao recarregar a página ----------
function restaurarFoco() {
  let salvo = null;
  try { salvo = JSON.parse(localStorage.getItem(FOCO_CHAVE_ESTADO)); } catch { salvo = null; }

  const valido = salvo
    && Number.isFinite(salvo.tarefaId)
    && typeof salvo.titulo === 'string'
    && MODOS_FOCO.includes(salvo.modo)
    && PRESETS_FOCO[salvo.preset]
    && Number.isFinite(salvo.totalMs) && salvo.totalMs > 0
    && Number.isFinite(salvo.restanteMs)
    && Number.isFinite(salvo.fimEm)
    && Number.isInteger(salvo.ciclo);
  if (!valido) { try { localStorage.removeItem(FOCO_CHAVE_ESTADO); } catch { /* ignora */ } return; }

  cronometro = {
    tarefaId: salvo.tarefaId, titulo: salvo.titulo, preset: salvo.preset, modo: salvo.modo,
    ciclo: salvo.ciclo, rodando: Boolean(salvo.rodando), fimEm: salvo.fimEm,
    restanteMs: salvo.restanteMs, totalMs: salvo.totalMs
  };
  atualizarPainelFoco();

  if (cronometro.rodando && Date.now() >= cronometro.fimEm) {
    mostrarToast('O tempo terminou enquanto a página estava fechada.', 'info');
    finalizarSegmento(true);
  } else if (cronometro.rodando) {
    garantirTick();
  }
}

restaurarFoco();
