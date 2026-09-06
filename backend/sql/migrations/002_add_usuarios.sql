-- ============================================================
-- Migração 002 — sistema de login
-- Execute no MySQL Workbench: abra este arquivo e clique no raio
-- ============================================================

USE taskweb;

-- Tabela de usuários
CREATE TABLE IF NOT EXISTS usuarios (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  nome       VARCHAR(255) NOT NULL,
  email      VARCHAR(255) NOT NULL UNIQUE,
  senha_hash VARCHAR(255) NOT NULL,
  criado_em  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Vincula tarefas ao usuário dono
ALTER TABLE tarefas
  ADD COLUMN IF NOT EXISTS usuario_id INT NULL,
  ADD CONSTRAINT fk_tarefas_usuario
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
    ON DELETE CASCADE;