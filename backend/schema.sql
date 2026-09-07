-- Database: infinite_services_db

CREATE DATABASE IF NOT EXISTS infinite_services_db;
USE infinite_services_db;

CREATE TABLE IF NOT EXISTS components (
    id INT AUTO_INCREMENT PRIMARY KEY,
    code_number VARCHAR(50),
    name VARCHAR(255) NOT NULL,
    category ENUM('Electronics', 'Web Development', 'Scrap') NOT NULL,
    price DECIMAL(10, 2) NOT NULL,
    stock INT NOT NULL DEFAULT 0,
    description TEXT
);

CREATE TABLE IF NOT EXISTS invoices (
    id INT AUTO_INCREMENT PRIMARY KEY,
    invoice_number VARCHAR(50) UNIQUE,
    customer_name VARCHAR(255) NOT NULL,
    customer_contact VARCHAR(50),
    discount DECIMAL(10, 2) NOT NULL DEFAULT 0,
    total_amount DECIMAL(10, 2) NOT NULL,
    date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS invoice_items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    invoice_id INT NOT NULL,
    component_id INT,
    description VARCHAR(255) NOT NULL,
    quantity INT NOT NULL,
    price DECIMAL(10, 2) NOT NULL,
    FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE,
    FOREIGN KEY (component_id) REFERENCES components(id) ON DELETE SET NULL
);

-- Insert some dummy data
INSERT INTO components (name, category, price, stock, description) VALUES
('Soldering Iron 60W', 'Electronics', 15.00, 20, 'Adjustable temperature soldering iron'),
('NodeMCU ESP8266', 'Electronics', 5.50, 50, 'WiFi enabled microcontroller'),
('Basic Website Package', 'Web Development', 150.00, 1, 'Simple single page application'),
('Custom Robot Chassis', 'Scrap', 45.00, 5, 'Built from recycled printer parts');
