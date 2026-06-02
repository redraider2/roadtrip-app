-- roadtrip_seed.sql

INSERT INTO users
(username, email, password_hash)
VALUES
('demo_user', 'demo@roadtrip.local', 'springboard-demo-password-hash');

INSERT INTO locations
(name, location_type, latitude, longitude, timezone, country_code, admin_1, locality, description)
VALUES
('Zócalo (Plaza de la Constitución)', 'scenic', 19.432608, -99.133209, 'America/Mexico_City', 'MX', 'Ciudad de México', 'Mexico City', 'Historic central plaza in Mexico City'),
('Golden Gate Bridge', 'scenic', 37.819929, -122.478255, 'America/Los_Angeles', 'US', 'California', 'San Francisco', 'Iconic suspension bridge'),
('Casco Viejo', 'historic', 8.953183, -79.535383, 'America/Panama', 'PA', 'Panamá', 'Panama City', 'Historic district with plazas, food, and nightlife'),
('Museo del Prado', 'museum', 40.413780, -3.692127, 'Europe/Madrid', 'ES', 'Comunidad de Madrid', 'Madrid', 'Major national art museum');

INSERT INTO trips
(user_id, title, start_location, end_location, notes)
VALUES
(1, 'Pacific Coast Drive', 'San Francisco, CA', 'Los Angeles, CA', 'Plan scenic stops and photo breaks along Highway 1.');
