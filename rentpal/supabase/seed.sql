-- Seed data for RentPal application
-- This file contains initial data for categories and other reference tables

-- Insert main categories
INSERT INTO categories (id, name, slug, description, parent_id, icon_url, sort_order, is_active) VALUES
  ('550e8400-e29b-41d4-a716-446655440001', 'Electronics', 'electronics', 'Cameras, audio equipment, gaming consoles, and more', NULL, '/icons/electronics.svg', 1, true),
  ('550e8400-e29b-41d4-a716-446655440002', 'Tools & Equipment', 'tools-equipment', 'Power tools, hand tools, construction equipment', NULL, '/icons/tools.svg', 2, true),
  ('550e8400-e29b-41d4-a716-446655440003', 'Sports & Recreation', 'sports-recreation', 'Sports equipment, outdoor gear, fitness equipment', NULL, '/icons/sports.svg', 3, true),
  ('550e8400-e29b-41d4-a716-446655440004', 'Transportation', 'transportation', 'Bikes, scooters, car accessories', NULL, '/icons/transportation.svg', 4, true),
  ('550e8400-e29b-41d4-a716-446655440005', 'Home & Garden', 'home-garden', 'Appliances, furniture, gardening tools', NULL, '/icons/home.svg', 5, true),
  ('550e8400-e29b-41d4-a716-446655440006', 'Events & Parties', 'events-parties', 'Party supplies, decorations, event equipment', NULL, '/icons/events.svg', 6, true),
  ('550e8400-e29b-41d4-a716-446655440007', 'Fashion & Accessories', 'fashion-accessories', 'Clothing, jewelry, bags, special occasion wear', NULL, '/icons/fashion.svg', 7, true),
  ('550e8400-e29b-41d4-a716-446655440008', 'Books & Media', 'books-media', 'Books, movies, music, educational materials', NULL, '/icons/books.svg', 8, true);

-- Insert Electronics subcategories
INSERT INTO categories (id, name, slug, description, parent_id, icon_url, sort_order, is_active) VALUES
  ('550e8400-e29b-41d4-a716-446655440101', 'Cameras & Photography', 'cameras-photography', 'DSLR cameras, lenses, tripods, lighting equipment', '550e8400-e29b-41d4-a716-446655440001', NULL, 1, true),
  ('550e8400-e29b-41d4-a716-446655440102', 'Audio Equipment', 'audio-equipment', 'Speakers, microphones, headphones, mixing boards', '550e8400-e29b-41d4-a716-446655440001', NULL, 2, true),
  ('550e8400-e29b-41d4-a716-446655440103', 'Gaming Consoles', 'gaming-consoles', 'PlayStation, Xbox, Nintendo, gaming accessories', '550e8400-e29b-41d4-a716-446655440001', NULL, 3, true),
  ('550e8400-e29b-41d4-a716-446655440104', 'Computers & Tablets', 'computers-tablets', 'Laptops, tablets, monitors, keyboards', '550e8400-e29b-41d4-a716-446655440001', NULL, 4, true),
  ('550e8400-e29b-41d4-a716-446655440105', 'Drones & RC', 'drones-rc', 'Drones, remote control cars, helicopters', '550e8400-e29b-41d4-a716-446655440001', NULL, 5, true);

-- Insert Tools & Equipment subcategories
INSERT INTO categories (id, name, slug, description, parent_id, icon_url, sort_order, is_active) VALUES
  ('550e8400-e29b-41d4-a716-446655440201', 'Power Tools', 'power-tools', 'Drills, saws, sanders, grinders', '550e8400-e29b-41d4-a716-446655440002', NULL, 1, true),
  ('550e8400-e29b-41d4-a716-446655440202', 'Hand Tools', 'hand-tools', 'Wrenches, screwdrivers, hammers, measuring tools', '550e8400-e29b-41d4-a716-446655440002', NULL, 2, true),
  ('550e8400-e29b-41d4-a716-446655440203', 'Construction Equipment', 'construction-equipment', 'Ladders, scaffolding, concrete mixers', '550e8400-e29b-41d4-a716-446655440002', NULL, 3, true),
  ('550e8400-e29b-41d4-a716-446655440204', 'Automotive Tools', 'automotive-tools', 'Car jacks, tire tools, diagnostic equipment', '550e8400-e29b-41d4-a716-446655440002', NULL, 4, true),
  ('550e8400-e29b-41d4-a716-446655440205', 'Yard & Garden Tools', 'yard-garden-tools', 'Lawn mowers, trimmers, leaf blowers', '550e8400-e29b-41d4-a716-446655440002', NULL, 5, true);

-- Insert Sports & Recreation subcategories
INSERT INTO categories (id, name, slug, description, parent_id, icon_url, sort_order, is_active) VALUES
  ('550e8400-e29b-41d4-a716-446655440301', 'Outdoor Adventure', 'outdoor-adventure', 'Camping gear, hiking equipment, climbing gear', '550e8400-e29b-41d4-a716-446655440003', NULL, 1, true),
  ('550e8400-e29b-41d4-a716-446655440302', 'Water Sports', 'water-sports', 'Kayaks, paddleboards, snorkeling gear', '550e8400-e29b-41d4-a716-446655440003', NULL, 2, true),
  ('550e8400-e29b-41d4-a716-446655440303', 'Winter Sports', 'winter-sports', 'Skis, snowboards, ice skates, winter gear', '550e8400-e29b-41d4-a716-446655440003', NULL, 3, true),
  ('550e8400-e29b-41d4-a716-446655440304', 'Fitness Equipment', 'fitness-equipment', 'Weights, exercise bikes, yoga mats', '550e8400-e29b-41d4-a716-446655440003', NULL, 4, true),
  ('550e8400-e29b-41d4-a716-446655440305', 'Team Sports', 'team-sports', 'Soccer balls, basketballs, tennis rackets', '550e8400-e29b-41d4-a716-446655440003', NULL, 5, true);

-- Insert Transportation subcategories
INSERT INTO categories (id, name, slug, description, parent_id, icon_url, sort_order, is_active) VALUES
  ('550e8400-e29b-41d4-a716-446655440401', 'Bicycles', 'bicycles', 'Mountain bikes, road bikes, electric bikes', '550e8400-e29b-41d4-a716-446655440004', NULL, 1, true),
  ('550e8400-e29b-41d4-a716-446655440402', 'Scooters & E-Scooters', 'scooters-e-scooters', 'Electric scooters, kick scooters, mobility scooters', '550e8400-e29b-41d4-a716-446655440004', NULL, 2, true),
  ('550e8400-e29b-41d4-a716-446655440403', 'Car Accessories', 'car-accessories', 'Roof racks, bike carriers, car seats', '550e8400-e29b-41d4-a716-446655440004', NULL, 3, true),
  ('550e8400-e29b-41d4-a716-446655440404', 'Motorcycles & ATVs', 'motorcycles-atvs', 'Motorcycles, ATVs, dirt bikes', '550e8400-e29b-41d4-a716-446655440004', NULL, 4, true);

-- Insert Home & Garden subcategories
INSERT INTO categories (id, name, slug, description, parent_id, icon_url, sort_order, is_active) VALUES
  ('550e8400-e29b-41d4-a716-446655440501', 'Kitchen Appliances', 'kitchen-appliances', 'Blenders, food processors, coffee machines', '550e8400-e29b-41d4-a716-446655440005', NULL, 1, true),
  ('550e8400-e29b-41d4-a716-446655440502', 'Cleaning Equipment', 'cleaning-equipment', 'Vacuum cleaners, pressure washers, steam cleaners', '550e8400-e29b-41d4-a716-446655440005', NULL, 2, true),
  ('550e8400-e29b-41d4-a716-446655440503', 'Furniture', 'furniture', 'Tables, chairs, storage solutions', '550e8400-e29b-41d4-a716-446655440005', NULL, 3, true),
  ('550e8400-e29b-41d4-a716-446655440504', 'Gardening', 'gardening', 'Plant pots, watering systems, garden tools', '550e8400-e29b-41d4-a716-446655440005', NULL, 4, true);

-- Insert Events & Parties subcategories
INSERT INTO categories (id, name, slug, description, parent_id, icon_url, sort_order, is_active) VALUES
  ('550e8400-e29b-41d4-a716-446655440601', 'Party Supplies', 'party-supplies', 'Decorations, balloons, party games', '550e8400-e29b-41d4-a716-446655440006', NULL, 1, true),
  ('550e8400-e29b-41d4-a716-446655440602', 'Audio/Visual Equipment', 'audio-visual-equipment', 'Projectors, screens, PA systems', '550e8400-e29b-41d4-a716-446655440006', NULL, 2, true),
  ('550e8400-e29b-41d4-a716-446655440603', 'Tables & Seating', 'tables-seating', 'Folding tables, chairs, tents', '550e8400-e29b-41d4-a716-446655440006', NULL, 3, true),
  ('550e8400-e29b-41d4-a716-446655440604', 'Catering Equipment', 'catering-equipment', 'Chafing dishes, serving trays, coolers', '550e8400-e29b-41d4-a716-446655440006', NULL, 4, true);

-- Insert Fashion & Accessories subcategories
INSERT INTO categories (id, name, slug, description, parent_id, icon_url, sort_order, is_active) VALUES
  ('550e8400-e29b-41d4-a716-446655440701', 'Special Occasion Wear', 'special-occasion-wear', 'Wedding dresses, tuxedos, formal wear', '550e8400-e29b-41d4-a716-446655440007', NULL, 1, true),
  ('550e8400-e29b-41d4-a716-446655440702', 'Costumes', 'costumes', 'Halloween costumes, cosplay, themed outfits', '550e8400-e29b-41d4-a716-446655440007', NULL, 2, true),
  ('550e8400-e29b-41d4-a716-446655440703', 'Jewelry & Watches', 'jewelry-watches', 'Necklaces, watches, rings, earrings', '550e8400-e29b-41d4-a716-446655440007', NULL, 3, true),
  ('550e8400-e29b-41d4-a716-446655440704', 'Bags & Luggage', 'bags-luggage', 'Suitcases, backpacks, handbags', '550e8400-e29b-41d4-a716-446655440007', NULL, 4, true);

-- Insert Books & Media subcategories
INSERT INTO categories (id, name, slug, description, parent_id, icon_url, sort_order, is_active) VALUES
  ('550e8400-e29b-41d4-a716-446655440801', 'Books', 'books', 'Textbooks, novels, reference books', '550e8400-e29b-41d4-a716-446655440008', NULL, 1, true),
  ('550e8400-e29b-41d4-a716-446655440802', 'Movies & TV', 'movies-tv', 'DVDs, Blu-rays, TV series collections', '550e8400-e29b-41d4-a716-446655440008', NULL, 2, true),
  ('550e8400-e29b-41d4-a716-446655440803', 'Music', 'music', 'CDs, vinyl records, music instruments', '550e8400-e29b-41d4-a716-446655440008', NULL, 3, true),
  ('550e8400-e29b-41d4-a716-446655440804', 'Educational Materials', 'educational-materials', 'Course materials, learning resources', '550e8400-e29b-41d4-a716-446655440008', NULL, 4, true);

-- Note: Item availability data will be created automatically when users create items
-- and manage their availability calendars through the application interface.