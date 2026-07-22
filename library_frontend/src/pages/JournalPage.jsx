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
  const [activeCategory, setActiveCategory] = useState('all');

  useEffect(() => {
    // Fetch India general current affairs + world top headlines in parallel
    const INDIA_GENERAL = 'https://saurav.tech/NewsAPI/top-headlines/category/general/in.json';
    const WORLD_TOP     = 'https://saurav.tech/NewsAPI/everything/cnn.json';
    const INDIA_POLITICS = 'https://saurav.tech/NewsAPI/top-headlines/category/politics/in.json';

    Promise.all([
      fetch(INDIA_GENERAL).then(r => r.json()).catch(() => ({ articles: [] })),
      fetch(WORLD_TOP).then(r => r.json()).catch(() => ({ articles: [] })),
      fetch(INDIA_POLITICS).then(r => r.json()).catch(() => ({ articles: [] })),
    ]).then(([india, world, politics]) => {
      // Interleave: India + World articles for a mixed, balanced feed
      const indiaArts   = (india.articles   || []).slice(0, 15);
      const worldArts   = (world.articles   || []).slice(0, 10);
      const politicsArts = (politics.articles || []).slice(0, 8);

      // Merge & deduplicate by title
      const seen = new Set();
      const merged = [];
      const addAll = (arr) => arr.forEach(a => {
        const key = (a.title || '').trim().toLowerCase();
        if (!seen.has(key)) { seen.add(key); merged.push(a); }
      });
      // interleave india + world
      const maxLen = Math.max(indiaArts.length, worldArts.length, politicsArts.length);
      for (let i = 0; i < maxLen; i++) {
        if (indiaArts[i])    addAll([indiaArts[i]]);
        if (worldArts[i])    addAll([worldArts[i]]);
        if (politicsArts[i]) addAll([politicsArts[i]]);
      }
      setArticles(merged);
      setLoading(false);
    });
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

  // Categorize articles based on keywords in title/description
  const categorize = (art) => {
    const text = ((art.title || '') + ' ' + (art.description || '')).toLowerCase();
    const indiaKeywords = ['india', 'modi', 'delhi', 'mumbai', 'bjp', 'congress', 'rupee', 'isro', 'lok sabha', 'rajya sabha', 'indian'];
    if (indiaKeywords.some(k => text.includes(k))) return 'india';
    return 'world';
  };

  const filteredArticles = activeCategory === 'all'
    ? articles
    : articles.filter(a => categorize(a) === activeCategory);

  const featured = filteredArticles[activeSlide] || get(activeSlide);
  const smCards  = [filteredArticles[3] || get(3), filteredArticles[4] || get(4)];
  const xsCards  = filteredArticles.slice(5);  // ALL remaining articles as scrollable bottom row

  return (
    <div className="nl-wrapper">

      {/* ── Header bar ── */}
      <div className="nl-header">
        <span className="nl-header-title">CURRENT AFFAIRS</span>
        <div className="nl-header-right">
          <button
            className={`nl-cat-btn${activeCategory === 'all' ? ' active' : ''}`}
            onClick={() => { setActiveCategory('all'); setActiveSlide(0); }}
          >All</button>
          <button
            className={`nl-cat-btn${activeCategory === 'india' ? ' active' : ''}`}
            onClick={() => { setActiveCategory('india'); setActiveSlide(0); }}
          >🇮🇳 India</button>
          <button
            className={`nl-cat-btn${activeCategory === 'world' ? ' active' : ''}`}
            onClick={() => { setActiveCategory('world'); setActiveSlide(0); }}
          >🌍 World</button>
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

        {/* ─── BOTTOM ROW: scrollable xs cards ─── */}
        <div className="nl-bottom-row-scroll">
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
                style={{ backgroundImage: `url('${art.urlToImage || FALLBACK_IMGS[(i + 3) % FALLBACK_IMGS.length]}')` }}
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
