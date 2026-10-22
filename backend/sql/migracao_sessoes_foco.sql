-- Sessões do cronômetro de foco (estatísticas de tempo).
-- Esta tabela é criada automaticamente pelo backend na primeira chamada
-- (CREATE TABLE IF NOT EXISTS); o script fica aqui como documentação
-- e para quem quiser criar o banco manualmente.
CREATE TABLE IF NOT EXISTS sessoes_foco (
  id INT AUTO_INCREMENT PRIMARY KEY,
  usuario_id INT NOT NULL,
  tarefa_id INT NULL,
  titulo_tarefa VARCHAR(255) NULL,
  duracao_segundos INT NOT NULL,
  completou TINYINT(1) NOT NULL DEFAULT 0,
  criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_sessoes_usuario_data (usuario_id, criado_em)
);
