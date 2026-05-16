-- ============================================================================
-- PHASE 1: Seed Inventory Items for Testing
-- Smart Energy ERP System - Solar/Energy Equipment
-- ============================================================================

-- Insert sample inventory items for solar/energy company
INSERT INTO inventory_items (name, sku, description, unit, quantity, minimum_threshold, location) VALUES
-- Solar Panels
('Solar Panel 400W Monocrystalline', 'SP-400W-MONO', 'High-efficiency monocrystalline solar panel 400W', 'piece', 500, 50, 'Warehouse A - Row 1'),
('Solar Panel 350W Polycrystalline', 'SP-350W-POLY', 'Polycrystalline solar panel 350W', 'piece', 300, 30, 'Warehouse A - Row 2'),
('Solar Panel 500W Bifacial', 'SP-500W-BI', 'Bifacial solar panel 500W for ground mount', 'piece', 200, 20, 'Warehouse A - Row 3'),

-- Inverters
('String Inverter 50kW', 'INV-STR-50K', 'Three-phase string inverter 50kW', 'piece', 50, 5, 'Warehouse B - Rack 1'),
('String Inverter 100kW', 'INV-STR-100K', 'Three-phase string inverter 100kW', 'piece', 30, 3, 'Warehouse B - Rack 2'),
('Micro Inverter 600W', 'INV-MIC-600', 'Micro inverter 600W per panel', 'piece', 400, 40, 'Warehouse B - Rack 3'),
('Hybrid Inverter 10kW', 'INV-HYB-10K', 'Hybrid inverter with battery support 10kW', 'piece', 80, 10, 'Warehouse B - Rack 4'),

-- Mounting Structures
('Roof Mounting Structure Aluminum', 'MTS-ROOF-ALU', 'Aluminum mounting structure for flat roofs', 'sqm', 2000, 200, 'Warehouse C - Area 1'),
('Ground Mounting Structure Galvanized', 'MTS-GRD-GAL', 'Galvanized steel ground mount structure', 'sqm', 1500, 150, 'Warehouse C - Area 2'),
('Tilt Mounting Kit 30 degree', 'MTS-TILT-30', 'Fixed tilt mounting kit 30 degrees', 'set', 100, 10, 'Warehouse C - Area 3'),

-- Cables & Wiring
('DC Cable 4mm² Solar', 'CBL-DC-4MM', 'UV-resistant DC solar cable 4mm²', 'meter', 5000, 500, 'Warehouse D - Spool 1'),
('DC Cable 6mm² Solar', 'CBL-DC-6MM', 'UV-resistant DC solar cable 6mm²', 'meter', 4000, 400, 'Warehouse D - Spool 2'),
('AC Cable 4-Core 16mm²', 'CBL-AC-4C16', 'Armored AC cable 4-core 16mm²', 'meter', 2000, 200, 'Warehouse D - Spool 3'),
('MC4 Connector Pair', 'CON-MC4', 'MC4 compatible connector pair male+female', 'pair', 2000, 200, 'Warehouse D - Box 1'),

-- Battery Storage
('Lithium Battery 10kWh 48V', 'BAT-LI-10K', 'Lithium-ion battery storage 10kWh 48V', 'piece', 60, 6, 'Warehouse E - Climate'),
('Lithium Battery 20kWh 48V', 'BAT-LI-20K', 'Lithium-ion battery storage 20kWh 48V', 'piece', 40, 4, 'Warehouse E - Climate'),
('Battery Rack Cabinet', 'BAT-RACK', 'Battery rack cabinet for 10 batteries', 'piece', 20, 2, 'Warehouse E - Climate'),

-- Safety Equipment
('DC Disconnect Switch 1000V', 'SAF-DC-DISC', 'DC disconnect switch 1000V 32A', 'piece', 300, 30, 'Warehouse F - Safety'),
('AC Distribution Board', 'SAF-AC-DB', 'AC distribution board with breakers', 'piece', 100, 10, 'Warehouse F - Safety'),
('Surge Protection Device DC', 'SAF-SPD-DC', 'DC surge protection device', 'piece', 400, 40, 'Warehouse F - Safety'),
('Surge Protection Device AC', 'SAF-SPD-AC', 'AC surge protection device', 'piece', 300, 30, 'Warehouse F - Safety'),
('Grounding Kit', 'SAF-GRD', 'Complete grounding kit for solar installation', 'kit', 200, 20, 'Warehouse F - Safety'),

-- Monitoring & Communication
('WiFi Monitoring Module', 'MON-WIFI', 'WiFi monitoring module for inverters', 'piece', 150, 15, 'Warehouse G - Electronics'),
('GSM Monitoring Module', 'MON-GSM', 'GSM monitoring module for remote sites', 'piece', 100, 10, 'Warehouse G - Electronics'),
('Energy Meter RS485', 'MON-METER', 'RS485 energy meter for monitoring', 'piece', 120, 12, 'Warehouse G - Electronics'),

-- Installation Tools
('Crimping Tool MC4', 'TOOL-CRIMP', 'Professional MC4 crimping tool', 'piece', 50, 5, 'Tool Room - Shelf 1'),
('Solar Irradiance Meter', 'TOOL-IRRAD', 'Solar irradiance meter for testing', 'piece', 20, 2, 'Tool Room - Shelf 2'),
('Infrared Thermometer', 'TOOL-IR', 'Infrared thermometer for panel inspection', 'piece', 30, 3, 'Tool Room - Shelf 3'),
('Multimeter Digital', 'TOOL-MULTI', 'Digital multimeter for electrical testing', 'piece', 40, 4, 'Tool Room - Shelf 4'),

-- Safety PPE
('Safety Harness Full Body', 'PPE-HARNESS', 'Full body safety harness for roof work', 'piece', 100, 10, 'Safety Store'),
('Hard Hat', 'PPE-HAT', 'Safety hard hat', 'piece', 200, 20, 'Safety Store'),
('Safety Gloves Electrical', 'PPE-GLOVE', 'Electrical safety gloves', 'pair', 300, 30, 'Safety Store'),
('Safety Glasses', 'PPE-GLASS', 'Safety glasses with side protection', 'piece', 250, 25, 'Safety Store');

-- Update inventory to have realistic SKU patterns
UPDATE inventory_items 
SET updated_at = CURRENT_TIMESTAMP
WHERE updated_at IS NULL;

-- Verify insertion
SELECT COUNT(*) as total_items, SUM(quantity) as total_quantity FROM inventory_items;

-- Create view for low stock alerts
CREATE OR REPLACE VIEW v_low_stock_items AS
SELECT 
  id,
  name,
  sku,
  quantity,
  minimum_threshold,
  (minimum_threshold - quantity) as shortage_quantity,
  location
FROM inventory_items
WHERE quantity < minimum_threshold
ORDER BY (quantity::float / NULLIF(minimum_threshold, 0)) ASC;

COMMENT ON VIEW v_low_stock_items IS 'View showing items below minimum threshold';
