import fs from 'fs';
import path from 'path';
import { chromium } from 'playwright';

const AFFILIATE_ID = 'yofukashireview';
const DOMAIN = 'https://dlsite-auto-site.pages.dev';

async function fetchDLsiteData() {
  console.log('DLsiteデータ取得開始...');
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  // 年齢認証クッキー
  await page.context().addCookies([
    { name: 'adultchecked', value: '1', domain: '.dlsite.com', path: '/' }
  ]);

  try {
    await page.goto('https://www.dlsite.com/maniax/new', { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForSelector('.work_1col', { timeout: 10000 }).catch(() => {});

    const items = await page.evaluate((affiliateId) => {
      const elements = document.querySelectorAll('.work_1col tr, .work_thumb_box');
      const list = [];

      elements.forEach(el => {
        const titleEl = el.querySelector('.work_name a');
        const makerEl = el.querySelector('.maker_name a');
        const imgEl = el.querySelector('img');
        const priceEl = el.querySelector('.price') || el.querySelector('.work_price');

        if (titleEl) {
          let link = titleEl.getAttribute('href') || titleEl.href || '';
          
          // 相対パスの場合は絶対URL（https://www.dlsite.com）に補正
          if (link.startsWith('/')) {
            link = 'https://www.dlsite.com' + link;
          } else if (!link.startsWith('http')) {
            link = 'https://www.dlsite.com/' + link;
          }

          // アフィリエイトIDの付与
          if (affiliateId) {
            link += (link.includes('?') ? '&' : '?') + `af_id=${affiliateId}`;
          }

          let imgUrl = imgEl ? (imgEl.getAttribute('data-src') || imgEl.src) : '';
          if (imgUrl.startsWith('//')) imgUrl = 'https:' + imgUrl;

          list.push({
            title: titleEl.innerText.trim(),
            link: link,
            maker: makerEl ? makerEl.innerText.trim() : '不明',
            image: imgUrl,
            price: priceEl ? priceEl.innerText.trim() : '価格情報なし'
          });
        }
      });
      return list;
    }, AFFILIATE_ID);

    console.log(`取得成功: ${items.length} 件`);
    return items;
  } catch (error) {
    console.error('データ取得エラー:', error);
    return [];
  } finally {
    await browser.close();
  }
}

// 共通CSSスタイル
const commonStyle = `
  :root { --primary: #e60012; --bg: #f8f9fa; --card-bg: #ffffff; --text: #333333; }
  body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: var(--bg); color: var(--text); margin: 0; padding: 0; line-height: 1.6; }
  header { background: var(--primary); color: white; padding: 1rem 2rem; text-align: center; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
  header h1 { margin: 0; font-size: 1.5rem; }
  nav.categories { background: #cc0010; padding: 0.5rem; text-align: center; }
  nav.categories a { color: white; text-decoration: none; margin: 0 10px; font-weight: bold; font-size: 0.9rem; }
  nav.categories a:hover { text-decoration: underline; }
  .breadcrumb { max-width: 1200px; margin: 10px auto; padding: 0 20px; font-size: 0.85rem; color: #666; }
  .breadcrumb a { color: #0066cc; text-decoration: none; }
  .container { max-width: 1200px; margin: 20px auto; padding: 0 20px; }
  .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 20px; }
  .card { background: var(--card-bg); border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.08); transition: transform 0.2s; display: flex; flex-direction: column; }
  .card:hover { transform: translateY(-4px); }
  .card img { width: 100%; height: 200px; object-fit: cover; background: #eee; }
  .card-body { padding: 15px; display: flex; flex-direction: column; flex-grow: 1; }
  .card-title { font-size: 0.95rem; font-weight: bold; margin: 0 0 8px 0; line-height: 1.4; height: 2.8em; overflow: hidden; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; }
  .card-maker { font-size: 0.8rem; color: #666; margin-bottom: 8px; }
  .card-price { font-size: 1rem; color: var(--primary); font-weight: bold; margin-top: auto; margin-bottom: 12px; }
  .btn { display: block; text-align: center; background: var(--primary); color: white; text-decoration: none; padding: 8px 0; border-radius: 4px; font-weight: bold; font-size: 0.9rem; }
  .btn:hover { opacity: 0.9; }
  footer { text-align: center; padding: 20px; background: #333; color: #fff; margin-top: 40px; font-size: 0.85rem; }
  footer a { color: #aaa; text-decoration: none; margin: 0 10px; }
`;

function generateHTML(title, description, items, breadcrumbs) {
  const breadcrumbHTML = breadcrumbs.map((b, i) => 
    i === breadcrumbs.length - 1 ? `<span>${b.name}</span>` : `<a href="${b.path}">${b.name}</a> &gt; `
  ).join('');

  return `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <meta name="description" content="${description}">
  <style>${commonStyle}</style>
</head>
<body>
  <header>
    <h1>${title}</h1>
  </header>
  <nav class="categories">
    <a href="/">総合最新</a> | 
    <a href="/asmr/">ASMR・同人音声</a>
  </nav>

  <div class="breadcrumb">
    ${breadcrumbHTML}
  </div>

  <div class="container">
    <div class="grid">
      ${items.map(item => `
        <div class="card">
          <img src="${item.image}" alt="${item.title}" loading="lazy">
          <div class="card-body">
            <div class="card-title">${item.title}</div>
            <div class="card-maker">${item.maker}</div>
            <div class="card-price">${item.price}</div>
            <a href="${item.link}" class="btn" target="_blank" rel="noopener noreferrer">DLsiteで見る</a>
          </div>
        </div>
      `).join('')}
    </div>
  </div>

  <footer>
    <p><a href="/">トップページ</a> | <a href="/asmr/">ASMR・同人音声</a></p>
    <p>&copy; 2026 DLsiteおすすめ作品まとめ</p>
  </footer>
</body>
</html>`;
}

async function main() {
  const items = await fetchDLsiteData();

  if (items.length === 0) {
    console.log('データが取得できなかったためビルドを中断します。');
    return;
  }

  const publicDir = path.join(process.cwd(), 'public');
  const asmrDir = path.join(publicDir, 'asmr');

  if (!fs.existsSync(publicDir)) fs.mkdirSync(publicDir, { recursive: true });
  if (!fs.existsSync(asmrDir)) fs.mkdirSync(asmrDir, { recursive: true });

  // 1. トップページ
  const topBreadcrumbs = [{ name: 'ホーム', path: '/' }];
  const topHTML = generateHTML(
    'DLsiteおすすめ作品まとめ | 毎日更新ナビ',
    'DLsiteの最新人気作品を毎日自動更新でお届けします。全ジャンルの注目作品をチェック！',
    items,
    topBreadcrumbs
  );
  fs.writeFileSync(path.join(publicDir, 'index.html'), topHTML);

  // 2. ASMR・音声特化ページ
  const asmrKeywords = ['ASMR', '音声', 'ボイス', '耳かき', '睡眠', '囁き', '耳攻め', '癒やし'];
  const asmrItems = items.filter(item => 
    asmrKeywords.some(kw => item.title.includes(kw) || item.maker.includes(kw))
  );

  const asmrBreadcrumbs = [
    { name: 'ホーム', path: '/' },
    { name: 'ASMR・同人音声', path: '/asmr/' }
  ];
  const asmrHTML = generateHTML(
    'DLsite ASMR・同人音声おすすめまとめ | 毎日更新ナビ',
    'DLsiteで人気のASMR・同人音声作品を厳選してお届け。安眠系・耳かき・シチュエーションボイスなど最新作品を毎日更新！',
    asmrItems.length > 0 ? asmrItems : items,
    asmrBreadcrumbs
  );
  fs.writeFileSync(path.join(asmrDir, 'index.html'), asmrHTML);

  // 3. SEO用 sitemap.xml & robots.txt
  const sitemapXML = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${DOMAIN}/</loc>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>${DOMAIN}/asmr/</loc>
    <changefreq>daily</changefreq>
    <priority>0.8</priority>
  </url>
</urlset>`;
  fs.writeFileSync(path.join(publicDir, 'sitemap.xml'), sitemapXML);

  const robotsTxt = `User-agent: *
Allow: /
Sitemap: ${DOMAIN}/sitemap.xml`;
  fs.writeFileSync(path.join(publicDir, 'robots.txt'), robotsTxt);

  console.log('ビルド完了: 絶対URLへの補正およびアフィリエイトIDを反映しました。');
}

main();