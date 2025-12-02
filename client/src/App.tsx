import { useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import './App.css';

type KeywordSummary = {
  keyword: string;
  urlCount: number;
};

export type UrlOption = {
  id: string;
  label: string;
  url: string;
  description: string;
};

type DownloadState =
  | null
  | {
      keyword: string;
      resourceId: string;
      resourceLabel: string;
      receivedBytes: number;
      totalBytes: number | null;
      status: 'idle' | 'downloading' | 'completed' | 'error';
      errorMessage?: string;
    };

export type SavedContent = {
  id: string;
  keyword: string;
  resourceId: string;
  label: string;
  contentType: string;
  size: number;
  savedAt: string;
  content: string;
};

const STORAGE_KEY = 'offline-library-v1';
const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/$/, '');

const formatter = new Intl.DateTimeFormat('ru-RU', {
  dateStyle: 'medium',
  timeStyle: 'short'
});

const formatBytes = (bytes: number | null) => {
  if (bytes === null) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
};

const buildApiUrl = (path: string) => `${API_BASE_URL}${path}`;

const createId = () => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

function App() {
  const [keywordInput, setKeywordInput] = useState('');
  const [availableKeywords, setAvailableKeywords] = useState<KeywordSummary[]>([]);
  const [urls, setUrls] = useState<UrlOption[]>([]);
  const [activeKeyword, setActiveKeyword] = useState('');
  const [loadingUrls, setLoadingUrls] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [downloadState, setDownloadState] = useState<DownloadState>(null);
  const [library, setLibrary] = useState<SavedContent[]>(() => {
    if (typeof window === 'undefined') {
      return [];
    }
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      return JSON.parse(raw) as SavedContent[];
    } catch (error) {
      console.error('Не удалось прочитать localStorage', error);
      return [];
    }
  });
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const selectedContent = useMemo(
    () => library.find((item) => item.id === selectedId) ?? null,
    [library, selectedId]
  );

  useEffect(() => {
    if (typeof window === 'undefined') return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(library));
  }, [library]);

  useEffect(() => {
    let isMounted = true;
    fetch(buildApiUrl('/api/keywords'))
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(`Ошибка ${response.status}`);
        }
        return response.json();
      })
      .then((payload) => {
        if (!isMounted) return;
        const keywords = Array.isArray(payload.keywords)
          ? [...(payload.keywords as KeywordSummary[])]
          : [];
        keywords.sort((a: KeywordSummary, b: KeywordSummary) =>
          a.keyword.localeCompare(b.keyword)
        );
        setAvailableKeywords(keywords);
      })
      .catch((error) => {
        if (!isMounted) return;
        setErrorMessage(
          'Не удалось загрузить список ключевых слов. Попробуйте обновить страницу.'
        );
        console.error(error);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const fetchKeywordUrls = async (keyword: string) => {
    setLoadingUrls(true);
    setErrorMessage(null);

    try {
      const response = await fetch(
        buildApiUrl(`/api/keywords/${encodeURIComponent(keyword)}`)
      );

      if (!response.ok) {
        const errorPayload = await response.json().catch(() => null);
        throw new Error(errorPayload?.message || 'Ключевое слово не найдено.');
      }

      const data = await response.json();
      const resolvedUrls = data.urls ?? [];
      setUrls(resolvedUrls);
      if (resolvedUrls.length === 0) {
        setErrorMessage('Для выбранного ключевого слова пока нет URL.');
      }
      setActiveKeyword(keyword);
      setKeywordInput(keyword);
    } catch (error) {
      console.error(error);
      setUrls([]);
      setErrorMessage(
        error instanceof Error ? error.message : 'Неожиданная ошибка при загрузке URL.'
      );
    } finally {
      setLoadingUrls(false);
    }
  };

  const handleKeywordSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const normalizedKeyword = keywordInput.trim().toLowerCase();
    if (!normalizedKeyword) {
      setErrorMessage('Введите ключевое слово.');
      return;
    }

    await fetchKeywordUrls(normalizedKeyword);
  };

  const handleKeywordChipClick = (keyword: string) => {
    setKeywordInput(keyword);
    fetchKeywordUrls(keyword);
  };

  const handleDownload = async (resource: UrlOption) => {
    const normalizedKeyword = activeKeyword.trim().toLowerCase();
    if (!normalizedKeyword) {
      setErrorMessage('Сначала выберите ключевое слово и обновите список URL.');
      return;
    }

    setDownloadState({
      keyword: normalizedKeyword,
      resourceId: resource.id,
      resourceLabel: resource.label,
      receivedBytes: 0,
      totalBytes: null,
      status: 'downloading'
    });
    setErrorMessage(null);

    try {
      const response = await fetch(buildApiUrl('/api/download'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ keyword: normalizedKeyword, resourceId: resource.id })
      });

      if (!response.ok) {
        const errorPayload = await response.json().catch(() => null);
        throw new Error(errorPayload?.message || 'Ошибка при скачивании файла.');
      }

      if (!response.body) {
        throw new Error('Браузер не поддерживает потоковую загрузку.');
      }

      const totalBytesHeader =
        response.headers.get('x-remote-content-length') ||
        response.headers.get('content-length');
      const totalBytes =
        totalBytesHeader && Number.isFinite(Number(totalBytesHeader))
          ? Number(totalBytesHeader)
          : null;
      const contentType =
        response.headers.get('x-remote-content-type') ||
        response.headers.get('content-type') ||
        'text/plain; charset=utf-8';
      const resourceLabel =
        response.headers.get('x-resource-name') || resource.label;

      const reader = response.body.getReader();
      const chunks: Uint8Array[] = [];
      let received = 0;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (value) {
          chunks.push(value);
          received += value.length;
          setDownloadState((prev) =>
            prev
              ? {
                  ...prev,
                  receivedBytes: received,
                  totalBytes: totalBytes ?? prev.totalBytes
                }
              : prev
          );
        }
      }

      const merged = new Uint8Array(received);
      let offset = 0;
      chunks.forEach((chunk) => {
        merged.set(chunk, offset);
        offset += chunk.length;
      });
      const decoder = new TextDecoder('utf-8');
      const content = decoder.decode(merged);

      const saved: SavedContent = {
        id: createId(),
        keyword: normalizedKeyword,
        resourceId: resource.id,
        label: resourceLabel,
        contentType,
        size: received,
        savedAt: new Date().toISOString(),
        content
      };

      setLibrary((prev) => [saved, ...prev]);
      setSelectedId(saved.id);
      setDownloadState((prev) =>
        prev
          ? {
              ...prev,
              receivedBytes: received,
              totalBytes: totalBytes ?? prev.totalBytes,
              status: 'completed'
            }
          : prev
      );
    } catch (error) {
      console.error(error);
      const message =
        error instanceof Error
          ? error.message
          : 'Не удалось скачать выбранный ресурс.';
      setDownloadState((prev) =>
        prev
          ? {
              ...prev,
              status: 'error',
              errorMessage: message
            }
          : prev
      );
      setErrorMessage(message);
    }
  };

  const handleRemove = (id: string) => {
    setLibrary((prev) => prev.filter((item) => item.id !== id));
    if (selectedId === id) {
      setSelectedId(null);
    }
  };

  return (
    <div className="app-shell">
      <header className="app-header">
        <div>
          <p className="eyebrow">Remote Content Harvester</p>
          <h1>Каталог ссылок по ключевым словам</h1>
          <p className="subtitle">
            Введите ключевое слово, скачайте понравившийся материал через прокси-сервер и
            читайте его оффлайн из локального хранилища.
          </p>
        </div>
      </header>

      <main className="content-grid">
        <section className="panel">
          <form onSubmit={handleKeywordSubmit} className="keyword-form">
            <label htmlFor="keyword-input">Ключевое слово</label>
            <div className="input-group">
              <input
                id="keyword-input"
                name="keyword"
                type="text"
                placeholder="Например: javascript"
                value={keywordInput}
                onChange={(event) => setKeywordInput(event.target.value)}
                autoComplete="off"
              />
              <button type="submit" disabled={loadingUrls}>
                {loadingUrls ? 'Поиск...' : 'Найти URL'}
              </button>
            </div>
          </form>

          {availableKeywords.length > 0 && (
            <div className="keyword-cloud">
              <p>Поддерживаемые запросы:</p>
              <div className="chips">
                {availableKeywords.map((item) => (
                  <button
                    key={item.keyword}
                    type="button"
                    className="chip"
                    onClick={() => handleKeywordChipClick(item.keyword)}
                  >
                    {item.keyword} ({item.urlCount})
                  </button>
                ))}
              </div>
            </div>
          )}

          {errorMessage && (
            <div role="alert" className="alert">
              {errorMessage}
            </div>
          )}

          <div className="urls-section">
            <h2>Доступные URL</h2>
            {loadingUrls && <p>Загружаем список...</p>}
            {!loadingUrls && urls.length === 0 && (
              <p className="muted">Выберите ключевое слово, чтобы увидеть список ссылок.</p>
            )}
            <ul className="url-list">
              {urls.map((url) => (
                <li key={url.id} className="url-card">
                  <div>
                    <p className="url-label">{url.label}</p>
                    <p className="url-description">{url.description}</p>
                    <a href={url.url} target="_blank" rel="noreferrer" className="external">
                      {url.url}
                    </a>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDownload(url)}
                    className="ghost-button"
                    disabled={!activeKeyword}
                  >
                    Скачать через сервер
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {downloadState && (
            <div className="download-status">
              <h3>Статус загрузки</h3>
              <p className="download-label">{downloadState.resourceLabel}</p>
              <div className="progress-wrapper">
                <div className="progress-bar">
                  <div
                    className={`progress-fill ${downloadState.status}`}
                    style={{
                      width:
                        downloadState.totalBytes && downloadState.totalBytes > 0
                          ? `${Math.min(
                              100,
                              (downloadState.receivedBytes / downloadState.totalBytes) * 100
                            ).toFixed(1)}%`
                          : downloadState.status === 'completed'
                            ? '100%'
                            : `${Math.min(downloadState.receivedBytes / 1000, 90)}%`
                    }}
                  />
                </div>
                <p>
                  {formatBytes(downloadState.receivedBytes)} /{' '}
                  {formatBytes(downloadState.totalBytes)}
                </p>
              </div>
              {downloadState.status === 'completed' && (
                <p className="success">Сохранено в оффлайн-библиотеку.</p>
              )}
              {downloadState.status === 'error' && (
                <p className="error">{downloadState.errorMessage}</p>
              )}
            </div>
          )}
        </section>

        <section className="panel library-panel">
          <h2>Оффлайн-библиотека</h2>
          {library.length === 0 ? (
            <p className="muted">Пока ничего не скачано.</p>
          ) : (
            <ul className="library-list">
              {library.map((item) => (
                <li
                  key={item.id}
                  className={`library-item ${selectedId === item.id ? 'active' : ''}`}
                >
                  <button
                    type="button"
                    className="library-link"
                    onClick={() => setSelectedId(item.id)}
                  >
                    <span className="library-title">{item.label}</span>
                    <span className="library-meta">
                      {item.keyword} • {formatBytes(item.size)} •{' '}
                      {formatter.format(new Date(item.savedAt))}
                    </span>
                  </button>
                  <button
                    type="button"
                    className="delete-button"
                    onClick={() => handleRemove(item.id)}
                    aria-label="Удалить"
                  >
                    ✕
                  </button>
                </li>
              ))}
            </ul>
          )}

          {selectedContent && (
            <article className="preview">
              <header>
                <h3>{selectedContent.label}</h3>
                <p className="library-meta">
                  {selectedContent.keyword} • {formatBytes(selectedContent.size)} •{' '}
                  {formatter.format(new Date(selectedContent.savedAt))}
                </p>
              </header>
              <pre>{selectedContent.content}</pre>
            </article>
          )}
        </section>
      </main>
    </div>
  );
}

export default App;
