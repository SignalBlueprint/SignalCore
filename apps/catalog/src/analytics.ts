/**
 * Analytics Service
 * Tracks user events, product performance, and generates insights
 */

import { randomUUID } from "crypto";
import { storage } from "@sb/storage";

// ============================================================================
// Types
// ============================================================================

export type EventType =
  | "product_view"
  | "product_search"
  | "cart_add"
  | "cart_remove"
  | "cart_update"
  | "checkout_start"
  | "checkout_complete"
  | "order_placed"
  | "order_updated"
  | "product_created"
  | "product_updated"
  | "inventory_updated";

export interface AnalyticsEvent {
  id: string;
  orgId: string;
  eventType: EventType;
  eventData: Record<string, any>;
  sessionId?: string;
  productId?: string;
  orderId?: string;
  metadata: Record<string, any>;
  createdAt: string;
}

export interface SearchAnalyticsEntry {
  id: string;
  orgId: string;
  query: string;
  searchType: "semantic" | "text" | "hybrid";
  resultsCount: number;
  filters?: {
    category?: string;
    minPrice?: number;
    maxPrice?: number;
  };
  sessionId?: string;
  clickedProducts?: string[];
  createdAt: string;
}

export interface ProductAnalytics {
  productId: string;
  orgId: string;
  date: string; // YYYY-MM-DD
  views: number;
  uniqueViews: number;
  cartAdditions: number;
  cartRemovals: number;
  timesOrdered: number;
  quantitySold: number;
  revenue: number;
  timesInSearchResults: number;
  searchClickRate: number;
  createdAt: string;
  updatedAt: string;
}

export interface DailyAnalytics {
  id: string;
  orgId: string;
  date: string; // YYYY-MM-DD

  // Revenue metrics
  totalRevenue: number;
  totalOrders: number;
  averageOrderValue: number;

  // Product metrics
  productsViewed: number;
  uniqueProductsViewed: number;
  productsAddedToCart: number;

  // Search metrics
  totalSearches: number;
  semanticSearches: number;
  searchesWithResults: number;
  averageResultsPerSearch: number;

  // Conversion metrics
  cartAdditions: number;
  checkoutStarts: number;
  ordersCompleted: number;
  conversionRate: number; // Percentage

  // Customer metrics
  uniqueSessions: number;
  newCustomers: number;
  returningCustomers: number;

  // Cart metrics
  cartsCreated: number;
  cartsAbandoned: number;
  abandonmentRate: number; // Percentage

  createdAt: string;
  updatedAt: string;
}

export interface CustomerAnalytics {
  email: string;
  orgId: string;
  totalOrders: number;
  totalSpent: number;
  averageOrderValue: number;
  firstOrderDate?: string;
  lastOrderDate?: string;
  daysSinceLastOrder?: number;
  favoriteCategories: string[];
  totalProductsPurchased: number;
  totalSessions: number;
  totalCartAdditions: number;
  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// In-Memory Storage (fallback when database is not available)
// ============================================================================

class AnalyticsStorage {
  private events: AnalyticsEvent[] = [];
  private searchEvents: SearchAnalyticsEntry[] = [];
  private productAnalytics: Map<string, ProductAnalytics> = new Map();
  private dailyAnalytics: Map<string, DailyAnalytics> = new Map();
  private customerAnalytics: Map<string, CustomerAnalytics> = new Map();

  private readonly MAX_EVENTS = 10000; // Keep last 10k events in memory

  // Track event
  async trackEvent(
    orgId: string,
    eventType: EventType,
    eventData: Record<string, any>,
    options?: {
      sessionId?: string;
      productId?: string;
      orderId?: string;
      metadata?: Record<string, any>;
    }
  ): Promise<AnalyticsEvent> {
    const event: AnalyticsEvent = {
      id: randomUUID(),
      orgId,
      eventType,
      eventData,
      sessionId: options?.sessionId,
      productId: options?.productId,
      orderId: options?.orderId,
      metadata: options?.metadata || {},
      createdAt: new Date().toISOString(),
    };

    this.events.push(event);

    // Keep only recent events to prevent memory overflow
    if (this.events.length > this.MAX_EVENTS) {
      this.events.shift();
    }

    // Update aggregates based on event type
    await this.updateAggregates(event);

    // Try to persist to storage
    try {
      await storage.set("analytics_events", event.id, event);
    } catch (error) {
      console.warn("Failed to persist analytics event:", error);
    }

    return event;
  }

  // Track search
  async trackSearch(
    orgId: string,
    query: string,
    searchType: "semantic" | "text" | "hybrid",
    resultsCount: number,
    options?: {
      filters?: SearchAnalyticsEntry["filters"];
      sessionId?: string;
      clickedProducts?: string[];
    }
  ): Promise<SearchAnalyticsEntry> {
    const entry: SearchAnalyticsEntry = {
      id: randomUUID(),
      orgId,
      query,
      searchType,
      resultsCount,
      filters: options?.filters,
      sessionId: options?.sessionId,
      clickedProducts: options?.clickedProducts,
      createdAt: new Date().toISOString(),
    };

    this.searchEvents.push(entry);

    // Keep only recent searches
    if (this.searchEvents.length > this.MAX_EVENTS) {
      this.searchEvents.shift();
    }

    // Try to persist to storage
    try {
      await storage.set("search_analytics", entry.id, entry);
    } catch (error) {
      console.warn("Failed to persist search analytics:", error);
    }

    return entry;
  }

  // Update aggregates based on event
  private async updateAggregates(event: AnalyticsEvent): Promise<void> {
    const today = new Date().toISOString().split("T")[0];

    // Update daily analytics
    const dailyKey = `${event.orgId}:${today}`;
    let daily = this.dailyAnalytics.get(dailyKey);

    if (!daily) {
      daily = this.getEmptyDailyAnalytics(event.orgId, today);
      this.dailyAnalytics.set(dailyKey, daily);
    }

    // Update metrics based on event type
    switch (event.eventType) {
      case "product_view":
        daily.productsViewed++;
        if (event.productId) {
          await this.updateProductAnalytics(event.orgId, event.productId, today, {
            views: 1,
          });
        }
        break;

      case "cart_add":
        daily.cartAdditions++;
        if (event.productId) {
          await this.updateProductAnalytics(event.orgId, event.productId, today, {
            cartAdditions: 1,
          });
        }
        break;

      case "cart_remove":
        if (event.productId) {
          await this.updateProductAnalytics(event.orgId, event.productId, today, {
            cartRemovals: 1,
          });
        }
        break;

      case "checkout_start":
        daily.checkoutStarts++;
        break;

      case "order_placed":
        daily.ordersCompleted++;
        daily.totalOrders++;
        const orderValue = event.eventData.total || 0;
        daily.totalRevenue += orderValue;
        daily.averageOrderValue =
          daily.totalOrders > 0 ? daily.totalRevenue / daily.totalOrders : 0;

        // Update customer analytics
        if (event.eventData.customer?.email) {
          await this.updateCustomerAnalytics(
            event.orgId,
            event.eventData.customer.email,
            event.eventData
          );
        }
        break;
    }

    // Calculate conversion rate
    if (daily.productsViewed > 0) {
      daily.conversionRate = (daily.ordersCompleted / daily.productsViewed) * 100;
    }

    // Calculate abandonment rate
    if (daily.checkoutStarts > 0) {
      daily.cartsAbandoned = daily.checkoutStarts - daily.ordersCompleted;
      daily.abandonmentRate = (daily.cartsAbandoned / daily.checkoutStarts) * 100;
    }

    daily.updatedAt = new Date().toISOString();
  }

  // Update product analytics
  private async updateProductAnalytics(
    orgId: string,
    productId: string,
    date: string,
    updates: Partial<{
      views: number;
      cartAdditions: number;
      cartRemovals: number;
      timesOrdered: number;
      quantitySold: number;
      revenue: number;
    }>
  ): Promise<void> {
    const key = `${productId}:${date}`;
    let analytics = this.productAnalytics.get(key);

    if (!analytics) {
      analytics = {
        productId,
        orgId,
        date,
        views: 0,
        uniqueViews: 0,
        cartAdditions: 0,
        cartRemovals: 0,
        timesOrdered: 0,
        quantitySold: 0,
        revenue: 0,
        timesInSearchResults: 0,
        searchClickRate: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      this.productAnalytics.set(key, analytics);
    }

    // Apply updates
    if (updates.views) analytics.views += updates.views;
    if (updates.cartAdditions) analytics.cartAdditions += updates.cartAdditions;
    if (updates.cartRemovals) analytics.cartRemovals += updates.cartRemovals;
    if (updates.timesOrdered) analytics.timesOrdered += updates.timesOrdered;
    if (updates.quantitySold) analytics.quantitySold += updates.quantitySold;
    if (updates.revenue) analytics.revenue += updates.revenue;

    analytics.updatedAt = new Date().toISOString();
  }

  // Update customer analytics
  private async updateCustomerAnalytics(
    orgId: string,
    email: string,
    orderData: any
  ): Promise<void> {
    const key = `${email}:${orgId}`;
    let customer = this.customerAnalytics.get(key);

    if (!customer) {
      customer = {
        email,
        orgId,
        totalOrders: 0,
        totalSpent: 0,
        averageOrderValue: 0,
        favoriteCategories: [],
        totalProductsPurchased: 0,
        totalSessions: 0,
        totalCartAdditions: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      this.customerAnalytics.set(key, customer);
    }

    customer.totalOrders++;
    customer.totalSpent += orderData.total || 0;
    customer.averageOrderValue = customer.totalSpent / customer.totalOrders;
    customer.lastOrderDate = new Date().toISOString();

    if (!customer.firstOrderDate) {
      customer.firstOrderDate = new Date().toISOString();
    }

    // Calculate days since last order
    if (customer.lastOrderDate) {
      const daysSince = Math.floor(
        (Date.now() - new Date(customer.lastOrderDate).getTime()) / (1000 * 60 * 60 * 24)
      );
      customer.daysSinceLastOrder = daysSince;
    }

    // Count products purchased
    if (orderData.items && Array.isArray(orderData.items)) {
      customer.totalProductsPurchased += orderData.items.reduce(
        (sum: number, item: any) => sum + (item.quantity || 0),
        0
      );
    }

    customer.updatedAt = new Date().toISOString();
  }

  // Get empty daily analytics
  private getEmptyDailyAnalytics(orgId: string, date: string): DailyAnalytics {
    return {
      id: randomUUID(),
      orgId,
      date,
      totalRevenue: 0,
      totalOrders: 0,
      averageOrderValue: 0,
      productsViewed: 0,
      uniqueProductsViewed: 0,
      productsAddedToCart: 0,
      totalSearches: 0,
      semanticSearches: 0,
      searchesWithResults: 0,
      averageResultsPerSearch: 0,
      cartAdditions: 0,
      checkoutStarts: 0,
      ordersCompleted: 0,
      conversionRate: 0,
      uniqueSessions: 0,
      newCustomers: 0,
      returningCustomers: 0,
      cartsCreated: 0,
      cartsAbandoned: 0,
      abandonmentRate: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }

  // Get events
  getEvents(orgId: string, filters?: { eventType?: EventType; limit?: number }): AnalyticsEvent[] {
    let filtered = this.events.filter((e) => e.orgId === orgId);

    if (filters?.eventType) {
      filtered = filtered.filter((e) => e.eventType === filters.eventType);
    }

    // Sort by most recent first
    filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    if (filters?.limit) {
      filtered = filtered.slice(0, filters.limit);
    }

    return filtered;
  }

  // Get search analytics
  getSearchAnalytics(
    orgId: string,
    options?: { limit?: number; daysBack?: number }
  ): SearchAnalyticsEntry[] {
    let filtered = this.searchEvents.filter((e) => e.orgId === orgId);

    if (options?.daysBack) {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - options.daysBack);
      filtered = filtered.filter((e) => new Date(e.createdAt) >= cutoffDate);
    }

    // Sort by most recent first
    filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    if (options?.limit) {
      filtered = filtered.slice(0, options.limit);
    }

    return filtered;
  }

  // Get top search queries
  getTopSearchQueries(
    orgId: string,
    options?: { limit?: number; daysBack?: number }
  ): Array<{ query: string; count: number; avgResults: number }> {
    const searches = this.getSearchAnalytics(orgId, { daysBack: options?.daysBack });

    const queryStats = new Map<string, { count: number; totalResults: number }>();

    searches.forEach((search) => {
      const existing = queryStats.get(search.query) || { count: 0, totalResults: 0 };
      existing.count++;
      existing.totalResults += search.resultsCount;
      queryStats.set(search.query, existing);
    });

    const results = Array.from(queryStats.entries())
      .map(([query, stats]) => ({
        query,
        count: stats.count,
        avgResults: stats.totalResults / stats.count,
      }))
      .sort((a, b) => b.count - a.count);

    return options?.limit ? results.slice(0, options.limit) : results;
  }

  // Get daily analytics
  getDailyAnalytics(
    orgId: string,
    options?: { daysBack?: number }
  ): DailyAnalytics[] {
    const filtered = Array.from(this.dailyAnalytics.values()).filter(
      (d) => d.orgId === orgId
    );

    if (options?.daysBack) {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - options.daysBack);
      const cutoffDateStr = cutoffDate.toISOString().split("T")[0];

      return filtered
        .filter((d) => d.date >= cutoffDateStr)
        .sort((a, b) => b.date.localeCompare(a.date));
    }

    return filtered.sort((a, b) => b.date.localeCompare(a.date));
  }

  // Get product analytics
  getProductAnalytics(
    productId: string,
    options?: { daysBack?: number }
  ): ProductAnalytics[] {
    const filtered = Array.from(this.productAnalytics.values()).filter(
      (p) => p.productId === productId
    );

    if (options?.daysBack) {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - options.daysBack);
      const cutoffDateStr = cutoffDate.toISOString().split("T")[0];

      return filtered
        .filter((p) => p.date >= cutoffDateStr)
        .sort((a, b) => b.date.localeCompare(a.date));
    }

    return filtered.sort((a, b) => b.date.localeCompare(a.date));
  }

  // Get top selling products
  getTopSellingProducts(
    orgId: string,
    options?: { daysBack?: number; limit?: number }
  ): Array<{
    productId: string;
    totalRevenue: number;
    quantitySold: number;
    timesOrdered: number;
  }> {
    let analytics = Array.from(this.productAnalytics.values()).filter(
      (p) => p.orgId === orgId
    );

    if (options?.daysBack) {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - options.daysBack);
      const cutoffDateStr = cutoffDate.toISOString().split("T")[0];
      analytics = analytics.filter((p) => p.date >= cutoffDateStr);
    }

    // Aggregate by product
    const productStats = new Map<
      string,
      { totalRevenue: number; quantitySold: number; timesOrdered: number }
    >();

    analytics.forEach((a) => {
      const existing = productStats.get(a.productId) || {
        totalRevenue: 0,
        quantitySold: 0,
        timesOrdered: 0,
      };
      existing.totalRevenue += a.revenue;
      existing.quantitySold += a.quantitySold;
      existing.timesOrdered += a.timesOrdered;
      productStats.set(a.productId, existing);
    });

    const results = Array.from(productStats.entries())
      .map(([productId, stats]) => ({
        productId,
        ...stats,
      }))
      .sort((a, b) => b.totalRevenue - a.totalRevenue);

    return options?.limit ? results.slice(0, options.limit) : results;
  }

  // Get customer analytics
  getCustomerAnalytics(orgId: string, options?: { limit?: number }): CustomerAnalytics[] {
    const filtered = Array.from(this.customerAnalytics.values())
      .filter((c) => c.orgId === orgId)
      .sort((a, b) => b.totalSpent - a.totalSpent);

    return options?.limit ? filtered.slice(0, options.limit) : filtered;
  }

  // Get conversion funnel
  getConversionFunnel(
    orgId: string,
    options?: { daysBack?: number }
  ): Array<{ stage: string; count: number; conversionRate: number }> {
    let events = this.events.filter((e) => e.orgId === orgId);

    if (options?.daysBack) {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - options.daysBack);
      events = events.filter((e) => new Date(e.createdAt) >= cutoffDate);
    }

    const productViews = events.filter((e) => e.eventType === "product_view").length;
    const cartAdds = events.filter((e) => e.eventType === "cart_add").length;
    const checkoutStarts = events.filter((e) => e.eventType === "checkout_start").length;
    const orders = events.filter((e) => e.eventType === "order_placed").length;

    return [
      {
        stage: "Product Views",
        count: productViews,
        conversionRate: 100,
      },
      {
        stage: "Cart Additions",
        count: cartAdds,
        conversionRate: productViews > 0 ? (cartAdds / productViews) * 100 : 0,
      },
      {
        stage: "Checkout Started",
        count: checkoutStarts,
        conversionRate: cartAdds > 0 ? (checkoutStarts / cartAdds) * 100 : 0,
      },
      {
        stage: "Orders Placed",
        count: orders,
        conversionRate: checkoutStarts > 0 ? (orders / checkoutStarts) * 100 : 0,
      },
    ];
  }
}

// ============================================================================
// Export singleton instance
// ============================================================================

export const analyticsStorage = new AnalyticsStorage();
