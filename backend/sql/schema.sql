CREATE DATABASE IF NOT EXISTS taskweb;
USE taskweb;

CREATE TABLE IF NOT EXISTS tarefas (
  id INT AUTO_INCREMENT PRIMARY KEY,
  titulo VARCHAR(255) NOT NULL,
  descricao TEXT NULL,
  prioridade ENUM('baixa', 'media', 'alta') NOT NULL DEFAULT 'baixa',
  prazo DATE NULL,
  status ENUM('pendente', 'concluida', 'atrasada') NOT NULL DEFAULT 'pendente',
  criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
