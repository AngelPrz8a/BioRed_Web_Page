CREATE TABLE IF NOT EXISTS sesiones_app (
  id_sesion BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  id_usuario INT UNSIGNED NOT NULL,
  token_hash CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  creada_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  expira_en DATETIME NOT NULL,
  PRIMARY KEY (id_sesion),
  UNIQUE KEY uk_sesiones_app_token (token_hash),
  KEY idx_sesiones_app_usuario_expira (id_usuario, expira_en),
  KEY idx_sesiones_app_expira (expira_en),
  CONSTRAINT fk_sesiones_app_usuario
    FOREIGN KEY (id_usuario) REFERENCES usuarios (id_usuario)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB;
