-- =============================================================
--  Quality Inspection Agent — MySQL Database Schema + Seed Data
--  Database: quality_inspection
-- =============================================================

CREATE DATABASE IF NOT EXISTS quality_inspection
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE quality_inspection;

-- -------------------------------------------------------------
-- Table: users
-- Stores registered users (admin and operators)
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
    id            BIGINT AUTO_INCREMENT PRIMARY KEY,
    username      VARCHAR(50)  NOT NULL UNIQUE,
    email         VARCHAR(100) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    full_name     VARCHAR(100) NOT NULL,
    role          ENUM('ADMIN','OPERATOR') NOT NULL DEFAULT 'OPERATOR',
    is_active     BOOLEAN NOT NULL DEFAULT TRUE,
    created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- -------------------------------------------------------------
-- Table: products
-- Master catalogue of product types being inspected
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS products (
    id             BIGINT AUTO_INCREMENT PRIMARY KEY,
    product_code   VARCHAR(50)  NOT NULL UNIQUE,
    product_name   VARCHAR(150) NOT NULL,
    category       VARCHAR(100),
    description    TEXT,
    tolerance_pct  DECIMAL(5,2) NOT NULL DEFAULT 5.00  COMMENT 'Acceptable defect tolerance %',
    is_active      BOOLEAN NOT NULL DEFAULT TRUE,
    created_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- -------------------------------------------------------------
-- Table: inspections
-- Each row = one image uploaded and analysed
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS inspections (
    id              BIGINT AUTO_INCREMENT PRIMARY KEY,
    inspection_code VARCHAR(30) NOT NULL UNIQUE,
    product_id      BIGINT NOT NULL,
    user_id         BIGINT NOT NULL,
    image_path      VARCHAR(500) NOT NULL,
    image_filename  VARCHAR(255) NOT NULL,
    status          ENUM('GOOD','DEFECTIVE','PENDING','ERROR') NOT NULL DEFAULT 'PENDING',
    confidence      DECIMAL(5,2) COMMENT 'AI confidence score 0-100',
    recommendation  ENUM('ACCEPT','REJECT','REWORK') DEFAULT NULL,
    notes           TEXT,
    inspected_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT,
    FOREIGN KEY (user_id)    REFERENCES users(id)    ON DELETE RESTRICT
);

-- -------------------------------------------------------------
-- Table: defects
-- Defect details per inspection (one inspection may have many)
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS defects (
    id              BIGINT AUTO_INCREMENT PRIMARY KEY,
    inspection_id   BIGINT NOT NULL,
    defect_type     VARCHAR(100) NOT NULL,
    severity        ENUM('LOW','MEDIUM','HIGH','CRITICAL') NOT NULL DEFAULT 'MEDIUM',
    confidence      DECIMAL(5,2),
    bbox_x          INT  COMMENT 'Bounding box top-left x (pixels)',
    bbox_y          INT  COMMENT 'Bounding box top-left y (pixels)',
    bbox_width      INT  COMMENT 'Bounding box width (pixels)',
    bbox_height     INT  COMMENT 'Bounding box height (pixels)',
    description     TEXT,
    detected_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (inspection_id) REFERENCES inspections(id) ON DELETE CASCADE
);

-- -------------------------------------------------------------
-- Table: reports
-- Generated PDF reports linked to an inspection
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS reports (
    id              BIGINT AUTO_INCREMENT PRIMARY KEY,
    report_code     VARCHAR(30) NOT NULL UNIQUE,
    inspection_id   BIGINT NOT NULL,
    generated_by    BIGINT NOT NULL,
    file_path       VARCHAR(500),
    file_size_kb    INT,
    summary         TEXT,
    generated_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (inspection_id) REFERENCES inspections(id) ON DELETE CASCADE,
    FOREIGN KEY (generated_by)  REFERENCES users(id)       ON DELETE RESTRICT
);

-- =============================================================
--  SEED DATA
-- =============================================================

-- Passwords below are bcrypt hash of "Password@123"
INSERT INTO users (username, email, password_hash, full_name, role) VALUES
('admin',      'admin@qualityai.com',    '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'System Administrator', 'ADMIN'),
('john_op',    'john@qualityai.com',     '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'John Smith',           'OPERATOR'),
('sara_op',    'sara@qualityai.com',     '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'Sara Johnson',         'OPERATOR'),
('mike_op',    'mike@qualityai.com',     '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'Mike Davis',           'OPERATOR'),
('priya_op',   'priya@qualityai.com',    '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'Priya Patel',          'OPERATOR');

INSERT INTO products (product_code, product_name, category, description, tolerance_pct) VALUES
('PRD-001', 'Steel Bearing Ring',     'Mechanical',  'High-precision bearing rings for industrial use',     2.50),
('PRD-002', 'Circuit Board v2',       'Electronics', 'PCB board for control systems',                       1.00),
('PRD-003', 'Aluminum Casing',        'Mechanical',  'Die-cast aluminium enclosure for sensors',            3.00),
('PRD-004', 'Glass Panel 10x10',      'Glass',       'Flat borosilicate glass panels for instruments',      0.50),
('PRD-005', 'Rubber Seal Kit',        'Polymer',     'O-ring and gasket set for pressure vessels',          4.00),
('PRD-006', 'Copper Connector',       'Electronics', 'High-current copper connectors for power systems',    1.50),
('PRD-007', 'Stainless Bolt M8',      'Fastener',    'M8 stainless steel hex bolts DIN 933',                2.00),
('PRD-008', 'Ceramic Insulator',      'Ceramic',     'High-voltage ceramic insulators',                     1.00),
('PRD-009', 'Plastic Gear 24T',       'Polymer',     '24-tooth nylon gear for gear assemblies',             3.50),
('PRD-010', 'LED Strip Module',       'Electronics', 'RGB LED strip for display systems',                   2.00);

INSERT INTO inspections (inspection_code, product_id, user_id, image_path, image_filename, status, confidence, recommendation, notes) VALUES
('INS-2024-001', 1, 2, '/uploads/img001.jpg', 'bearing_001.jpg',  'GOOD',      97.30, 'ACCEPT',  'No defects detected'),
('INS-2024-002', 2, 2, '/uploads/img002.jpg', 'pcb_002.jpg',      'DEFECTIVE', 91.80, 'REJECT',  'Solder bridge found on U3'),
('INS-2024-003', 3, 3, '/uploads/img003.jpg', 'casing_003.jpg',   'GOOD',      95.10, 'ACCEPT',  'Surface finish within tolerance'),
('INS-2024-004', 4, 3, '/uploads/img004.jpg', 'glass_004.jpg',    'DEFECTIVE', 88.40, 'REJECT',  'Micro-crack detected near edge'),
('INS-2024-005', 5, 4, '/uploads/img005.jpg', 'rubber_005.jpg',   'GOOD',      99.00, 'ACCEPT',  'All seals intact'),
('INS-2024-006', 6, 4, '/uploads/img006.jpg', 'copper_006.jpg',   'DEFECTIVE', 85.20, 'REWORK',  'Minor oxidation on pin 3'),
('INS-2024-007', 7, 5, '/uploads/img007.jpg', 'bolt_007.jpg',     'GOOD',      98.50, 'ACCEPT',  'Thread profile nominal'),
('INS-2024-008', 8, 5, '/uploads/img008.jpg', 'ceramic_008.jpg',  'DEFECTIVE', 92.60, 'REJECT',  'Surface porosity > limit'),
('INS-2024-009', 9, 2, '/uploads/img009.jpg', 'gear_009.jpg',     'GOOD',      96.70, 'ACCEPT',  'Tooth profile within spec'),
('INS-2024-010', 10,2, '/uploads/img010.jpg', 'led_010.jpg',      'DEFECTIVE', 89.30, 'REWORK',  'Dead LED segment at position 7'),
('INS-2024-011', 1, 3, '/uploads/img011.jpg', 'bearing_011.jpg',  'GOOD',      94.80, 'ACCEPT',  'Within tolerance'),
('INS-2024-012', 2, 3, '/uploads/img012.jpg', 'pcb_012.jpg',      'GOOD',      97.50, 'ACCEPT',  'All components correctly placed'),
('INS-2024-013', 3, 4, '/uploads/img013.jpg', 'casing_013.jpg',   'DEFECTIVE', 86.90, 'REWORK',  'Surface scratch on panel B'),
('INS-2024-014', 4, 4, '/uploads/img014.jpg', 'glass_014.jpg',    'GOOD',      98.20, 'ACCEPT',  'No defects'),
('INS-2024-015', 5, 5, '/uploads/img015.jpg', 'rubber_015.jpg',   'DEFECTIVE', 90.10, 'REJECT',  'Seal deformation exceeds limit'),
('INS-2024-016', 6, 5, '/uploads/img016.jpg', 'copper_016.jpg',   'GOOD',      96.30, 'ACCEPT',  'Clean connectors'),
('INS-2024-017', 7, 2, '/uploads/img017.jpg', 'bolt_017.jpg',     'DEFECTIVE', 83.70, 'REJECT',  'Cross-threading on head'),
('INS-2024-018', 8, 2, '/uploads/img018.jpg', 'ceramic_018.jpg',  'GOOD',      97.80, 'ACCEPT',  'No surface defects'),
('INS-2024-019', 9, 3, '/uploads/img019.jpg', 'gear_019.jpg',     'DEFECTIVE', 87.40, 'REWORK',  'Chip on tooth 18'),
('INS-2024-020', 10,3, '/uploads/img020.jpg', 'led_020.jpg',      'GOOD',      95.60, 'ACCEPT',  'All segments lit correctly');

INSERT INTO defects (inspection_id, defect_type, severity, confidence, bbox_x, bbox_y, bbox_width, bbox_height, description) VALUES
(2,  'Solder Bridge',       'HIGH',     91.80, 120, 85,  45,  30,  'Short circuit risk between IC pins'),
(4,  'Surface Crack',       'CRITICAL', 88.40, 200, 310, 80,  15,  'Micro-crack propagating from edge'),
(6,  'Oxidation',           'LOW',      85.20, 55,  70,  30,  25,  'Surface oxidation on connector pin'),
(8,  'Surface Porosity',    'HIGH',     92.60, 90,  140, 60,  55,  'Multiple micro-pores exceeding limit'),
(10, 'Dead Component',      'MEDIUM',   89.30, 310, 20,  40,  10,  'LED segment non-functional'),
(13, 'Surface Scratch',     'LOW',      86.90, 180, 220, 100, 8,   'Cosmetic scratch on panel surface'),
(15, 'Deformation',         'HIGH',     90.10, 45,  45,  70,  70,  'Seal compressed beyond recovery'),
(17, 'Thread Damage',       'CRITICAL', 83.70, 60,  10,  50,  80,  'Cross-threading renders bolt unusable'),
(19, 'Chipping',            'MEDIUM',   87.40, 230, 190, 35,  20,  'Tooth chip reducing gear integrity');

INSERT INTO reports (report_code, inspection_id, generated_by, file_path, file_size_kb, summary) VALUES
('RPT-2024-001', 2,  1, '/reports/RPT-2024-001.pdf', 48,  'Defective PCB — Solder bridge identified. Batch rejected.'),
('RPT-2024-002', 4,  1, '/reports/RPT-2024-002.pdf', 52,  'Defective glass panel — Critical crack. Immediate rejection.'),
('RPT-2024-003', 8,  2, '/reports/RPT-2024-003.pdf', 45,  'Ceramic insulator porosity exceeds limit. Lot quarantined.'),
('RPT-2024-004', 15, 3, '/reports/RPT-2024-004.pdf', 41,  'Rubber seal deformation. Full batch inspection ordered.'),
('RPT-2024-005', 17, 1, '/reports/RPT-2024-005.pdf', 39,  'Bolt threading failure. Supplier notified.');
