// Intelligent request batching to reduce duplicate API calls
import { EventEmitter } from 'events';

interface BatchRequest<T> {
  key: string;
  resolve: (result: T) => void;
  reject: (error: Error) => void;
}

class RequestBatcher<T> extends EventEmitter {
  private batchQueue: Map<string, BatchRequest<T>[]> = new Map();
  private batchTimers: Map<string, NodeJS.Timeout> = new Map();
  private processingKeys: Set<string> = new Set();
  
  constructor(
    private batchProcessor: (keys: string[]) => Promise<Map<string, T>>,
    private batchDelay: number = 50, // 50ms delay for batching
    private maxBatchSize: number = 10
  ) {
    super();
  }
  
  async request(key: string): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      // If already processing this key, wait for result
      if (this.processingKeys.has(key)) {
        this.once(`result:${key}`, resolve);
        this.once(`error:${key}`, reject);
        return;
      }
      
      // Add to batch queue
      if (!this.batchQueue.has(key)) {
        this.batchQueue.set(key, []);
      }
      
      this.batchQueue.get(key)!.push({ key, resolve, reject });
      
      // Schedule batch processing
      this.scheduleBatch(key);
    });
  }
  
  private scheduleBatch(key: string) {
    // Clear existing timer for this key
    if (this.batchTimers.has(key)) {
      clearTimeout(this.batchTimers.get(key)!);
    }
    
    // Schedule new batch processing
    const timer = setTimeout(() => {
      this.processBatch();
    }, this.batchDelay);
    
    this.batchTimers.set(key, timer);
  }
  
  private async processBatch() {
    const keysToProcess: string[] = [];
    const requestsToProcess: BatchRequest<T>[] = [];
    
    // Collect all pending requests
    for (const key of Array.from(this.batchQueue.keys())) {
      if (!this.processingKeys.has(key)) {
        const requests = this.batchQueue.get(key)!;
        keysToProcess.push(key);
        requestsToProcess.push(...requests);
        this.processingKeys.add(key);
        
        // Limit batch size
        if (keysToProcess.length >= this.maxBatchSize) {
          break;
        }
      }
    }
    
    if (keysToProcess.length === 0) {
      return;
    }
    
    // Clear processed keys from queue
    keysToProcess.forEach(key => {
      this.batchQueue.delete(key);
      this.batchTimers.delete(key);
    });
    
    try {
      // Process batch
      const results = await this.batchProcessor(keysToProcess);
      
      // Resolve all requests
      requestsToProcess.forEach(request => {
        const result = results.get(request.key);
        if (result !== undefined) {
          request.resolve(result);
          this.emit(`result:${request.key}`, result);
        } else {
          request.reject(new Error(`No result for key: ${request.key}`));
          this.emit(`error:${request.key}`, new Error(`No result for key: ${request.key}`));
        }
      });
      
    } catch (error) {
      // Reject all requests on batch failure
      requestsToProcess.forEach(request => {
        request.reject(error as Error);
        this.emit(`error:${request.key}`, error);
      });
    } finally {
      // Mark keys as no longer processing
      keysToProcess.forEach(key => {
        this.processingKeys.delete(key);
      });
    }
  }
  
  // Get statistics for monitoring
  getStats() {
    return {
      queuedRequests: Array.from(this.batchQueue.values()).flat().length,
      processingKeys: this.processingKeys.size,
      pendingBatches: this.batchTimers.size
    };
  }
}

// Specific batcher for Karma GAP requests
export const karmaBatcher = new RequestBatcher<string | null>(
  async (projectNames: string[]) => {
    const { searchKarmaProjectsBatch } = await import('./karma.js');
    return await searchKarmaProjectsBatch(projectNames);
  },
  100, // 100ms delay for Karma requests
  5    // Max 5 projects per batch for Karma
);

// Export function for use in adapters
export async function getKarmaUIDWithBatching(projectName: string): Promise<string | null> {
  return await karmaBatcher.request(projectName);
}