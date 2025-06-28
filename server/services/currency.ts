interface ExchangeRate {
  rate: number;
  timestamp: Date;
}

class CurrencyService {
  private ethRateCache: ExchangeRate | null = null;
  private cacheValidityMs = 5 * 60 * 1000; // 5 minutes

  async getETHToUSDRate(): Promise<number> {
    // Check if we have a valid cached rate
    if (this.ethRateCache && 
        Date.now() - this.ethRateCache.timestamp.getTime() < this.cacheValidityMs) {
      return this.ethRateCache.rate;
    }

    try {
      // Try CoinGecko first (free tier)
      const response = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd');
      if (response.ok) {
        const data = await response.json();
        const rate = data.ethereum?.usd;
        if (rate) {
          this.ethRateCache = {
            rate,
            timestamp: new Date()
          };
          return rate;
        }
      }
    } catch (error) {
      console.error('Failed to fetch ETH rate from CoinGecko:', error);
    }

    try {
      // Fallback to CoinCap
      const response = await fetch('https://api.coincap.io/v2/assets/ethereum');
      if (response.ok) {
        const data = await response.json();
        const rate = parseFloat(data.data?.priceUsd);
        if (rate) {
          this.ethRateCache = {
            rate,
            timestamp: new Date()
          };
          return rate;
        }
      }
    } catch (error) {
      console.error('Failed to fetch ETH rate from CoinCap:', error);
    }

    // If all else fails, return a reasonable fallback (this should be rare)
    console.warn('Using fallback ETH rate of $3000');
    return 3000;
  }

  /**
   * Convert ETH amount to USD
   */
  async convertETHToUSD(ethAmount: string): Promise<string> {
    const rate = await this.getETHToUSDRate();
    const ethValue = parseFloat(ethAmount);
    return (ethValue * rate).toFixed(2);
  }

  /**
   * Convert Wei to USD (wei is ETH * 10^18)
   */
  async convertWeiToUSD(weiAmount: string): Promise<string> {
    const rate = await this.getETHToUSDRate();
    const ethValue = parseInt(weiAmount) / 1e18;
    return (ethValue * rate).toFixed(2);
  }

  /**
   * Get historical ETH rate for a specific date (approximate)
   */
  async getHistoricalETHRate(date: string): Promise<number> {
    try {
      // For simplicity, we'll use current rate
      // In production, you might want to use a historical price API
      return await this.getETHToUSDRate();
    } catch (error) {
      console.error('Failed to get historical ETH rate:', error);
      return 3000; // Fallback
    }
  }
}

export const currencyService = new CurrencyService();