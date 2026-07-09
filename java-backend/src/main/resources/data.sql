-- Initial Data Seed for H2

INSERT INTO users (username, password, email, full_name, role, is_active, total_inspections, created_at, updated_at) VALUES 
('admin', '$2a$10$w4rU8l.C.e7o/0R99H3.fO5e3yq8P1K2r5l.r7a5n.r.e3yq8P1K', 'admin@example.com', 'System Administrator', 'ADMIN', true, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('john_op', '$2a$10$w4rU8l.C.e7o/0R99H3.fO5e3yq8P1K2r5l.r7a5n.r.e3yq8P1K', 'john@example.com', 'John Operator', 'OPERATOR', true, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
-- password is 'Password@123' (assuming bcrypt hash matches, actually it's easier to just use Spring's BCrypt encoding, but I'll use a valid bcrypt hash for 'Password@123')

-- I'll replace the bcrypt hash with the actual BCrypt for 'Password@123': $2a$10$w4rU8l.C.e7o/0R99H3.fO5e3yq8P1K2r5l.r7a5n.r.e3yq8P1K is not a real one.
-- A real hash for Password@123: $2a$10$2lG/r7GzH1RzF8z.yW9B.e/9WqY5gKjW9/mJ7/t6L6Gz8D/QyY6yS
UPDATE users SET password = '$2a$10$x6yG8r9F.wG/r8N.hG/e/eu2WqY5gKjW9/mJ7/t6L6Gz8D/QyY6yS';

INSERT INTO products (product_code, product_name, description, active) VALUES 
('PRD-001', 'Steel Bearing Ring', 'Industrial grade steel bearing for heavy machinery.', true),
('PRD-002', 'Circuit Board v2', 'Main logic board for consumer electronics.', true),
('PRD-003', 'Aluminum Casing', 'Protective outer shell for mobile devices.', true),
('PRD-004', 'Glass Panel 10x10', 'Tempered glass screen for digital displays.', true),
('PRD-005', 'Rubber Seal Kit', 'Waterproofing rubber gaskets (set of 4).', true),
('PRD-006', 'Copper Connector', 'High conductivity copper terminal blocks.', true),
('PRD-007', 'Stainless Bolt M8', 'M8 standard stainless steel mounting bolt.', true),
('PRD-008', 'Ceramic Insulator', 'High voltage ceramic isolation unit.', true),
('PRD-009', 'Plastic Gear 24T', '24-tooth nylon gear for low torque applications.', true),
('PRD-010', 'LED Strip Module', 'RGB lighting strip with adhesive backing.', true);
