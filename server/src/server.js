const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const path = require('node:path');
const fs = require('node:fs');
const { Readable, pipeline } = require('node:stream');
const { promisify } = require('node:util');
const { fetch } = require('undici');
require('dotenv').config();

const {
  listKeywords,
  findKeyword,
  findResource,
  normalizeKeyword
} = require('./data/keywordLibrary');

const app = express();
const asyncPipeline = promisify(pipeline);

const PORT = Number(process.env.PORT || 4000);
const DOWNLOAD_TIMEOUT_MS = Number(process.env.DOWNLOAD_TIMEOUT_MS || 25000);
const allowedOriginsEnv = process.env.ALLOWED_ORIGINS || '*';
const allowedOrigins = allowedOriginsEnv
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: allowedOrigins.includes('*') ? '*' : allowedOrigins,
    optionsSuccessStatus: 200,
    exposedHeaders: [
      'Content-Length',
      'X-Remote-Content-Length',
      'X-Remote-Content-Type',
      'X-Resource-Name'
    ]
  })
);
app.use(express.json({ limit: '1mb' }));
app.use(morgan('dev'));

app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString()
  });
});

app.get('/api/keywords', (_req, res) => {
  res.json({ keywords: listKeywords() });
});

app.get('/api/keywords/:keyword', (req, res) => {
  const keyword = normalizeKeyword(req.params.keyword);
  const { urls } = findKeyword(keyword);
  if (!urls) {
    return res.status(404).json({
      message: `Ключевое слово "${keyword}" пока не поддерживается.`
    });
  }

  res.json({
    keyword,
    urls
  });
});

app.post('/api/download', async (req, res, next) => {
  try {
    const { keyword, resourceId } = req.body || {};

    if (!keyword || !resourceId) {
      return res.status(400).json({
        message: 'Необходимо передать keyword и resourceId.'
      });
    }

    const normalizedKeyword = normalizeKeyword(keyword);
    const resource = findResource(normalizedKeyword, resourceId);
    if (!resource) {
      return res.status(404).json({
        message: `Не найден ресурс ${resourceId} для ключевого слова "${normalizedKeyword}".`
      });
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), DOWNLOAD_TIMEOUT_MS);
    let upstreamResponse;

    try {
      upstreamResponse = await fetch(resource.url, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'uch-pr-proxy/1.0 (+https://github.com/)',
          Accept: '*/*'
        }
      });
    } finally {
      clearTimeout(timeout);
    }

    if (!upstreamResponse.ok) {
      return res.status(upstreamResponse.status).json({
        message: `Не удалось скачать ресурс: ${upstreamResponse.status} ${upstreamResponse.statusText}`
      });
    }

    if (!upstreamResponse.body) {
      return res.status(502).json({
        message: 'Источник не вернул тело ответа.'
      });
    }

    const contentType =
      upstreamResponse.headers.get('content-type') ||
      'text/plain; charset=utf-8';
    const contentLength = upstreamResponse.headers.get('content-length') || '';

    res.setHeader('Content-Type', contentType);
    if (contentLength) {
      res.setHeader('Content-Length', contentLength);
    }
    res.setHeader('X-Remote-Content-Length', contentLength);
    res.setHeader('X-Remote-Content-Type', contentType);
    res.setHeader('X-Resource-Name', resource.label);

    await asyncPipeline(Readable.fromWeb(upstreamResponse.body), res);
  } catch (error) {
    if (error.name === 'AbortError') {
      return res.status(504).json({
        message: 'Загрузка превысила лимит времени, попробуйте ещё раз.'
      });
    }

    return next(error);
  }
});

const clientDistPath = path.resolve(__dirname, '../../client/dist');
if (fs.existsSync(clientDistPath)) {
  app.use(express.static(clientDistPath));
  app.get('*', (_req, res) => {
    res.sendFile(path.join(clientDistPath, 'index.html'));
  });
}

// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  console.error(err);
  const status = err.status || 500;
  res.status(status).json({
    message: err.message || 'Внутренняя ошибка сервера.'
  });
});

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});

