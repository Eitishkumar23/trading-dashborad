import axios from 'axios';

const COINGECKO_MAP = {
    'bitcoin': 'BTC',
    'ethereum': 'ETH',
    'solana': 'SOL',
    'dogecoin': 'DOGE',
    'cardano': 'ADA',
    'chainlink': 'LINK',
    'polygon-ecosystem-token': 'POL'
};

const fetchLiveCryptoPrices = async () => {
    try {
        console.log('Sending request to CoinGecko simple price API...');
        const response = await axios.get('https://api.coingecko.com/api/v3/simple/price', {
            params: {
                ids: Object.keys(COINGECKO_MAP).join(','),
                vs_currencies: 'inr',
                include_24hr_change: 'true'
            },
            timeout: 5000
        });

        if (!response || response.status !== 200 || !response.data || typeof response.data !== 'object') {
            console.error('Invalid response:', response ? response.status : 'no response');
            return null;
        }

        const data = response.data;
        console.log('Raw CoinGecko Response:', JSON.stringify(data, null, 2));

        const result = {};
        for (const [id, symbol] of Object.entries(COINGECKO_MAP)) {
            if (!data[id] || typeof data[id].inr !== 'number' || typeof data[id].inr_24h_change !== 'number') {
                console.error(`Missing or invalid data for coin ID: ${id}. Data for ID:`, data[id]);
                return null;
            }
            result[symbol] = {
                price: data[id].inr,
                change: data[id].inr_24h_change
            };
        }

        return result;
    } catch (error) {
        console.error('Fetch caught error:', error.message);
        return null;
    }
};

const run = async () => {
    const prices = await fetchLiveCryptoPrices();
    console.log('Resulting mapping:', JSON.stringify(prices, null, 2));
};

run();