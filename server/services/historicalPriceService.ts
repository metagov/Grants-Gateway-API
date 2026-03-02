// Historical price data service for accurate currency conversions
import { SmartCache } from './cache.js';

interface PriceData {
  timestamp: string;
  price_usd: number;
  source: string;
}

interface TokenPriceHistory {
  token: string;
  prices: Map<string, PriceData>; // date -> price data
}

class HistoricalPriceService {
  private priceCache = new SmartCache<TokenPriceHistory>(24 * 60 * 60 * 1000); // 24 hours
  private dailyPriceCache = new SmartCache<number>(60 * 60 * 1000); // 1 hour for daily prices

  // Supported tokens and their CoinGecko IDs
  private readonly TOKEN_IDS = {
    'ETH': 'ethereum',
    'BTC': 'bitcoin',
    'XLM': 'stellar',
    'USDC': 'usd-coin',
    'USDT': 'tether',
    'DAI': 'dai',
    'OP': 'optimism',
    'ARB': 'arbitrum'
  };

  // Get historical price for a specific date
  async getHistoricalPrice(token: string, date: string): Promise<number | null> {
    const tokenId = this.TOKEN_IDS[token.toUpperCase() as keyof typeof this.TOKEN_IDS];
    if (!tokenId) {
      console.warn(`Unsupported token: ${token}`);
      return null;
    }

    const cacheKey = `${token}-${date}`;
    const cached = this.dailyPriceCache.get(cacheKey);
    if (cached) return cached;

    try {
      // Format date for CoinGecko API (DD-MM-YYYY)
      const dateObj = new Date(date);
      const formattedDate = `${dateObj.getDate().toString().padStart(2, '0')}-${(dateObj.getMonth() + 1).toString().padStart(2, '0')}-${dateObj.getFullYear()}`;

      // Use CoinGecko historical data endpoint
      const response = await fetch(
        `https://api.coingecko.com/api/v3/coins/${tokenId}/history?date=${formattedDate}`
      );

      if (!response.ok) {
        throw new Error(`CoinGecko API returned ${response.status}`);
      }

      const data = await response.json();
      const price = data.market_data?.current_price?.usd;

      if (price) {
        this.dailyPriceCache.set(cacheKey, price);
        return price;
      }

      return null;
    } catch (error) {
      console.error(`Error fetching historical price for ${token} on ${date}:`, error);
      
      // Fallback to current price if historical fails
      try {
        const currentPrice = await this.getCurrentPrice(token);
        if (currentPrice) {
          console.warn(`Using current price as fallback for ${token} on ${date}`);
          return currentPrice;
        }
      } catch (fallbackError) {
        console.error(`Fallback price fetch also failed:`, fallbackError);
      }

      return null;
    }
  }

  // Get current price for a token
  async getCurrentPrice(token: string): Promise<number | null> {
    const tokenId = this.TOKEN_IDS[token.toUpperCase() as keyof typeof this.TOKEN_IDS];
    if (!tokenId) return null;

    const cacheKey = `current-${token}`;
    const cached = this.dailyPriceCache.get(cacheKey);
    if (cached) return cached;

    try {
      const response = await fetch(
        `https://api.coingecko.com/api/v3/simple/price?ids=${tokenId}&vs_currencies=usd`
      );

      if (!response.ok) {
        throw new Error(`CoinGecko API returned ${response.status}`);
      }

      const data = await response.json();
      const price = data[tokenId]?.usd;

      if (price) {
        this.dailyPriceCache.set(cacheKey, price, 5 * 60 * 1000); // 5 minutes for current prices
        return price;
      }

      return null;
    } catch (error) {
      console.error(`Error fetching current price for ${token}:`, error);
      return null;
    }
  }

  // Convert amount from one currency to USD at a specific date
  async convertToUSD(amount: string | number, fromToken: string, date?: string): Promise<number | null> {
    const numericAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
    if (isNaN(numericAmount) || numericAmount === 0) return 0;

    // If it's already USD, return as-is
    if (fromToken.toUpperCase() === 'USD') return numericAmount;

    try {
      const price = date 
        ? await this.getHistoricalPrice(fromToken, date)
        : await this.getCurrentPrice(fromToken);

      if (price === null) {
        console.warn(`Could not get price for ${fromToken}${date ? ` on ${date}` : ''}`);
        return null;
      }

      return numericAmount * price;
    } catch (error) {
      console.error(`Error converting ${amount} ${fromToken} to USD:`, error);
      return null;
    }
  }

  // Convert Wei to USD (for Ethereum-based tokens)
  async convertWeiToUSD(weiAmount: string, date?: string): Promise<number | null> {
    try {
      const ethAmount = parseInt(weiAmount) / 1e18;
      return await this.convertToUSD(ethAmount, 'ETH', date);
    } catch (error) {
      console.error(`Error converting wei to USD:`, error);
      return null;
    }
  }

  // Batch convert multiple amounts (for efficiency)
  async batchConvertToUSD(conversions: Array<{
    amount: string | number;
    token: string;
    date?: string;
  }>): Promise<Array<number | null>> {
    // Group by token and date to minimize API calls
    const priceRequests = new Map<string, Promise<number | null>>();

    for (const conversion of conversions) {
      const key = `${conversion.token}-${conversion.date || 'current'}`;
      if (!priceRequests.has(key)) {
        priceRequests.set(key,
          conversion.date
            ? this.getHistoricalPrice(conversion.token, conversion.date)
            : this.getCurrentPrice(conversion.token)
        );
      }
    }

    // Wait for all price requests
    const priceResults = await Promise.allSettled(Array.from(priceRequests.values()));
    const priceMap = new Map<string, number | null>();

    let index = 0;
    for (const key of Array.from(priceRequests.keys())) {
      const result = priceResults[index];
      priceMap.set(key, result.status === 'fulfilled' ? result.value : null);
      index++;
    }

    // Convert amounts using cached prices
    return conversions.map(conversion => {
      const numericAmount = typeof conversion.amount === 'string' ? parseFloat(conversion.amount) : conversion.amount;
      if (isNaN(numericAmount) || numericAmount === 0) return 0;
      if (conversion.token.toUpperCase() === 'USD') return numericAmount;

      const key = `${conversion.token}-${conversion.date || 'current'}`;
      const price = priceMap.get(key);

      return price !== null && price !== undefined ? numericAmount * price : null;
    });
  }

  // Get price history for a token over a date range
  async getPriceHistory(token: string, startDate: string, endDate: string): Promise<PriceData[]> {
    const tokenId = this.TOKEN_IDS[token.toUpperCase() as keyof typeof this.TOKEN_IDS];
    if (!tokenId) return [];

    try {
      const start = new Date(startDate);
      const end = new Date(endDate);
      const startTimestamp = Math.floor(start.getTime() / 1000);
      const endTimestamp = Math.floor(end.getTime() / 1000);

      const response = await fetch(
        `https://api.coingecko.com/api/v3/coins/${tokenId}/market_chart/range?vs_currency=usd&from=${startTimestamp}&to=${endTimestamp}`
      );

      if (!response.ok) {
        throw new Error(`CoinGecko API returned ${response.status}`);
      }

      const data = await response.json();
      const prices: PriceData[] = data.prices.map(([timestamp, price]: [number, number]) => ({
        timestamp: new Date(timestamp).toISOString(),
        price_usd: price,
        source: 'coingecko'
      }));

      return prices;
    } catch (error) {
      console.error(`Error fetching price history for ${token}:`, error);
      return [];
    }
  }

  // Get supported tokens
  getSupportedTokens(): string[] {
    return Object.keys(this.TOKEN_IDS);
  }

  // Clear cache (useful for testing or manual refresh)
  clearCache(): void {
    this.priceCache.clear();
    this.dailyPriceCache.clear();
  }
}

export const historicalPriceService = new HistoricalPriceService();
