import fs from 'fs';
import path from 'path';
import { chromium } from 'playwright';

const AFFILIATE_ID = 'yofukashireview';
const DOMAIN = 'https://dlsite-auto-site.pages.dev';

async function fetchDLsiteData() {
  console.log('DLsiteデータ取得開始...');
  
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    viewport: { width: 1280, height: 800 },
    locale: 'ja-JP'
  });
  
  const page = await context.newPage();

  // 年齢認証クッキーを設定
  await context.addCookies([
    { name: 'adultchecked', value: '1', domain: '.dlsite.com', path: '/' },
    { name: 'work_view_option', value: '1', domain: '.dlsite.com', path: '/' }
  ]);

  try {
    await page.goto('https://www.dlsite.com/maniax/new', { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.evaluate(() => window.scrollBy(0, 500));
    await page.waitForTimeout(2000);

    const items = await page.evaluate((affiliateId) => {
      const elements = document.querySelectorAll('table.work_1col tr, .work_thumb_box, .dl_list_item, dt.work_name');
      const list = [];

      elements.forEach(el => {
        const parent = el.closest('tr') || el.closest('.work_thumb_box') || el.parentElement;
        if (!parent) return;

        const titleEl = parent.querySelector('.work_name a, .work_title a, dt a');
        const makerEl = parent.querySelector('.maker_name a, .author a, .maker a');
        const imgEl = parent.querySelector('img');
        const priceEl = parent.querySelector('.price, .work_price, .price_default');

        if (titleEl) {
          let link = titleEl.getAttribute('href') || titleEl.href || '';
          if (!link) return;

          // 絶対パスへ補正
          if (link.startsWith('/')) {
            link = 'https://www.dlsite.com' + link;
          } else if (!link.startsWith('http')) {
            link = 'https://www.dlsite.com/' + link;
          }

          // アフィリエイトIDを付与
          const cleanLink = link.split('?')[0];
          link = `${cleanLink}?af_id=${affiliateId}`;

          // 画像URLの堅牢な取得
          let imgUrl = '';
          if (imgEl) {
            imgUrl = imgEl.getAttribute('data-src') || imgEl.getAttribute('src') || imgEl.src || '';
            if (imgUrl.startsWith('//')) imgUrl = 'https:' + imgUrl;
          }

          const titleText = titleEl.innerText ? titleEl.innerText.trim() : '';

          if (titleText && !list.some(i => i.link === link)) {
            list.push({
              title: titleText,
              link: link,
              maker: makerEl ? makerEl.innerText.trim() : 'DLsite',
              image: imgUrl,
              price: priceEl ? priceEl.innerText.trim() : '価格情報なし'
            });
          }
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

// 元のすっきりした青系CSSスタイル（モダン＆シンプル）
const commonStyle = `
  :root { --primary: #2563eb; --primary-hover: #1d4ed8; --bg: #f8fafc; --card-bg: #ffffff; --text: #1e293b; --text-muted: #64748b; }
  body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: var(--bg); color: var(--text); margin: 0; padding: 0; line-height: 1.6; }
  header { background: #ffffff; color: var(--text); padding: 1.5rem 2rem; text-align: center; border-bottom: 1px solid #e2e8f0; }
  header h1 { margin: 0; font-size: 1.4rem; font-weight: 700; color: #0f172a; }
  nav.categories { background: #1e293b; padding: 0.6rem; text-align: center; }
  nav.categories a { color: #f8fafc; text-decoration: none; margin: 0 12px; font-weight: 600; font-size: 0.9rem; transition: color 0.2s; }
  nav.categories a:hover { color: #38bdf8; }
  .breadcrumb { max-width: 1200px; margin: 12px auto; padding: 0 20px; font-size: 0.85rem; color: var(--text-muted); }
  .breadcrumb a { color: var(--primary); text-decoration: none; }
  .container { max-width: 1200px; margin: 24px auto; padding: 0 20px; }
  .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 24px; }
  .card { background: var(--card-bg); border-radius: 12px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 1px 3px rgba(0,0,0,0.05); transition: transform 0.2s, box-shadow 0.2s; display: flex; flex-direction: column; }
  .card:hover { transform: translateY(-3px); box-shadow: 0 8px 16px rgba(0,0,0,0.08); }
  .card-img-wrapper { width: 100%; height: 200px; background: #e2e8f0; position: relative; overflow: hidden; }
  .card img { width: 100%; height: 100%; object-fit: cover; display: block; }
  .card-body { padding: 16px; display: flex; flex-direction: column; flex-grow: 1; }
  .card-title { font-size: 0.92rem; font-weight: 600; margin: 0 0 8px 0; line-height: 1.4; height: 2.8em; overflow: hidden; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; color: var(--text); }
  .card-maker { font-size: 0.8rem; color: var(--text-muted); margin-bottom: 12px; }
  .card-price { font-size: 1.05rem; color: #2563eb; font-weight: 700; margin-top: auto; margin-bottom: 12px; }
  .btn { display: block; text-align: center; background: var(--primary); color: white; text-decoration: none; padding: 10px 0; border-radius: 8px; font-weight: 600; font-size: 0.88rem; transition: background 0.2s; }
  .btn:hover { background: var(--primary-hover); }
  footer { text-align: center; padding: 24px; background: #ffffff; color: var(--text-muted); margin-top: 48px; border-top: 1px solid #e2e8f0; font-size: 0.85rem; }
  footer a { color: var(--primary); text-decoration: none; margin: 0 8px; }
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
    <a href="/asmr/">音声・ASMR特化</a>
  </nav>

  <div class="breadcrumb">
    ${breadcrumbHTML}
  </div>

  <div class="container">
    <div class="grid">
      ${items.map(item => `
        <div class="card">
          <div class="card-img-wrapper">
            <img src="${item.image}" alt="${item.title}" loading="lazy" onerror="this.onerror=null;this.src='https://www.dlsite.com/images/web/common/no_image/no_image_200x200.gif';">
          </div>
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
    <p><a href="/">トップページ</a> | <a href="/asmr/">音声・ASMR特化</a></p>
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
    { name: '音声・ASMR特化', path: '/asmr/' }
  ];
  const asmrHTML = generateHTML(
    'DLsite 音声・ASMRおすすめまとめ | 毎日更新ナビ',
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

  console.log('ビルド完了: 青系デザイン戻し、画像・リンク・SEO情報を更新しました。');
}

main();