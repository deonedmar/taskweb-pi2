// ============================================================
// TaskWeb — auth.js
// Lógica das telas de login e registro
// ============================================================

const API = window.TASKWEB_API_URL || 'http://localhost:3000';

// Se já está logado, vai direto para o dashboard
if (localStorage.getItem('taskweb_token')) {
  window.location.href = 'index.html';
}

// ---------- Helpers ----------
function mostrarErro(id, msg) {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = msg;
  el.hidden = false;
}

function ocultarMensagens() {
  ['msgErro', 'msgSucesso'].forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.hidden = true;
  });
}

function setBotao(btn, carregando) {
  btn.disabled = carregando;
  btn.textContent = carregando ? 'Aguarde...' : btn.dataset.label;
}

// ---------- Login ----------
const formLogin = document.getElementById('formLogin');
if (formLogin) {
  const btn = document.getElementById('btnEntrar');
  btn.dataset.label = btn.textContent;

  // Mensagem de cadastro bem-sucedido vinda do registro
  if (new URLSearchParams(window.location.search).get('cadastro') === 'ok') {
    const el = document.getElementById('msgSucesso');
    if (el) { el.textContent = 'Conta criada! Faça login para continuar.'; el.hidden = false; }
  }

  formLogin.addEventListener('submit', async (e) => {
    e.preventDefault();
    ocultarMensagens();

    const email = document.getElementById('email').value.trim();
    const senha = document.getElementById('senha').value;

    if (!email || !senha) { mostrarErro('msgErro', 'Preencha e-mail e senha.'); return; }

    setBotao(btn, true);
    try {
      const res = await fetch(`${API}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, senha })
      });
      const dados = await res.json();

      if (!res.ok) { mostrarErro('msgErro', dados.erro || 'Erro ao fazer login.'); return; }

      localStorage.setItem('taskweb_token', dados.token);
      localStorage.setItem('taskweb_nome', dados.nome);
      window.location.href = 'index.html';
    } catch {
      mostrarErro('msgErro', 'Não foi possível conectar ao servidor.');
    } finally {
      setBotao(btn, false);
    }
  });
}

// ---------- Registro ----------
const formRegistro = document.getElementById('formRegistro');
if (formRegistro) {
  const btn = document.getElementById('btnCadastrar');
  btn.dataset.label = btn.textContent;

  formRegistro.addEventListener('submit', async (e) => {
    e.preventDefault();
    ocultarMensagens();

    const nome           = document.getElementById('nome').value.trim();
    const email          = document.getElementById('email').value.trim();
    const senha          = document.getElementById('senha').value;
    const confirmarSenha = document.getElementById('confirmarSenha').value;

    if (!nome || !email || !senha || !confirmarSenha) {
      mostrarErro('msgErro', 'Preencha todos os campos.'); return;
    }
    if (senha.length < 6) {
      mostrarErro('msgErro', 'A senha deve ter pelo menos 6 caracteres.'); return;
    }
    if (senha !== confirmarSenha) {
      mostrarErro('msgErro', 'As senhas não coincidem.'); return;
    }

    setBotao(btn, true);
    try {
      const res = await fetch(`${API}/api/auth/registrar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nome, email, senha })
      });
      const dados = await res.json();

      if (!res.ok) { mostrarErro('msgErro', dados.erro || 'Erro ao criar conta.'); return; }

      window.location.href = 'login.html?cadastro=ok';
    } catch {
      mostrarErro('msgErro', 'Não foi possível conectar ao servidor.');
    } finally {
      setBotao(btn, false);
    }
  });
}