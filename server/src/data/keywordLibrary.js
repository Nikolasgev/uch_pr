const keywordLibrary = {
  javascript: [
    {
      id: 'js-mdn-promises',
      label: 'MDN - Using Promises',
      url: 'https://raw.githubusercontent.com/mdn/content/main/files/en-us/web/javascript/guide/using_promises/index.md',
      description: 'Practical MDN guide on promises with code samples.'
    },
    {
      id: 'js-jsinfo-fetch',
      label: 'javascript.info - Fetch API Basics',
      url: 'https://raw.githubusercontent.com/javascript-tutorial/en.javascript.info/master/article/fetch-basics/article.md',
      description: 'Overview of Fetch API basics with modern JavaScript examples.'
    },
    {
      id: 'js-tc39-observable',
      label: 'TC39 - Observable Proposal',
      url: 'https://raw.githubusercontent.com/tc39/proposal-observable/main/README.md',
      description: 'Draft specification for the TC39 Observable proposal.'
    }
  ],
  node: [
    {
      id: 'node-http-guide',
      label: 'Node.js - HTTP Module Guide',
      url: 'https://raw.githubusercontent.com/nodejs/node/main/doc/api/http.md',
      description: 'Up-to-date documentation for the built-in Node.js HTTP module.'
    },
    {
      id: 'node-streams',
      label: 'Node.js - Streams Handbook',
      url: 'https://raw.githubusercontent.com/substack/stream-handbook/master/readme.markdown',
      description: 'Stream handbook for Node.js by substack with practical examples.'
    },
    {
      id: 'node-event-loop',
      label: 'NodeSource - Event Loop Guide',
      url: 'https://raw.githubusercontent.com/nodesource/blog/master/articles/understanding-the-nodejs-event-loop/es5.md',
      description: 'Deep dive into how the Node.js event loop works.'
    }
  ],
  web: [
    {
      id: 'web-service-workers',
      label: 'MDN - Service Workers',
      url: 'https://raw.githubusercontent.com/mdn/content/main/files/en-us/web/api/service_worker_api/using_service_workers/index.md',
      description: 'Guide to the Service Worker API and offline capabilities.'
    },
    {
      id: 'web-pwa',
      label: 'Google - PWA Checklist',
      url: 'https://raw.githubusercontent.com/GoogleChrome/web.dev/main/src/site/content/en/blog/pwa-checklist/index.md',
      description: 'Google PWA checklist covering best practices.'
    },
    {
      id: 'web-performance',
      label: 'web.dev - Performance Metrics',
      url: 'https://raw.githubusercontent.com/GoogleChrome/web.dev/main/src/site/content/en/learn/performance/measure-performance/index.md',
      description: 'Reference for the main web performance metrics from web.dev.'
    }
  ]
};

function normalizeKeyword(keyword = '') {
  return keyword.trim().toLowerCase();
}

function listKeywords() {
  return Object.entries(keywordLibrary)
    .map(([keyword, urls]) => ({
      keyword,
      urlCount: urls.length
    }))
    .sort((a, b) => a.keyword.localeCompare(b.keyword));
}

function findKeyword(keyword) {
  const normalized = normalizeKeyword(keyword);
  return {
    keyword: normalized,
    urls: keywordLibrary[normalized] ?? null
  };
}

function findResource(keyword, resourceId) {
  const { urls } = findKeyword(keyword);
  if (!urls) {
    return null;
  }
  return urls.find((entry) => entry.id === resourceId) ?? null;
}

module.exports = {
  keywordLibrary,
  listKeywords,
  findKeyword,
  findResource,
  normalizeKeyword
};

