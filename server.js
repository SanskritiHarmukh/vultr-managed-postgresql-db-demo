const express = require('express');
const pool = require('./db');
const path = require('path');

const app = express();

// Middleware
app.use(express.json());
app.use(express.static('public'));

// ======================
// PRODUCT ENDPOINTS
// ======================

// Get all products (with optional filters)
app.get('/products', async (req, res) => {
  try {
    const { category, tag, search, attribute, attrValue } = req.query;
    
    let query = 'SELECT * FROM products WHERE 1=1';
    const params = [];
    let paramCount = 1;
    
    // Filter by category
    if (category) {
      query += ` AND category = $${paramCount}`;
      params.push(category);
      paramCount++;
    }
    
    // Filter by tag (PostgreSQL array operator)
    if (tag) {
      query += ` AND $${paramCount} = ANY(tags)`;
      params.push(tag);
      paramCount++;
    }
    
    // Full-text search
    if (search) {
      query += ` AND to_tsvector('english', description) @@ plainto_tsquery('english', $${paramCount})`;
      params.push(search);
      paramCount++;
    }
    
    // Filter by JSON attribute
    if (attribute && attrValue) {
      query += ` AND attributes->>'${attribute}' = $${paramCount}`;
      params.push(attrValue);
      paramCount++;
    }
    
    query += ' ORDER BY created_at DESC';
    
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching products:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Search products with ranking (full-text search)
app.get('/products/search', async (req, res) => {
  try {
    const { q } = req.query;
    
    if (!q) {
      return res.status(400).json({ error: 'Search query required' });
    }
    
    const result = await pool.query(`
      SELECT 
        *,
        ts_rank(to_tsvector('english', description), plainto_tsquery('english', $1)) as rank
      FROM products
      WHERE to_tsvector('english', description) @@ plainto_tsquery('english', $1)
      ORDER BY rank DESC, created_at DESC
    `, [q]);
    
    res.json(result.rows);
  } catch (error) {
    console.error('Error searching products:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Get single product
app.get('/products/:id', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM products WHERE id = $1',
      [req.params.id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching product:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Create new product
app.post('/products', async (req, res) => {
  try {
    const { name, category, price, image_url, attributes, tags, description } = req.body;
    
    if (!name || !category || !price) {
      return res.status(400).json({ error: 'Name, category, and price are required' });
    }
    
    const result = await pool.query(`
      INSERT INTO products (name, category, price, image_url, attributes, tags, description)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `, [
      name,
      category,
      price,
      image_url || null,
      attributes || {},
      tags || [],
      description || ''
    ]);
    
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating product:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Update product
app.put('/products/:id', async (req, res) => {
  try {
    const { name, category, price, image_url, attributes, tags, description } = req.body;
    const { id } = req.params;
    
    const result = await pool.query(`
      UPDATE products
      SET name = COALESCE($1, name),
          category = COALESCE($2, category),
          price = COALESCE($3, price),
          image_url = COALESCE($4, image_url),
          attributes = COALESCE($5, attributes),
          tags = COALESCE($6, tags),
          description = COALESCE($7, description)
      WHERE id = $8
      RETURNING *
    `, [name, category, price, image_url, attributes, tags, description, id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating product:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Delete product
app.delete('/products/:id', async (req, res) => {
  try {
    const result = await pool.query(
      'DELETE FROM products WHERE id = $1 RETURNING id',
      [req.params.id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }
    
    res.json({ message: 'Product deleted successfully', id: parseInt(req.params.id) });
  } catch (error) {
    console.error('Error deleting product:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Get unique categories
app.get('/categories', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT DISTINCT category FROM products ORDER BY category'
    );
    res.json(result.rows.map(r => r.category));
  } catch (error) {
    console.error('Error fetching categories:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Get unique tags
app.get('/tags', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT DISTINCT unnest(tags) as tag
      FROM products
      ORDER BY tag
    `);
    res.json(result.rows.map(r => r.tag));
  } catch (error) {
    console.error('Error fetching tags:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// ======================
// START SERVER
// ======================
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════════╗
║   🚀 Vultr PostgreSQL Demo - Product Catalog      ║
║   📋 http://localhost:${PORT}                     ║
╚═══════════════════════════════════════════════════╝
  `);
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Shutting down...');
  await pool.end();
  process.exit(0);
});