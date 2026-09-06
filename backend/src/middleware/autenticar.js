const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'taskweb_secret_dev';

function autenticar(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer <token>

  if (!token) {
    return res.status(401).json({ erro: 'Acesso negado. Faça login para continuar.' });
  }

  try {
    req.usuario = jwt.verify(token, JWT_SECRET); // { id, nome, email }
    next();
  } catch {
    return res.status(403).json({ erro: 'Sessão expirada. Faça login novamente.' });
  }
}

module.exports = autenticar;