import React, { useEffect, useState } from 'react';
import './JournalPage.css';

const FALLBACK_IMGS = [
  'https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=800&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1507842217343-583bb7270b66?w=800&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?w=800&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1519682337058-a94d519337bc?w=800&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1463320726281-696a3cc57e81?w=800&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=800&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1455390582262-044cdead277a?w=800&auto=format&fit=crop',
];

const truncate = (str, n) =>
  str && str.length > n ? str.substr(0, n - 1) + '…' : str || '';

const JournalPage = () => {
  const [articles, setArticles] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [activeSlide, setActiveSlide] = useState(0);

  useEffect(() => {
    const API_URL =
      'https://saurav.tech/NewsAPI/top-headlines/category/technology/in.json';
    fetch(API_URL)
      .then(res => res.json())
      .then(data => { setArticles(data.articles || []); setLoading(false); })
      .catch(() => { setArticles([]); setLoading(false); });
  }, []);

  // Auto-advance featured card every 5 s
  useEffect(() => {
    if (articles.length < 2) return;
    const t = setInterval(() => setActiveSlide(s => (s + 1) % Math.min(articles.length, 3)), 5000);
    return () => clearInterval(t);
  }, [articles.length]);

  const placeholder = (i) => ({
    title: 'Loading the latest stories…',
    description: 'Fetching live news. Please hold on.',
    urlToImage: FALLBACK_IMGS[i % FALLBACK_IMGS.length],
    url: '#',
    source: { name: 'News' },
    publishedAt: new Date().toISOString(),
  });

  const get = (i) => articles[i] || placeholder(i);

  const timeAgo = (iso) => {
    const diff = (Date.now() - new Date(iso)) / 1000;
    if (diff < 3600)  return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  };

  const featured = get(activeSlide);
  const smCards  = [get(3), get(4)];
  const xsCards  = [get(5), get(6), get(7), get(8)];

  return (
    <div className="nl-wrapper">

      {/* ── Header bar ── */}
      <div className="nl-header">
        <span className="nl-header-title">NEWSLETTER</span>
        <div className="nl-header-right">
          <span className="nl-header-tag">Technology</span>
          <span className="nl-header-tag">India</span>
          <span className="nl-live-dot" />
          <span className="nl-header-live">LIVE</span>
        </div>
      </div>

      {/* ── Main grid ── */}
      <div className="nl-grid">

        {/* ─── TOP ROW ─────────────────────────────── */}
        <div className="nl-top-row">

          {/* Featured big card */}
          <a
            href={featured.url || '#'}
            target="_blank"
            rel="noopener noreferrer"
            className="nl-card nl-card-featured"
          >
            <div
              className="nl-card-img"
              style={{ backgroundImage: `url('${featured.urlToImage || FALLBACK_IMGS[0]}')` }}
            >
              <div className="nl-card-img-overlay" />
              <div className="nl-card-source-badge">
                {featured.source?.name} · {timeAgo(featured.publishedAt)}
              </div>
            </div>
            <div className="nl-card-body">
              <p className="nl-card-headline">{truncate(featured.title, 100)}</p>
              <p className="nl-card-desc">{truncate(featured.description, 120)}</p>
            </div>

            {/* Slide indicators */}
            <div className="nl-slide-dots">
              {[0, 1, 2].map(i => (
                <button
                  key={i}
                  className={`nl-slide-dot${activeSlide === i ? ' active' : ''}`}
                  onClick={e => { e.preventDefault(); setActiveSlide(i); }}
                />
              ))}
            </div>

            {/* Prev / Next arrows */}
            <button
              className="nl-arrow nl-arrow-left"
              onClick={e => { e.preventDefault(); setActiveSlide(s => (s - 1 + 3) % 3); }}
            >&#8249;</button>
            <button
              className="nl-arrow nl-arrow-right"
              onClick={e => { e.preventDefault(); setActiveSlide(s => (s + 1) % 3); }}
            >&#8250;</button>
          </a>

          {/* Right stack of 2 medium cards */}
          <div className="nl-right-stack">
            {smCards.map((art, i) => (
              <a
                key={i}
                href={art.url || '#'}
                target="_blank"
                rel="noopener noreferrer"
                className="nl-card nl-card-sm"
              >
                <div
                  className="nl-card-img"
                  style={{ backgroundImage: `url('${art.urlToImage || FALLBACK_IMGS[i + 1]}')` }}
                >
                  <div className="nl-card-img-overlay" />
                  <div className="nl-card-source-badge">
                    {art.source?.name} · {timeAgo(art.publishedAt)}
                  </div>
                </div>
                <div className="nl-card-body">
                  <p className="nl-card-headline">{truncate(art.title, 80)}</p>
                </div>
              </a>
            ))}
          </div>
        </div>

        {/* ─── BOTTOM ROW: 4 equal xs cards ─── */}
        <div className="nl-bottom-row">
          {xsCards.map((art, i) => (
            <a
              key={i}
              href={art.url || '#'}
              target="_blank"
              rel="noopener noreferrer"
              className="nl-card nl-card-xs"
            >
              <div
                className="nl-card-img"
                style={{ backgroundImage: `url('${art.urlToImage || FALLBACK_IMGS[i + 3]}')` }}
              >
                <div className="nl-card-img-overlay" />
                <div className="nl-card-source-badge">
                  {art.source?.name} · {timeAgo(art.publishedAt)}
                </div>
              </div>
              <div className="nl-card-body">
                <p className="nl-card-headline">{truncate(art.title, 70)}</p>
              </div>
            </a>
          ))}
        </div>

      </div>

      {loading && (
        <div className="nl-loading-bar">
          <div className="nl-loading-fill" />
        </div>
      )}
    </div>
  );
};

export default JournalPage;
