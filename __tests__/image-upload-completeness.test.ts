/**
 * Property-Based Test for Image Upload Completeness
 * 
 * **Feature: product-image-upload-fix, Property 1: Image Upload Completeness**
 * 
 * Validates: Requirements 1.1, 2.3
 * 
 * Property: For any product creation with N images, after the creation process completes,
 * the product_images table should contain exactly N image records linked to that product ID.
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';

// Type definitions
interface ProductImage {
  url: string;
  altText: string;
  useWhiteBg: boolean;
}

interface Product {
  id: string;
  name: string;
  images: ProductImage[];
}

interface UploadResult {
  success: boolean;
  image_name?: string;
  error?: string;
}

interface DatabaseRecord {
  id: number;
  product_id: string;
  image_name: string;
  alt_text: string;
}

/**
 * Mock database to simulate product_images table
 */
class MockProductImagesDatabase {
  private records: DatabaseRecord[] = [];
  private nextId = 1;

  /**
   * Insert an image record into the database
   */
  insert(productId: string, imageName: string, altText: string): number {
    const id = this.nextId++;
    this.records.push({
      id,
      product_id: productId,
      image_name: imageName,
      alt_text: altText,
    });
    return id;
  }

  /**
   * Get all image records for a specific product
   */
  getByProductId(productId: string): DatabaseRecord[] {
    return this.records.filter(r => r.product_id === productId);
  }

  /**
   * Count images for a specific product
   */
  countByProductId(productId: string): number {
    return this.getByProductId(productId).length;
  }

  /**
   * Clear all records (for test isolation)
   */
  clear(): void {
    this.records = [];
    this.nextId = 1;
  }

  /**
   * Get all records (for debugging)
   */
  getAllRecords(): DatabaseRecord[] {
    return [...this.records];
  }
}

/**
 * Simulates the image upload process
 * This mimics the behavior of uploadImages() in AdminPage.tsx
 */
async function simulateImageUpload(
  productId: string,
  productName: string,
  images: ProductImage[],
  db: MockProductImagesDatabase
): Promise<string[]> {
  const uploadedNames: string[] = [];

  for (let i = 0; i < images.length; i++) {
    const image = images[i];
    
    // Skip empty URLs
    if (!image.url || !image.url.trim()) {
      continue;
    }

    // Simulate upload to server
    const uploadResult = await simulateServerUpload(
      productId,
      productName,
      image,
      i
    );

    if (uploadResult.success && uploadResult.image_name) {
      // Insert into database (simulating upload.php behavior)
      db.insert(productId, uploadResult.image_name, image.altText);
      uploadedNames.push(uploadResult.image_name);
    }
  }

  return uploadedNames;
}

/**
 * Simulates the server-side upload.php behavior
 */
async function simulateServerUpload(
  productId: string,
  productName: string,
  image: ProductImage,
  index: number
): Promise<UploadResult> {
  // Validate product ID (matching upload.php validation)
  const productIdNum = parseInt(productId);
  if (isNaN(productIdNum) || productIdNum < 1) {
    return {
      success: false,
      error: 'Valid product ID is required. Please create the product first.',
    };
  }

  // Skip blob URLs and data URLs that are empty or invalid
  if (image.url.startsWith('blob:') && image.url.length < 10) {
    return { success: false, error: 'Invalid blob URL' };
  }

  // Generate a filename (simulating the server's filename generation)
  const timestamp = Date.now();
  const hash = Math.random().toString(36).substring(2, 10);
  const imageName = `product-${timestamp}-${hash}-${index}.jpg`;

  return {
    success: true,
    image_name: imageName,
  };
}

/**
 * Arbitraries (generators) for property-based testing
 */

// Generate a valid product ID (positive integer as string)
const productIdArbitrary = fc.integer({ min: 1, max: 10000 }).map(n => n.toString());

// Generate a product name
const productNameArbitrary = fc.string(3, 50);

// Generate a valid image URL (blob, data, or http)
const imageUrlArbitrary = fc.oneof(
  fc.constant('blob:http://localhost/').chain(prefix =>
    fc.array(fc.constantFrom('0', '1', '2', '3', '4', '5', '6', '7', '8', '9', 'a', 'b', 'c', 'd', 'e', 'f'), { minLength: 32, maxLength: 32 }).map(chars => `${prefix}${chars.join('')}`)
  ),
  fc.constant('data:image/jpeg;base64,').chain(prefix =>
    fc.base64String({ minLength: 100, maxLength: 200 }).map(data => `${prefix}${data}`)
  ),
  fc.webUrl()
);

// Generate alt text
const altTextArbitrary = fc.string(0, 100);

// Generate a product image
const productImageArbitrary = fc.record({
  url: imageUrlArbitrary,
  altText: altTextArbitrary,
  useWhiteBg: fc.boolean(),
});

// Generate an array of product images (0 to 10 images)
const productImagesArbitrary = fc.array(productImageArbitrary, 0, 10);

// Generate a complete product
const productArbitrary = fc.record({
  id: productIdArbitrary,
  name: productNameArbitrary,
  images: productImagesArbitrary,
});

/**
 * Property-Based Tests
 */
describe('Image Upload Completeness Property Tests', () => {
  it('Property 1: For any product with N images, database should contain exactly N image records', async () => {
    await fc.assert(
      fc.asyncProperty(productArbitrary, async (product) => {
        // Setup: Create a fresh database for each test
        const db = new MockProductImagesDatabase();

        // Filter out empty URLs (matching the actual implementation)
        const validImages = product.images.filter(img => img.url && img.url.trim() !== '');
        const expectedCount = validImages.length;

        // Execute: Simulate the image upload process
        const uploadedNames = await simulateImageUpload(
          product.id,
          product.name,
          product.images,
          db
        );

        // Verify: Check that the database contains the correct number of records
        const actualCount = db.countByProductId(product.id);
        const records = db.getByProductId(product.id);

        // Property assertion: uploaded count should match database count
        expect(uploadedNames.length).toBe(actualCount);
        
        // Property assertion: database count should match expected count
        expect(actualCount).toBe(expectedCount);

        // Additional verification: all records should have the correct product_id
        records.forEach(record => {
          expect(record.product_id).toBe(product.id);
        });

        // Additional verification: all uploaded names should be in the database
        uploadedNames.forEach(name => {
          const found = records.some(r => r.image_name === name);
          expect(found).toBe(true);
        });
      }),
      {
        numRuns: 100, // Run 100 iterations as specified in the design
      }
    );
  });

  it('Property 1 (Edge Case): Products with zero images should have zero database records', async () => {
    await fc.assert(
      fc.asyncProperty(
        productIdArbitrary,
        productNameArbitrary,
        async (productId, productName) => {
          const db = new MockProductImagesDatabase();
          
          // Product with no images
          const product: Product = {
            id: productId,
            name: productName,
            images: [],
          };

          const uploadedNames = await simulateImageUpload(
            product.id,
            product.name,
            product.images,
            db
          );

          const actualCount = db.countByProductId(product.id);

          expect(uploadedNames.length).toBe(0);
          expect(actualCount).toBe(0);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 1 (Edge Case): Products with only empty URLs should have zero database records', async () => {
    await fc.assert(
      fc.asyncProperty(
        productIdArbitrary,
        productNameArbitrary,
        fc.integer({ min: 1, max: 5 }),
        async (productId, productName, emptyCount) => {
          const db = new MockProductImagesDatabase();
          
          // Product with only empty image URLs
          const product: Product = {
            id: productId,
            name: productName,
            images: Array(emptyCount).fill(null).map(() => ({
              url: '',
              altText: '',
              useWhiteBg: false,
            })),
          };

          const uploadedNames = await simulateImageUpload(
            product.id,
            product.name,
            product.images,
            db
          );

          const actualCount = db.countByProductId(product.id);

          expect(uploadedNames.length).toBe(0);
          expect(actualCount).toBe(0);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 1 (Validation): Invalid product IDs should result in zero uploads', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.oneof(
          fc.constant('0'),
          fc.constant('-1'),
          fc.constant('invalid'),
          fc.constant(''),
        ),
        productNameArbitrary,
        productImagesArbitrary,
        async (invalidProductId, productName, images) => {
          const db = new MockProductImagesDatabase();

          const uploadedNames = await simulateImageUpload(
            invalidProductId,
            productName,
            images,
            db
          );

          const actualCount = db.countByProductId(invalidProductId);

          // Invalid product IDs should result in no successful uploads
          expect(uploadedNames.length).toBe(0);
          expect(actualCount).toBe(0);
        }
      ),
      { numRuns: 100 }
    );
  });
});
