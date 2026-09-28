CREATE TABLE IF NOT EXISTS booking_addons (
  booking_id BIGINT UNSIGNED NOT NULL,
  addon_id BIGINT UNSIGNED NOT NULL,
  addon_name_snapshot VARCHAR(150) NOT NULL,
  addon_price_snapshot INT UNSIGNED NOT NULL,
  PRIMARY KEY (booking_id, addon_id),
  KEY idx_booking_addons_addon (addon_id),
  CONSTRAINT fk_ba_booking FOREIGN KEY (booking_id) REFERENCES bookings (id) ON DELETE RESTRICT,
  CONSTRAINT fk_ba_addon FOREIGN KEY (addon_id) REFERENCES addons (id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
