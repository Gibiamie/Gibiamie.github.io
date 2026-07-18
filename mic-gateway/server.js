'use strict';

const express = require('express');
const cors = require('cors');
const ccxt = require('ccxt');

const app = express();
const PORT = Number(process.env.PORT || 10000);
const ACCESS_TOKEN = String(process.env.GATEWAY_ACCESS_TOKEN || '').trim();
const ALLOWED_ORIGINS = String(process.env.ALLOWED_ORIGINS || 'https://gibiamie.github.io')
  .split(',').map(x => x.trim()).filter(Boolean);
const ALPACA_KEY = String(process.env.ALPACA_API_KEY_ID || '').trim();
const ALPACA_SECRET = String(process.env.ALPACA_API_SECRET_KEY || '').trim();
const CRYPTO_EXCHANGE = String(process.env.CRYPTO_EXCHANGE || 'kraken').trim().toLowerCase();
const CRYPTO_FALLBACKS = [...new Set([CRYPTO_EXCHANGE, 'kraken', 'coinbase', 'okx', 'binanceus'])];
const MAX_LIMIT = 2000;

app.disable('x-powered-by');
app.use(express.json({ limit: '64kb' }));
app.use(cors({
  origin(origin, callback) {
    if (!origin || ALLOWED_ORIGINS.includes('*') || ALLOWED_ORIGINS.includes(origin)) return callback(null, true);
    return callback(new Error('Origin not allowed'));
  },
  methods: ['GET', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

const rateBuckets = new Map();
app.use((req, res, next) => {
  const now = Date.now();
  const key = req.ip || 'unknown';
  const bucket = rateBuckets.get(key) || { start: now, count: 0 };
  if (now - bucket.start >= 60_000) { bucket.start = now; bucket.count = 0; }
  bucket.count += 1;
  rateBuckets.set(key, bucket);
  res.setHeader('X-RateLimit-Limit', '120');
  res.setHeader('X-RateLimit-Remaining', String(Math.max(0, 120 - bucket.count)));
  if (bucket.count > 120) return res.status(429).json({ code: 'RATE_LIMIT', message: 'Gateway request limit exceeded. Try again shortly.' });
  next();
});

function requireToken(req, res, next) {
  if (!ACCESS_TOKEN) return next();
  const supplied = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '').trim();
  if (supplied !== ACCESS_TOKEN) return res.status(401).json({ code: 'UNAUTHORIZED', message: 'Invalid gateway access token.' });
  next();
}

function safeLimit(value) {
  const n = Number(value || 500);
  return Math.max(2, Math.min(MAX_LIMIT, Number.isFinite(n) ? Math.floor(n) : 500));
}

function isoStart(hoursBack) {
  return new Date(Date.now() - hoursBack * 3_600_000).toISOString();
}

function normalizeBars(rows, provider) {
  return (rows || []).map(row => ({
    timestamp: row.timestamp || row.t || row.datetime,
    open: Number(row.open ?? row.o),
    high: Number(row.high ?? row.h),
    low: Number(row.low ?? row.l),
    close: Number(row.close ?? row.c),
    volume: Number(row.volume ?? row.v ?? 0),
    provider
  })).filter(x => x.timestamp && [x.open, x.high, x.low, x.close].every(Number.isFinite));
}

async function alpacaBars(symbol, interval, limit) {
  if (!ALPACA_KEY || !ALPACA_SECRET) {
    const error = new Error('Alpaca server credentials are not configured.');
    error.status = 503; error.code = 'ALPACA_NOT_CONFIGURED'; throw error;
  }

  const requested = interval === '1d' ? '1Day' : interval === '4h' ? '4Hour' : '1Hour';
  const params = new URLSearchParams({
    timeframe: requested,
    start: isoStart(interval === '1d' ? limit * 36 : interval === '4h' ? limit * 6 : limit * 2),
    limit: String(limit),
    adjustment: 'all',
    feed: 'iex',
    sort: 'asc'
  });
  const url = `https://data.alpaca.markets/v2/stocks/${encodeURIComponent(symbol)}/bars?${params}`;
  const response = await fetch(url, {
    headers: {
      'APCA-API-KEY-ID': ALPACA_KEY,
      'APCA-API-SECRET-KEY': ALPACA_SECRET,
      'Accept': 'application/json'
    },
    cache: 'no-store'
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(body.message || `Alpaca HTTP ${response.status}`);
    error.status = response.status; error.code = 'ALPACA_ERROR'; throw error;
  }
  return {
    bars: normalizeBars(body.bars, 'ALPACA_IEX'),
    provider: 'ALPACA_IEX',
    data_class: 'PROVIDER_NATIVE_BAR',
    source_interval: interval
  };
}

function createExchange(name = CRYPTO_EXCHANGE) {
  const Exchange = ccxt[name];
  if (!Exchange) {
    const error = new Error(`Unsupported CCXT exchange: ${name}`);
    error.status = 500; error.code = 'CRYPTO_EXCHANGE_INVALID'; throw error;
  }
  return new Exchange({ enableRateLimit: true, timeout: 15000 });
}

function pairCandidates(symbol) {
  const normalized = String(symbol || '').replace('-', '/').toUpperCase();
  if (!normalized) return [];
  if (normalized.includes('/')) {
    const [base] = normalized.split('/');
    return [...new Set([normalized, `${base}/USD`, `${base}/USDT`, `${base}/USDC`])];
  }
  return [`${normalized}/USD`, `${normalized}/USDT`, `${normalized}/USDC`];
}

function resolvePair(exchange, symbol) {
  for (const candidate of pairCandidates(symbol)) {
    const market = exchange.markets?.[candidate];
    if (market && market.active !== false && market.spot !== false) return candidate;
  }
  return '';
}

async function withCryptoExchange(symbol, operation) {
  const failures = [];
  for (const exchangeName of CRYPTO_FALLBACKS) {
    try {
      const exchange = createExchange(exchangeName);
      await exchange.loadMarkets();
      const pair = resolvePair(exchange, symbol);
      if (!pair) { failures.push(`${exchangeName}: pair unavailable`); continue; }
      return await operation(exchange, pair, exchangeName);
    } catch (error) {
      failures.push(`${exchangeName}: ${error.message || 'provider error'}`);
    }
  }
  const error = new Error(`${String(symbol).toUpperCase()} could not be resolved on available crypto providers.`);
  error.status = 404;
  error.code = 'CRYPTO_SYMBOL_NOT_FOUND';
  error.details = failures;
  throw error;
}

async function cryptoBars(symbol, interval, limit) {
  return withCryptoExchange(symbol, async (exchange, pair, exchangeName) => {
    if (!exchange.has.fetchOHLCV) throw new Error(`${exchangeName} does not provide OHLCV through CCXT.`);
    const requested = interval === '1d' ? '1d' : interval === '4h' ? '4h' : '1h';
    const rows = await exchange.fetchOHLCV(pair, requested, undefined, limit);
    return {
      bars: (rows || []).map(x => ({
        timestamp: new Date(x[0]).toISOString(),
        open: Number(x[1]), high: Number(x[2]), low: Number(x[3]), close: Number(x[4]), volume: Number(x[5] || 0),
        provider: `CCXT_${exchangeName.toUpperCase()}`
      })).filter(x => [x.open, x.high, x.low, x.close].every(Number.isFinite)),
      provider: `CCXT_${exchangeName.toUpperCase()}`,
      data_class: 'PROVIDER_NATIVE_BAR',
      source_interval: interval,
      provider_symbol: pair
    };
  });
}

async function cryptoQuote(symbol) {
  return withCryptoExchange(symbol, async (exchange, pair, exchangeName) => {
    let ticker = null;
    if (exchange.has.fetchTicker) ticker = await exchange.fetchTicker(pair);
    let price = Number(ticker?.last ?? ticker?.close);
    if (!Number.isFinite(price)) {
      const bid = Number(ticker?.bid), ask = Number(ticker?.ask);
      if (Number.isFinite(bid) && Number.isFinite(ask)) price = (bid + ask) / 2;
    }
    if (!Number.isFinite(price) && exchange.has.fetchOHLCV) {
      const rows = await exchange.fetchOHLCV(pair, '1m', undefined, 2);
      price = Number(rows?.at(-1)?.[4]);
    }
    if (!Number.isFinite(price)) throw new Error(`${exchangeName} returned no valid ticker price.`);
    return {
      price,
      provider: `CCXT_${exchangeName.toUpperCase()}`,
      provider_symbol: pair,
      generated_at: ticker?.timestamp ? new Date(ticker.timestamp).toISOString() : new Date().toISOString(),
      data_class: 'PROVIDER_SPOT_QUOTE'
    };
  });
}

app.get('/', (_req, res) => {
  res.json({ service: 'MIC Market Gateway', version: '1.2.0', health: '/health', bars: '/api/v1/bars', quote: '/api/v1/quote' });
});

app.get('/health', requireToken, (_req, res) => {
  res.json({
    service: 'MIC Market Gateway',
    version: '1.2.0',
    status: 'ok',
    generated_at: new Date().toISOString(),
    providers: {
      us: ALPACA_KEY && ALPACA_SECRET ? 'ALPACA_IEX_READY' : 'ALPACA_NOT_CONFIGURED',
      crypto: CRYPTO_FALLBACKS.map(x => `CCXT_${x.toUpperCase()}`),
      bist: 'LICENSED_PROVIDER_REQUIRED'
    },
    access_token_required: Boolean(ACCESS_TOKEN)
  });
});

app.get('/api/v1/quote', requireToken, async (req, res) => {
  const market = String(req.query.market || 'CRYPTO').trim().toUpperCase();
  const symbol = String(req.query.symbol || '').trim().toUpperCase();
  if (market !== 'CRYPTO') return res.status(400).json({ code: 'MARKET_INVALID', message: 'Live quote currently supports CRYPTO only.' });
  if (!symbol) return res.status(400).json({ code: 'SYMBOL_REQUIRED', message: 'symbol is required.' });
  try {
    const result = await cryptoQuote(symbol);
    res.json({ market, symbol, ...result });
  } catch (error) {
    const status = Number(error.status || 502);
    res.status(status).json({ code: error.code || 'PROVIDER_ERROR', message: error.message || 'Provider request failed.' });
  }
});

app.get('/api/v1/bars', requireToken, async (req, res) => {
  const market = String(req.query.market || '').trim().toUpperCase();
  const symbol = String(req.query.symbol || '').trim().toUpperCase();
  const interval = String(req.query.interval || '').trim().toLowerCase();
  const limit = safeLimit(req.query.limit);

  if (!['US', 'CRYPTO', 'BIST'].includes(market)) return res.status(400).json({ code: 'MARKET_INVALID', message: 'market must be US, CRYPTO or BIST.' });
  if (!symbol) return res.status(400).json({ code: 'SYMBOL_REQUIRED', message: 'symbol is required.' });
  if (!['1h', '4h', '1d'].includes(interval)) return res.status(400).json({ code: 'INTERVAL_INVALID', message: 'interval must be 1h, 4h or 1d.' });
  if (market === 'BIST') return res.status(501).json({ code: 'BIST_LICENSED_PROVIDER_REQUIRED', message: 'BIST gateway data is not enabled.' });

  try {
    const result = market === 'US'
      ? await alpacaBars(symbol, interval, limit)
      : await cryptoBars(symbol, interval, limit);
    res.json({
      market, symbol, interval, generated_at: new Date().toISOString(), count: result.bars.length,
      provider: result.provider, provider_symbol: result.provider_symbol || symbol,
      data_class: result.data_class, source_interval: result.source_interval, bars: result.bars
    });
  } catch (error) {
    const status = Number(error.status || 502);
    res.status(status).json({ code: error.code || 'PROVIDER_ERROR', message: error.message || 'Provider request failed.' });
  }
});

app.use((error, _req, res, _next) => {
  res.status(400).json({ code: 'REQUEST_REJECTED', message: error.message || 'Request rejected.' });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`MIC Market Gateway listening on 0.0.0.0:${PORT}`);
});
