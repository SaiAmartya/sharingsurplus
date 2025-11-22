const OPENFOODFACTS_API_BASE = 'https://world.openfoodfacts.org/api/v2';

export interface ProductData {
  product_name?: string;
  brands?: string;
  quantity?: string;
  categories?: string;
  nutriments?: {
    fat?: number;
    sugars?: number;
    salt?: number;
  };
  nutriscore_grade?: string;
  nova_group?: number;
  ecoscore_grade?: string;
  allergens_tags?: string[];
  ingredients_text?: string;
  image_url?: string;
  code?: string;
}

export async function getProductByBarcode(barcode: string): Promise<ProductData | null> {
  try {
    const response = await fetch(
      `${OPENFOODFACTS_API_BASE}/product/${barcode}.json`,
      {
        headers: {
          'User-Agent': 'Shurplus - Food Sharing Platform',
        },
      }
    );

    if (!response.ok) {
      throw new Error('Product not found');
    }

    const data = await response.json();
    
    if (data.status === 1 && data.product) {
      return data.product;
    }
    
    return null;
  } catch (error) {
    console.error('Error fetching product:', error);
    return null;
  }
}

export async function searchProducts(query: string): Promise<ProductData[]> {
  try {
    const response = await fetch(
      `${OPENFOODFACTS_API_BASE}/search?search_terms=${encodeURIComponent(query)}&page_size=10`,
      {
        headers: {
          'User-Agent': 'Shurplus - Food Sharing Platform',
        },
      }
    );

    if (!response.ok) {
      throw new Error('Search failed');
    }

    const data = await response.json();
    return data.products || [];
  } catch (error) {
    console.error('Error searching products:', error);
    return [];
  }
}