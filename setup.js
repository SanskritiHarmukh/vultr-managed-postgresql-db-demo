const pool = require('./db');

async function setupDatabase() {
  const client = await pool.connect();
  
  try {
    console.log('🔧 Setting up database...');
    
    // Drop existing table if it exists (for demo purposes)
    await client.query('DROP TABLE IF EXISTS products CASCADE');
    console.log('🗑️  Dropped existing tables');
    
    // Create products table with PostgreSQL-specific features
    await client.query(`
      CREATE TABLE products (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        category VARCHAR(100),
        price DECIMAL(10,2),
        image_url TEXT,
        attributes JSONB,                            -- PostgreSQL JSONB type
        tags TEXT[],                                 -- PostgreSQL array type
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Products table created successfully');
    
    // Create indexes for performance
    await client.query('CREATE INDEX idx_category ON products(category)');
    await client.query('CREATE INDEX idx_attributes ON products USING GIN (attributes)');
    await client.query('CREATE INDEX idx_tags ON products USING GIN (tags)');
    await client.query(`CREATE INDEX idx_search ON products USING GIN (to_tsvector('english', description))`);
    console.log('✅ Indexes created successfully');
    
    // Insert sample products
    console.log('📝 Inserting sample products...');
    
    await client.query(`
      INSERT INTO products (name, category, price, image_url, attributes, tags, description) VALUES
      (
        'iPhone 17 Pro',
        'Electronics',
        1099.00,
        'https://images.unsplash.com/photo-1764746218363-6cb017fcd926?w=400',
        '{"brand": "Apple", "screen": "6.3 inches", "storage": "256GB", "color": "Cosmic Orange", "chip": "A19 Pro"}',
        ARRAY['smartphone', 'premium', 'apple', '5g'],
        'Latest iPhone with A19 Pro chip and professional camera system for stunning photos'
      ),
      (
        'MacBook Pro M4 14-inch',
        'Electronics',
        1999.00,
        'https://m.media-amazon.com/images/I/61eA9PkZ07L._AC_UY436_FMwebp_QL65_.jpg?w=400',
        '{"brand": "Apple", "cpu": "M4", "ram": "16GB", "storage": "512GB", "display": "Liquid Retina XDR"}',
        ARRAY['laptop', 'premium', 'apple', 'professional'],
        'Powerful laptop for professionals with M4 chip and stunning Liquid Retina XDR display'
      ),
      (
        'AirPods Pro',
        'Electronics',
        249.00,
        'https://images.unsplash.com/photo-1588156979435-379b9d365296?w=400',
        '{"brand": "Apple", "noise_cancellation": true, "battery_life": "6 hours", "charging_case": "MagSafe"}',
        ARRAY['audio', 'premium', 'apple', 'wireless'],
        'Premium wireless earbuds with active noise cancellation and spatial audio support'
      ),
      (
        'Samsung Galaxy S23 Ultra',
        'Electronics',
        1100.00,
        'https://images.unsplash.com/photo-1678911820864-e2c567c655d7?w=400',
        '{"brand": "Samsung", "screen": "6.8 inches", "storage": "256GB", "camera": "200MP", "s_pen": true}',
        ARRAY['smartphone', 'premium', 'samsung', 'android'],
        'Flagship Android smartphone with 200MP camera, S Pen, and powerful performance'
      ),
      (
        'The Great Gatsby',
        'Books',
        12.99,
        'https://images.unsplash.com/photo-1615413833480-6e8427dbcc5e?w=400',
        '{"author": "F. Scott Fitzgerald", "pages": 180, "year": 1925, "publisher": "Scribner", "isbn": "978-0743273565"}',
        ARRAY['fiction', 'classic', 'american', 'literature'],
        'Classic American novel about the Jazz Age, wealth, and the American Dream in the 1920s'
      ),
      (
        '1984',
        'Books',
        14.99,
        'https://images.unsplash.com/photo-1622609184693-58079bb6742f?w=400',
        '{"author": "George Orwell", "pages": 328, "year": 1949, "publisher": "Secker & Warburg", "isbn": "978-0451524935"}',
        ARRAY['fiction', 'dystopian', 'classic', 'political'],
        'Dystopian novel about totalitarianism, surveillance, and the dangers of authoritarian government'
      ),
      (
        'Atomic Habits',
        'Books',
        12.99,
        'https://images.unsplash.com/photo-1686764288887-dae4e7d50d58?w=400',
        '{"author": "James Clear", "pages": 320, "year": 2018, "publisher": "Avery", "isbn": "978-0735211292"}',
        ARRAY['self-help', 'productivity', 'non-fiction', 'bestseller'],
        'Proven framework for improving every day by building better habits and breaking bad ones'
      ),
      (
        'Sony WH-1000XM4',
        'Electronics',
        349.99,
        'https://images.unsplash.com/photo-1758118107816-ddddfa3a1f44?w=400',
        '{"brand": "Sony", "noise_cancellation": true, "battery_life": "30 hours", "type": "Over-ear", "bluetooth": "5.0"}',
        ARRAY['audio', 'premium', 'wireless', 'headphones'],
        'Industry-leading noise canceling headphones with exceptional sound quality and comfort'
      ),
      (
        'Dell XPS 15',
        'Electronics',
        1599.99,
        'https://images.unsplash.com/photo-1622286346003-c5c7e63b1088?w=400',
        '{"brand": "Dell", "cpu": "Intel i7-13700H", "ram": "16GB", "storage": "512GB SSD", "gpu": "RTX 4060"}',
        ARRAY['laptop', 'windows', 'professional', 'gaming'],
        'Premium Windows laptop with stunning display and powerful performance for creative professionals'
      ),
      (
        'Thinking, Fast and Slow',
        'Books',
        18.99,
        'https://images.unsplash.com/photo-1558025623-2aafbebe8daf?w=400',
        '{"author": "Daniel Kahneman", "pages": 512, "year": 2011, "publisher": "Farrar, Straus and Giroux", "isbn": "978-0374533557"}',
        ARRAY['psychology', 'non-fiction', 'science', 'bestseller'],
        'Explores the two systems that drive the way we think and make decisions'
      )
    `);
    
    const result = await client.query('SELECT COUNT(*) FROM products');
    console.log(`✅ ${result.rows[0].count} sample products inserted`);
    
    console.log('🎉 Database setup complete!');
    
  } catch (error) {
    console.error('❌ Error setting up database:', error.message);
    console.error(error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

setupDatabase()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));