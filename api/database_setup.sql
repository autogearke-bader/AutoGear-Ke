-- Database setup for AutoGear Ke - Updated with Articles/Blogs
-- Run this SQL script in your MySQL database (via phpMyAdmin, command line, or Hostinger's database tools)

-- Create products table
CREATE TABLE IF NOT EXISTS products (
    id INT AUTO_INCREMENT PRIMARY KEY,
    slug VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    price INT NOT NULL,
    description TEXT,
    category VARCHAR(100),
    stock_status VARCHAR(50) DEFAULT 'In Stock',
    images JSON,
    has_installation BOOLEAN DEFAULT FALSE,
    is_new BOOLEAN DEFAULT FALSE,
    video_url VARCHAR(500),
    youtube_url VARCHAR(500),
    instagram_url VARCHAR(500),
    tiktok_url VARCHAR(500),
    use_white_bg BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Create product_images table for BLOB storage
CREATE TABLE IF NOT EXISTS product_images (
    id INT AUTO_INCREMENT PRIMARY KEY,
    product_id INT NOT NULL,
    image_name VARCHAR(255) NOT NULL,
    image_data LONGBLOB NOT NULL,
    alt_text VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    UNIQUE KEY unique_product_image (product_id, image_name)
);

-- Create article_images table for BLOB storage (NEW)
CREATE TABLE IF NOT EXISTS article_images (
    id INT AUTO_INCREMENT PRIMARY KEY,
    article_id INT NOT NULL,
    image_name VARCHAR(255) NOT NULL,
    image_data LONGBLOB NOT NULL,
    alt_text VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (article_id) REFERENCES articles(id) ON DELETE CASCADE,
    UNIQUE KEY unique_article_image (article_id, image_name)
);

-- Create bundles table
CREATE TABLE IF NOT EXISTS bundles (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    products JSON NOT NULL,
    total_price INT NOT NULL,
    original_price INT NOT NULL,
    has_installation BOOLEAN DEFAULT FALSE,
    category VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Create featured_items table
CREATE TABLE IF NOT EXISTS featured_items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    type VARCHAR(50) NOT NULL, -- 'trending', 'value_bundle', 'featured_article', 'featured_car_article', 'featured_mobile_article'
    item_id VARCHAR(255) NOT NULL, -- product id, bundle id, or article id
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY unique_featured_item (type, item_id)
);

-- ============================================
-- CATEGORIES TABLE - NEW
-- ============================================
CREATE TABLE IF NOT EXISTS categories (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    slug VARCHAR(255) NOT NULL UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- BRANDS TABLE - NEW
-- ============================================
CREATE TABLE IF NOT EXISTS brands (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    slug VARCHAR(255) NOT NULL UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- ARTICLES TABLE - NEW
-- ============================================
CREATE TABLE IF NOT EXISTS articles (
    id INT AUTO_INCREMENT PRIMARY KEY,
    slug VARCHAR(255) UNIQUE NOT NULL,
    title VARCHAR(255) NOT NULL,
    featured_image VARCHAR(500),
    content LONGTEXT NOT NULL, -- Rich text content (HTML from Quill)
    excerpt TEXT, -- Short description for card preview
    
    -- SEO Fields
    meta_description VARCHAR(500),
    seo_keywords VARCHAR(500),
    
    -- Categorization
    category VARCHAR(100), -- e.g., 'Smart Car Tech', 'Fast Charging', 'Interior comfort'
    brand VARCHAR(100), -- e.g., 'Oraimo', 'JBL', 'Samsung', etc. for filtering
    
    -- Related Items (JSON arrays of IDs)
    related_products JSON, -- Array of product IDs
    related_bundles JSON, -- Array of bundle IDs
    
    -- Metadata
    is_published BOOLEAN DEFAULT TRUE,
    is_featured_homepage BOOLEAN DEFAULT FALSE,  -- Show on Homepage "Latest Insights"
    is_featured_car BOOLEAN DEFAULT FALSE,       -- Show on Car Accessories Page
    is_featured_mobile BOOLEAN DEFAULT FALSE,    -- Show on Mobile Accessories Page
    published_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- ============================================
-- ARTICLE-BRAND RELATIONSHIP TABLE - NEW
-- ============================================
CREATE TABLE IF NOT EXISTS article_brands (
    id INT AUTO_INCREMENT PRIMARY KEY,
    article_id INT NOT NULL,
    brand_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (article_id) REFERENCES articles(id) ON DELETE CASCADE,
    FOREIGN KEY (brand_id) REFERENCES brands(id) ON DELETE CASCADE,
    UNIQUE KEY unique_article_brand (article_id, brand_id)
);

-- Create indexes for performance (use IF NOT EXISTS to avoid duplicates)
CREATE INDEX IF NOT EXISTS idx_categories_slug ON categories(slug);
CREATE INDEX IF NOT EXISTS idx_brands_slug ON brands(slug);
CREATE INDEX IF NOT EXISTS idx_article_brands_article ON article_brands(article_id);
CREATE INDEX IF NOT EXISTS idx_article_brands_brand ON article_brands(brand_id);

-- Create indexes for articles
CREATE INDEX IF NOT EXISTS idx_articles_brand ON articles(brand);
CREATE INDEX IF NOT EXISTS idx_articles_category ON articles(category);
CREATE INDEX IF NOT EXISTS idx_articles_published ON articles(is_published);
CREATE INDEX IF NOT EXISTS idx_articles_featured_homepage ON articles(is_featured_homepage);
CREATE INDEX IF NOT EXISTS idx_articles_featured_car ON articles(is_featured_car);
CREATE INDEX IF NOT EXISTS idx_articles_featured_mobile ON articles(is_featured_mobile);
CREATE INDEX IF NOT EXISTS idx_articles_slug ON articles(slug);

-- Optional: Insert some sample blog articles (remove or modify as needed)
-- INSERT INTO articles (title, slug, content, category, brand, meta_description, seo_keywords) VALUES
-- ('Getting Started with Smart Car Tech', 'getting-started-smart-car-tech', '<p>Smart car technology is revolutionizing how we drive...</p>', 'Smart Car Tech', 'General', 'Discover the best smart car tech upgrades for your vehicle.', 'smart car tech, car gadgets, auto tech'),
-- ('Best Car Chargers for Long Road Trips', 'best-car-chargers-road-trips', '<p>Long road trips require reliable charging solutions...</p>', 'Fast Charging', 'Anker', 'Top car chargers for long journeys in Kenya.', 'car charger, road trip, Anker, fast charging');
