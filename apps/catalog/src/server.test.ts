/**
 * Semantic Search Tests
 * Integration tests for semantic search functionality
 */

import { describe, it, expect, beforeAll } from "vitest";

describe("Semantic Search API", () => {
  const API_BASE = "http://localhost:3002/api";

  describe("POST /api/products/search", () => {
    it("should return search results with semantic embeddings", async () => {
      const response = await fetch(`${API_BASE}/products/search`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: "blue shirt",
          orgId: "default-org",
          limit: 10,
          threshold: 0.4,
        }),
      });

      expect(response.status).toBe(200);
      const data = await response.json();

      expect(data).toHaveProperty("query");
      expect(data).toHaveProperty("total");
      expect(data).toHaveProperty("threshold");
      expect(data).toHaveProperty("filters");
      expect(data).toHaveProperty("results");
      expect(Array.isArray(data.results)).toBe(true);

      // Check that results have similarity scores
      if (data.results.length > 0) {
        const firstResult = data.results[0];
        expect(firstResult).toHaveProperty("_similarity");
        expect(firstResult).toHaveProperty("_relevanceScore");
        expect(typeof firstResult._similarity).toBe("number");
        expect(typeof firstResult._relevanceScore).toBe("number");
      }
    });

    it("should apply category filters", async () => {
      const response = await fetch(`${API_BASE}/products/search`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: "clothing",
          category: "Electronics",
          orgId: "default-org",
        }),
      });

      expect(response.status).toBe(200);
      const data = await response.json();

      expect(data.filters.category).toBe("Electronics");
    });

    it("should apply price range filters", async () => {
      const response = await fetch(`${API_BASE}/products/search`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: "product",
          minPrice: 10,
          maxPrice: 100,
          orgId: "default-org",
        }),
      });

      expect(response.status).toBe(200);
      const data = await response.json();

      expect(data.filters.minPrice).toBe(10);
      expect(data.filters.maxPrice).toBe(100);

      // Verify all results are within price range
      data.results.forEach((product: any) => {
        if (product.price) {
          expect(product.price).toBeGreaterThanOrEqual(10);
          expect(product.price).toBeLessThanOrEqual(100);
        }
      });
    });

    it("should respect threshold parameter", async () => {
      const response = await fetch(`${API_BASE}/products/search`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: "test product",
          threshold: 0.8, // High threshold
          orgId: "default-org",
        }),
      });

      expect(response.status).toBe(200);
      const data = await response.json();

      expect(data.threshold).toBe(0.8);

      // All results should have similarity above threshold
      data.results.forEach((product: any) => {
        expect(product._similarity).toBeGreaterThan(0.8);
      });
    });

    it("should return error when query is missing", async () => {
      const response = await fetch(`${API_BASE}/products/search`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orgId: "default-org",
        }),
      });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data).toHaveProperty("error");
      expect(data.error).toContain("required");
    });
  });

  describe("GET /api/products/:id/similar", () => {
    it("should return similar products based on embeddings", async () => {
      // First, get a product ID (assuming there are products in the system)
      const productsResponse = await fetch(`${API_BASE}/products?orgId=default-org`);
      const products = await productsResponse.json();

      if (products.length === 0) {
        console.log("Skipping test - no products available");
        return;
      }

      const productId = products[0].id;

      const response = await fetch(`${API_BASE}/products/${productId}/similar?limit=5&threshold=0.6`);

      if (response.status === 400) {
        // Product doesn't have embedding, which is valid
        const data = await response.json();
        expect(data.error).toContain("embedding");
        return;
      }

      expect(response.status).toBe(200);
      const data = await response.json();

      expect(data).toHaveProperty("sourceProduct");
      expect(data).toHaveProperty("total");
      expect(data).toHaveProperty("threshold");
      expect(data).toHaveProperty("results");
      expect(Array.isArray(data.results)).toBe(true);

      // Check similarity scores
      data.results.forEach((product: any) => {
        expect(product).toHaveProperty("_similarity");
        expect(product).toHaveProperty("_relevanceScore");
        expect(product._similarity).toBeGreaterThan(0.6);
      });
    });

    it("should return 404 for non-existent product", async () => {
      const response = await fetch(`${API_BASE}/products/non-existent-id/similar`);

      expect(response.status).toBe(404);
      const data = await response.json();
      expect(data).toHaveProperty("error");
    });
  });

  describe("GET /api/analytics/search", () => {
    it("should return search analytics", async () => {
      const response = await fetch(`${API_BASE}/analytics/search?orgId=default-org&limit=100`);

      expect(response.status).toBe(200);
      const data = await response.json();

      expect(data).toHaveProperty("summary");
      expect(data).toHaveProperty("topQueries");
      expect(data).toHaveProperty("recentSearches");

      expect(data.summary).toHaveProperty("totalSearches");
      expect(data.summary).toHaveProperty("semanticSearches");
      expect(data.summary).toHaveProperty("textSearches");
      expect(data.summary).toHaveProperty("avgResults");

      expect(typeof data.summary.totalSearches).toBe("number");
      expect(typeof data.summary.semanticSearches).toBe("number");
      expect(typeof data.summary.textSearches).toBe("number");
      expect(typeof data.summary.avgResults).toBe("number");

      expect(Array.isArray(data.topQueries)).toBe(true);
      expect(Array.isArray(data.recentSearches)).toBe(true);
    });

    it("should return analytics after performing searches", async () => {
      // Perform a test search
      await fetch(`${API_BASE}/products/search`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: "test analytics query",
          orgId: "default-org",
        }),
      });

      // Get analytics
      const response = await fetch(`${API_BASE}/analytics/search?orgId=default-org`);
      const data = await response.json();

      expect(data.summary.totalSearches).toBeGreaterThan(0);
      expect(data.recentSearches.length).toBeGreaterThan(0);

      // Check structure of recent searches
      const recentSearch = data.recentSearches[0];
      expect(recentSearch).toHaveProperty("id");
      expect(recentSearch).toHaveProperty("query");
      expect(recentSearch).toHaveProperty("searchMode");
      expect(recentSearch).toHaveProperty("resultCount");
      expect(recentSearch).toHaveProperty("timestamp");
      expect(recentSearch).toHaveProperty("orgId");
    });
  });

  describe("Cosine Similarity Calculation", () => {
    it("should return results sorted by similarity (descending)", async () => {
      const response = await fetch(`${API_BASE}/products/search`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: "product",
          orgId: "default-org",
          limit: 10,
          threshold: 0.3,
        }),
      });

      expect(response.status).toBe(200);
      const data = await response.json();

      if (data.results.length > 1) {
        // Verify results are sorted by similarity in descending order
        for (let i = 0; i < data.results.length - 1; i++) {
          expect(data.results[i]._similarity).toBeGreaterThanOrEqual(
            data.results[i + 1]._similarity
          );
        }
      }
    });

    it("should calculate relevance score as percentage", async () => {
      const response = await fetch(`${API_BASE}/products/search`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: "product",
          orgId: "default-org",
        }),
      });

      expect(response.status).toBe(200);
      const data = await response.json();

      data.results.forEach((product: any) => {
        // Relevance score should be roughly similarity * 100
        const expectedScore = Math.round(product._similarity * 100);
        expect(product._relevanceScore).toBe(expectedScore);
        expect(product._relevanceScore).toBeGreaterThanOrEqual(0);
        expect(product._relevanceScore).toBeLessThanOrEqual(100);
      });
    });
  });
});
