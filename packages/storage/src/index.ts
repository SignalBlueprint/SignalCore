/**
 * @sb/storage
 * Storage abstraction for consistent entity persistence
 */

import * as fs from "fs";
import * as path from "path";
import { getSupabaseClient, isSupabaseConfigured, type SupabaseClient } from "@sb/db";

/**
 * Filter function for list operations
 */
export type StorageFilter<T> = (entity: T) => boolean;

/**
 * Storage interface - abstract storage operations
 */
export interface Storage {
  /**
   * Get a single entity by kind and id
   */
  get<T extends { id: string }>(kind: string, id: string): Promise<T | null>;

  /**
   * List entities of a kind, optionally filtered
   */
  list<T extends { id: string }>(kind: string, filter?: StorageFilter<T>): Promise<T[]>;

  /**
   * Upsert (insert or update) an entity
   */
  upsert<T extends { id: string }>(kind: string, entity: T): Promise<T>;

  /**
   * Update an entity with optimistic concurrency control
   * @param expectedUpdatedAt - The expected updatedAt timestamp (concurrency token)
   * @returns The updated entity, or throws ConflictError if version mismatch
   */
  updateWithVersion<T extends { id: string; updatedAt: string }>(
    kind: string,
    entity: T,
    expectedUpdatedAt: string
  ): Promise<T>;

  /**
   * Remove an entity by kind and id
   */
  remove(kind: string, id: string): Promise<boolean>;
}

/**
 * Conflict error thrown when optimistic concurrency check fails
 */
export class ConflictError extends Error {
  constructor(
    public readonly kind: string,
    public readonly id: string,
    public readonly expectedUpdatedAt: string,
    public readonly actualUpdatedAt: string,
    public readonly latestEntity: any
  ) {
    super(
      `Conflict: Entity ${kind}/${id} was modified. Expected updatedAt: ${expectedUpdatedAt}, actual: ${actualUpdatedAt}`
    );
    this.name = "ConflictError";
  }
}

/**
 * Local JSON file storage implementation
 * Writes to .sb/data/<kind>.json
 */
export class LocalJsonStorage implements Storage {
  private dataDir: string;
  private cache: Map<string, Map<string, any>> = new Map();

  constructor(dataDir?: string) {
    this.dataDir = dataDir || path.join(process.cwd(), ".sb", "data");
    // Ensure data directory exists
    if (!fs.existsSync(this.dataDir)) {
      fs.mkdirSync(this.dataDir, { recursive: true });
    }
  }

  private getFilePath(kind: string): string {
    return path.join(this.dataDir, `${kind}.json`);
  }

  private loadKind<T extends { id: string }>(kind: string): Map<string, T> {
    // Check cache first
    if (this.cache.has(kind)) {
      return this.cache.get(kind)!;
    }

    const filePath = this.getFilePath(kind);
    const entities = new Map<string, T>();

    if (fs.existsSync(filePath)) {
      try {
        const content = fs.readFileSync(filePath, "utf-8");
        const data: T[] = JSON.parse(content);
        for (const entity of data) {
          entities.set(entity.id, entity);
        }
      } catch (error) {
        console.error(`Error loading ${kind} from ${filePath}:`, error);
      }
    }

    // Cache the loaded data
    this.cache.set(kind, entities);
    return entities;
  }

  private saveKind<T extends { id: string }>(kind: string, entities: Map<string, T>): void {
    const filePath = this.getFilePath(kind);
    const data = Array.from(entities.values());
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf-8");
    // Update cache
    this.cache.set(kind, entities);
  }

  async get<T extends { id: string }>(kind: string, id: string): Promise<T | null> {
    const entities = this.loadKind<T>(kind);
    return entities.get(id) || null;
  }

  async list<T extends { id: string }>(kind: string, filter?: StorageFilter<T>): Promise<T[]> {
    const entities = this.loadKind<T>(kind);
    const values = Array.from(entities.values());
    
    if (filter) {
      return values.filter(filter);
    }
    
    return values;
  }

  async upsert<T extends { id: string }>(kind: string, entity: T): Promise<T> {
    const entities = this.loadKind<T>(kind);
    entities.set(entity.id, entity);
    this.saveKind(kind, entities);
    return entity;
  }

  async updateWithVersion<T extends { id: string; updatedAt: string }>(
    kind: string,
    entity: T,
    expectedUpdatedAt: string
  ): Promise<T> {
    const entities = this.loadKind<T>(kind);
    const existing = entities.get(entity.id);
    
    if (!existing) {
      // Entity doesn't exist, create it
      entities.set(entity.id, entity);
      this.saveKind(kind, entities);
      return entity;
    }
    
    // Check if updatedAt matches (optimistic concurrency check)
    const existingEntity = existing as T & { updatedAt?: string };
    if (existingEntity.updatedAt && existingEntity.updatedAt !== expectedUpdatedAt) {
      // Conflict detected - return latest entity
      throw new ConflictError(
        kind,
        entity.id,
        expectedUpdatedAt,
        existingEntity.updatedAt,
        existingEntity
      );
    }
    
    // No conflict, proceed with update
    entities.set(entity.id, entity);
    this.saveKind(kind, entities);
    return entity;
  }

  async remove(kind: string, id: string): Promise<boolean> {
    const entities = this.loadKind(kind);
    const removed = entities.delete(id);
    if (removed) {
      this.saveKind(kind, entities);
    }
    return removed;
  }
}

/**
 * Convert camelCase to snake_case
 */
function toSnakeCase(str: string): string {
  return str.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
}

/**
 * Convert object keys from camelCase to snake_case
 */
function toSnakeCaseKeys(obj: any): any {
  if (obj === null || obj === undefined) {
    return obj;
  }
  if (Array.isArray(obj)) {
    return obj.map(toSnakeCaseKeys);
  }
  if (typeof obj === "object") {
    const result: any = {};
    for (const [key, value] of Object.entries(obj)) {
      const snakeKey = toSnakeCase(key);
      result[snakeKey] = toSnakeCaseKeys(value);
    }
    return result;
  }
  return obj;
}

/**
 * Convert snake_case to camelCase
 */
function toCamelCase(str: string): string {
  return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
}

/**
 * Convert object keys from snake_case to camelCase
 */
function toCamelCaseKeys(obj: any): any {
  if (obj === null || obj === undefined) {
    return obj;
  }
  if (Array.isArray(obj)) {
    return obj.map(toCamelCaseKeys);
  }
  if (typeof obj === "object") {
    const result: any = {};
    for (const [key, value] of Object.entries(obj)) {
      const camelKey = toCamelCase(key);
      result[camelKey] = toCamelCaseKeys(value);
    }
    return result;
  }
  return obj;
}

/**
 * Supabase storage implementation
 * Stores entities in Supabase tables (one table per kind)
 * Handles snake_case (database) <-> camelCase (TypeScript) conversion
 */
export class SupabaseStorage implements Storage {
  private client: SupabaseClient;

  constructor(client?: SupabaseClient) {
    if (client) {
      this.client = client;
    } else {
      this.client = getSupabaseClient();
    }
  }

  async get<T extends { id: string }>(kind: string, id: string): Promise<T | null> {
    const { data, error } = await this.client
      .from(kind)
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        // Not found
        return null;
      }
      
      // If table doesn't exist, return null instead of throwing
      const errorMsg = (error.message || '').toLowerCase();
      const errorCode = error.code || '';
      if (errorMsg.includes('could not find the table') || 
          errorMsg.includes('relation') ||
          errorMsg.includes('does not exist') ||
          errorMsg.includes('schema cache') ||
          errorCode === '42P01' ||
          errorCode === 'PGRST202') {
        console.warn(`[SupabaseStorage] Table '${kind}' not found (${errorCode || 'unknown'}), returning null. Run docs/supabase-migrations/001_create_tables.sql to create tables.`);
        return null;
      }
      
      throw new Error(`Failed to get ${kind} ${id}: ${error.message}`);
    }

    return toCamelCaseKeys(data) as T;
  }

  async list<T extends { id: string }>(kind: string, filter?: StorageFilter<T>): Promise<T[]> {
    const { data, error } = await this.client
      .from(kind)
      .select("*");

    if (error) {
      // If table doesn't exist, return empty array instead of throwing
      // This allows graceful fallback to local storage
      const errorMsg = error.message?.toLowerCase() || '';
      const errorCode = error.code || '';
      
      if (errorMsg.includes('could not find the table') || 
          errorMsg.includes('relation') ||
          errorMsg.includes('does not exist') ||
          errorMsg.includes('schema cache') ||
          errorCode === 'PGRST116' ||
          errorCode === '42P01' ||
          errorCode === 'PGRST202') {
        console.warn(`[SupabaseStorage] Table '${kind}' not found (${error.code || 'unknown'}), returning empty list. Run the migration script to create tables.`);
        return [];
      }
      throw new Error(`Failed to list ${kind}: ${error.message}`);
    }

    let results = ((data || []) as any[]).map(toCamelCaseKeys) as T[];

    if (filter) {
      results = results.filter(filter);
    }

    return results;
  }

  async upsert<T extends { id: string }>(kind: string, entity: T): Promise<T> {
    // Convert camelCase to snake_case for database
    const dbEntity = toSnakeCaseKeys(entity);
    
    const { data, error } = await this.client
      .from(kind)
      .upsert(dbEntity, { onConflict: "id" })
      .select()
      .single();

    if (error) {
      // If table doesn't exist, throw a specific error that can trigger fallback
      const errorMsg = error.message?.toLowerCase() || '';
      const errorCode = error.code || '';
      
      // Only treat as table-not-found if it's actually a table/relation error
      // PGRST116 = row not found (not table not found) - don't fallback for this
      // 42P01 = relation does not exist (actual table not found)
      // PGRST202 = schema cache issue (might be table not found)
      // PGRST301 = RLS policy violation (don't fallback)
      // PGRST103 = permission denied (don't fallback)
      const isTableNotFound = (
        (errorMsg.includes('could not find the table') || 
         (errorMsg.includes('relation') && errorMsg.includes('does not exist')) ||
         errorCode === '42P01' ||
         errorCode === 'PGRST202') &&
        errorCode !== 'PGRST116' && // Row not found, not table not found
        errorCode !== 'PGRST301' && // RLS violation
        errorCode !== 'PGRST103'     // Permission denied
      );
      
      if (isTableNotFound) {
        // Throw a specific error that can be caught to trigger fallback
        const fallbackError = new Error(`TABLE_NOT_FOUND: ${kind}`);
        (fallbackError as any).code = 'TABLE_NOT_FOUND';
        (fallbackError as any).kind = kind;
        throw fallbackError;
      }
      
      throw new Error(`Failed to upsert ${kind} ${entity.id}: ${error.message}`);
    }

    return toCamelCaseKeys(data) as T;
  }

  async updateWithVersion<T extends { id: string; updatedAt: string }>(
    kind: string,
    entity: T,
    expectedUpdatedAt: string
  ): Promise<T> {
    // First, get the current entity to check version
    const existing = await this.get<T>(kind, entity.id);
    
    if (!existing) {
      // Entity doesn't exist, create it
      return this.upsert(kind, entity);
    }
    
    // Check if updatedAt matches (optimistic concurrency check)
    if (existing.updatedAt && existing.updatedAt !== expectedUpdatedAt) {
      // Conflict detected - return latest entity
      throw new ConflictError(
        kind,
        entity.id,
        expectedUpdatedAt,
        existing.updatedAt,
        existing
      );
    }
    
    // No conflict, proceed with update
    // Convert camelCase to snake_case for database
    const dbEntity = toSnakeCaseKeys(entity);
    
    const { data, error } = await this.client
      .from(kind)
      .update(dbEntity)
      .eq("id", entity.id)
      .eq("updated_at", expectedUpdatedAt) // Additional check at DB level
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update ${kind} ${entity.id}: ${error.message}`);
    }

    // If no rows were updated, it means the version check failed
    if (!data) {
      // Re-fetch to get latest version
      const latest = await this.get<T>(kind, entity.id);
      if (latest) {
        throw new ConflictError(
          kind,
          entity.id,
          expectedUpdatedAt,
          latest.updatedAt || "",
          latest
        );
      }
      throw new Error(`Entity ${kind}/${entity.id} not found`);
    }

    return toCamelCaseKeys(data) as T;
  }

  async remove(kind: string, id: string): Promise<boolean> {
    const { error } = await this.client
      .from(kind)
      .delete()
      .eq("id", id);

    if (error) {
      throw new Error(`Failed to remove ${kind} ${id}: ${error.message}`);
    }

    // Supabase delete returns success even if row doesn't exist
    // We'd need to check affected rows, but for now return true
    return true;
  }
}

/**
 * Get the appropriate storage instance
 * Uses Supabase if configured, otherwise falls back to LocalJsonStorage
 */
// Cache for storage instance to avoid recreating
let storageInstance: Storage | null = null;
let storageMode: 'supabase' | 'local' = 'local';
// Track which tables have failed (so we can fallback per-table)
const failedTables = new Set<string>();

export function getStorage(): Storage {
  // Return cached instance if available
  if (storageInstance) {
    return storageInstance;
  }

  // Check if local storage is forced via environment variable or storageMode
  const forceLocal = process.env.STORAGE_MODE === 'local' || process.env.FORCE_LOCAL_STORAGE === 'true' || storageMode === 'local';
  
  if (forceLocal) {
    console.log("[@sb/storage] Using local storage (forced via STORAGE_MODE=local or fallback)");
    storageInstance = new LocalJsonStorage();
    storageMode = 'local';
    return storageInstance;
  }

  if (isSupabaseConfigured()) {
    try {
      const supabaseStorage = new SupabaseStorage();
      storageInstance = supabaseStorage;
      storageMode = 'supabase';
      return storageInstance;
    } catch (error) {
      console.warn("Failed to initialize Supabase storage, falling back to local:", error);
      storageInstance = new LocalJsonStorage();
      storageMode = 'local';
      return storageInstance;
    }
  }
  
  storageInstance = new LocalJsonStorage();
  storageMode = 'local';
  return storageInstance;
}

/**
 * Reset storage instance (useful for fallback scenarios)
 */
export function resetStorage(): void {
  storageInstance = null;
  storageMode = 'local';
  failedTables.clear();
}

/**
 * Reset storage back to Supabase mode (if configured)
 * Use this if you've run migrations and want to switch back from local storage
 */
export function resetToSupabase(): void {
  storageInstance = null;
  storageMode = 'supabase';
  failedTables.clear();
  // Force re-initialization
  getStorage();
}

/**
 * Storage wrapper that handles table-not-found errors by falling back to local storage
 */
class StorageWrapper implements Storage {
  private instance: Storage;

  constructor() {
    this.instance = getStorage();
  }

  private async handleTableError<T>(operation: () => Promise<T>, retryOperation?: () => Promise<T>): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      // Check if this is a table-not-found error and we're using Supabase
      if (error instanceof Error && ((error as any).code === 'TABLE_NOT_FOUND' || error.message.includes('TABLE_NOT_FOUND')) && storageMode === 'supabase') {
        const kind = (error as any).kind || 'unknown';
        
        // Only fallback if we haven't already failed for this table
        // This prevents infinite loops
        if (!failedTables.has(kind)) {
          failedTables.add(kind);
          console.warn(`[@sb/storage] Table '${kind}' operation failed in Supabase.`);
          console.warn(`[@sb/storage] Error: ${error.message}`);
          console.warn(`[@sb/storage] This might be due to: missing table, RLS policies, or permissions.`);
          console.warn(`[@sb/storage] Falling back to local storage for ALL tables.`);
          console.warn(`[@sb/storage] NOTE: If your table exists, check RLS policies.`);
          console.warn(`[@sb/storage] To reset back to Supabase, restart the server or call resetToSupabase().`);
          
          // Reset and switch to local storage globally
          // This is simpler than per-table fallback, but means all tables use local storage
          resetStorage();
          this.instance = getStorage();
        }
        
        // Retry the operation with local storage
        try {
          if (retryOperation) {
            return await retryOperation();
          }
          // If no retry operation, try the original (it should now use the new instance)
          return await operation();
        } catch (retryError) {
          // If retry also fails, throw the original error
          throw error;
        }
      }
      throw error;
    }
  }

  async get<T extends { id: string }>(kind: string, id: string): Promise<T | null> {
    return this.handleTableError(
      () => this.instance.get<T>(kind, id),
      () => {
        const currentInstance = this.instance;
        return currentInstance.get<T>(kind, id);
      }
    );
  }

  async list<T extends { id: string }>(kind: string, filter?: StorageFilter<T>): Promise<T[]> {
    return this.handleTableError(
      () => this.instance.list<T>(kind, filter),
      () => {
        const currentInstance = this.instance;
        return currentInstance.list<T>(kind, filter);
      }
    );
  }

  async upsert<T extends { id: string }>(kind: string, entity: T): Promise<T> {
    return this.handleTableError(
      () => this.instance.upsert(kind, entity),
      () => {
        // After fallback, this.instance will be the new local storage instance
        const currentInstance = this.instance;
        return currentInstance.upsert(kind, entity);
      }
    );
  }

  async updateWithVersion<T extends { id: string; updatedAt: string }>(
    kind: string,
    entity: T,
    expectedUpdatedAt: string
  ): Promise<T> {
    return this.handleTableError(
      () => this.instance.updateWithVersion(kind, entity, expectedUpdatedAt),
      () => {
        const currentInstance = this.instance;
        return currentInstance.updateWithVersion(kind, entity, expectedUpdatedAt);
      }
    );
  }

  async remove(kind: string, id: string): Promise<boolean> {
    return this.handleTableError(
      () => this.instance.remove(kind, id),
      () => {
        const currentInstance = this.instance;
        return currentInstance.remove(kind, id);
      }
    );
  }
}

/**
 * Default storage instance
 * Automatically selects Supabase if configured, otherwise uses LocalJsonStorage
 * Handles table-not-found errors by falling back to local storage
 */
export const storage = new StorageWrapper();

/**
 * Get storage information (mode and configuration details)
 */
export function getStorageInfo(): {
  mode: "LocalJson" | "Supabase";
  config: {
    dataDir?: string;
    supabaseUrl?: string;
  };
} {
  if (isSupabaseConfigured()) {
    try {
      const url = process.env.SUPABASE_URL;
      return {
        mode: "Supabase",
        config: {
          supabaseUrl: url || undefined,
        },
      };
    } catch {
      // Fall through to LocalJson
    }
  }

  // Default to LocalJson
  const dataDir = path.join(process.cwd(), ".sb", "data");
  return {
    mode: "LocalJson",
    config: {
      dataDir,
    },
  };
}

// Export file storage functionality
export * from "./file-storage";

