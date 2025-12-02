const keywordLibrary = {
  javascript: [
    {
      id: 'js-mdn-promises',
      label: 'MDN • Using Promises',
      url: 'https://raw.githubusercontent.com/mdn/content/main/files/en-us/web/javascript/guide/using_promises/index.md',
      description: 'Практическое руководство по промисам из MDN с примерами кода.'
    },
    {
      id: 'js-jsinfo-fetch',
      label: 'javascript.info • Fetch API Basics',
      url: 'https://raw.githubusercontent.com/javascript-tutorial/en.javascript.info/master/article/fetch-basics/article.md',
      description: 'Обзор базовых возможностей Fetch API на современном JavaScript.'
    },
    {
      id: 'js-tc39-observable',
      label: 'TC39 • Observable Proposal',
      url: 'https://raw.githubusercontent.com/tc39/proposal-observable/main/README.md',
      description: 'Черновик спецификации набора наблюдаемых значений от комитета TC39.'
    }
  ],
  node: [
    {
      id: 'node-http-guide',
      label: 'Node.js • HTTP Module Guide',
      url: 'https://raw.githubusercontent.com/nodejs/node/main/doc/api/http.md',
      description: 'Актуальная документация по встроенному HTTP-модулю Node.js.'
    },
    {
      id: 'node-streams',
      label: 'Node.js • Streams Handbook',
      url: 'https://raw.githubusercontent.com/substack/stream-handbook/master/readme.markdown',
      description: 'Хэндбук по потокам в Node.js от substack с примерами использования.'
    },
    {
      id: 'node-event-loop',
      label: 'NodeSource • Event Loop Guide',
      url: 'https://raw.githubusercontent.com/nodesource/blog/master/articles/understanding-the-nodejs-event-loop/es5.md',
      description: 'Подробное описание работы Event Loop в Node.js.'
    }
  ],
  web: [
    {
      id: 'web-service-workers',
      label: 'MDN • Service Workers',
      url: 'https://raw.githubusercontent.com/mdn/content/main/files/en-us/web/api/service_worker_api/using_service_workers/index.md',
      description: 'Руководство по сервис-воркерам и офлайн-функциональности.'
    },
    {
      id: 'web-pwa',
      label: 'Google • PWA Checklist',
      url: 'https://raw.githubusercontent.com/GoogleChrome/web.dev/main/src/site/content/en/blog/pwa-checklist/index.md',
      description: 'Чеклист лучших практик Progressive Web Apps от Google.'
    },
    {
      id: 'web-performance',
      label: 'web.dev • Performance Metrics',
      url: 'https://raw.githubusercontent.com/GoogleChrome/web.dev/main/src/site/content/en/learn/performance/measure-performance/index.md',
      description: 'Справочник по основным метрикам производительности веб-приложений.'
    }
  ]
};

function normalizeKeyword(keyword = '') {
  return keyword.trim().toLowerCase();
}

function listKeywords() {
  return Object.entries(keywordLibrary).map(([keyword, urls]) => ({
    keyword,
    urlCount: urls.length
  }));
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

