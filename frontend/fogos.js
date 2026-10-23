// ============================================================
// Fogos de artifício ao concluir uma tarefa.
// Desenha em um canvas sobre a página, sem bloquear cliques e
// escondido dos leitores de tela. Não roda para quem pediu
// "reduzir movimento" no aparelho (prefers-reduced-motion).
// ============================================================
(function () {
  // cores bem saturadas: precisam aparecer sobre o fundo claro da página
  const CORES = ['#ff1744', '#ff9100', '#00c853', '#2979ff', '#d500f9', '#ffc400', '#00b8d4'];
  const PARTICULAS_POR_EXPLOSAO = 70;
  const GRAVIDADE = 0.07;
  const ATRITO = 0.985;

  let canvas = null;
  let ctx = null;
  let particulas = [];
  let agendados = [];
  let quadroId = null;
  let ultimoQuadro = 0;
  let largura = 0;
  let altura = 0;

  function reduzirMovimento() {
    return Boolean(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  }

  function ajustarTamanho() {
    if (!canvas) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    largura = window.innerWidth;
    altura = window.innerHeight;
    canvas.width = Math.round(largura * dpr);
    canvas.height = Math.round(altura * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function escolherCor() {
    return CORES[Math.floor(Math.random() * CORES.length)];
  }

  function explodir(x, y) {
    const corA = escolherCor();
    const corB = escolherCor();
    for (let i = 0; i < PARTICULAS_POR_EXPLOSAO; i++) {
      const angulo = (Math.PI * 2 * i) / PARTICULAS_POR_EXPLOSAO + Math.random() * 0.25;
      const velocidade = 2 + Math.random() * 5;
      particulas.push({
        x, y,
        vx: Math.cos(angulo) * velocidade,
        vy: Math.sin(angulo) * velocidade,
        vida: 1,
        decaimento: 0.009 + Math.random() * 0.011,
        cor: i % 2 === 0 ? corA : corB,
        espessura: 2.2 + Math.random() * 2
      });
    }
  }

  function desenharQuadro(agora) {
    const passo = Math.min(32, agora - ultimoQuadro) / 16.67; // 1 = um quadro a 60 fps
    ultimoQuadro = agora;

    ctx.clearRect(0, 0, largura, altura);
    ctx.globalCompositeOperation = 'source-over';
    ctx.lineCap = 'round';

    particulas.forEach((p) => {
      const xAnterior = p.x;
      const yAnterior = p.y;
      p.vx *= Math.pow(ATRITO, passo);
      p.vy = p.vy * Math.pow(ATRITO, passo) + GRAVIDADE * passo;
      p.x += p.vx * passo;
      p.y += p.vy * passo;
      p.vida -= p.decaimento * passo;

      ctx.globalAlpha = Math.max(0, p.vida);
      ctx.strokeStyle = p.cor;
      ctx.lineWidth = p.espessura;
      ctx.beginPath();
      ctx.moveTo(xAnterior - p.vx * 1.5, yAnterior - p.vy * 1.5); // rastro curto
      ctx.lineTo(p.x, p.y);
      ctx.stroke();
    });

    ctx.globalAlpha = 1;
    particulas = particulas.filter((p) => p.vida > 0);

    if (particulas.length === 0 && agendados.length === 0) {
      encerrar();
      return;
    }
    quadroId = requestAnimationFrame(desenharQuadro);
  }

  function iniciar() {
    if (canvas) return;
    canvas = document.createElement('canvas');
    canvas.className = 'fogos-canvas';
    canvas.setAttribute('aria-hidden', 'true');
    document.body.appendChild(canvas);
    ctx = canvas.getContext('2d');
    ajustarTamanho();
    window.addEventListener('resize', ajustarTamanho);
    ultimoQuadro = performance.now();
    quadroId = requestAnimationFrame(desenharQuadro);
  }

  function encerrar() {
    if (quadroId !== null) cancelAnimationFrame(quadroId);
    agendados.forEach((id) => clearTimeout(id));
    agendados = [];
    particulas = [];
    quadroId = null;
    window.removeEventListener('resize', ajustarTamanho);
    if (canvas && canvas.parentNode) canvas.parentNode.removeChild(canvas);
    canvas = null;
    ctx = null;
  }

  function agendarExplosao(atrasoMs, x, y) {
    const id = setTimeout(() => {
      agendados = agendados.filter((item) => item !== id);
      if (canvas) explodir(x, y);
    }, atrasoMs);
    agendados.push(id);
  }

  // origem: retângulo (getBoundingClientRect) do botão que concluiu a tarefa
  window.dispararFogos = function dispararFogos(origem) {
    if (reduzirMovimento()) return;
    iniciar();

    const w = window.innerWidth;
    const h = window.innerHeight;
    const x0 = origem ? origem.left + origem.width / 2 : w / 2;
    const y0 = origem ? origem.top + origem.height / 2 : h * 0.4;

    explodir(x0, y0); // a primeira explosão sai do botão
    for (let i = 0; i < 4; i++) {
      // espaçadas (cerca de 2 por segundo) para não virar uma luz piscando
      agendarExplosao(
        420 + i * 430 + Math.random() * 120,
        w * (0.12 + Math.random() * 0.76),
        h * (0.12 + Math.random() * 0.42)
      );
    }
  };
})();
