CREATE TABLE IF NOT EXISTS service_addons (
  service_id BIGINT UNSIGNED NOT NULL,
  addon_id BIGINT UNSIGNED NOT NULL,
  PRIMARY KEY (service_id, addon_id),
  KEY idx_service_addons_addon (addon_id),
  CONSTRAINT fk_sa_service FOREIGN KEY (service_id) REFERENCES services (id) ON DELETE RESTRICT,
  CONSTRAINT fk_sa_addon FOREIGN KEY (addon_id) REFERENCES addons (id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
