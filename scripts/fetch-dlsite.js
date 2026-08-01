import fs from 'fs';
import path from 'path';
import { chromium } from 'playwright';

const AFFILIATE_ID = 'yofukashireview';
const DOMAIN = 'https://dlsite-auto-site.pages.dev';

async function fetchDLsiteData() {
  console.log('DLsiteデータ取得開始...');
  
  const browser = await chromium.launch({
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-blink-features=AutomationControlled'
    ]
  });

  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    viewport: { width: 1280, height: 800 },
    locale: 'ja-JP'
  });

  const page = await context.newPage();

  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
  });

  await context.addCookies([
    { name: 'adultchecked', value: '1', domain: '.dlsite.com', path: '/' },
    { name: 'work_view_option', value: '1', domain: '.dlsite.com', path: '/' }
  ]);

  try {
    console.log('ページへアクセス中...');
    await page.goto('https://www.dlsite.com/maniax/new', { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForTimeout(2000);

    const items = await page.evaluate((affiliateId) => {
      const list = [];
      const titleLinks = document.querySelectorAll('.work_name a, .work_title a, dt.work_name a');

      titleLinks.forEach(linkEl => {
        const titleText = linkEl.innerText ? linkEl.innerText.trim() : '';
        if (!titleText) return;

        let rawLink = linkEl.getAttribute('href') || '';
        if (!rawLink) return;

        if (rawLink.startsWith('/')) {
          rawLink = 'https://www.dlsite.com' + rawLink;
        } else if (!rawLink.startsWith('http')) {
          rawLink = 'https://www.dlsite.com/' + rawLink;
        }

        const cleanLink = rawLink.split('?')[0];
        const finalLink = `${cleanLink}?af_id=${affiliateId}`;

        // RJ品番（例: RJ01234567 または RJ123456）を抽出
        const rjMatch = cleanLink.match(/(RJ[0-9]+)/i);
        let imgUrl = '';

        if (rjMatch) {
          const rjCode = rjMatch[1].toUpperCase();
          const digits = rjCode.replace('RJ', '');
          let folder = '';

          if (digits.length >= 8) {
            // 8桁の場合（例: RJ01001234 -> RJ01002000）
            const num = parseInt(digits, 10);
            const rounded = Math.ceil(num / 1000) * 1000;
            folder = 'RJ' + String(rounded).padStart(digits.length, '0');
          } else {
            // 6桁の場合（例: RJ123456 -> RJ124000）
            const num = parseInt(digits, 10);
            const rounded = Math.ceil(num / 1000) * 1000;
            folder = 'RJ' + String(rounded).padStart(digits.length, '0');
          }

          imgUrl = `https://img.dlsite.jp/modpub/images2/work/doujin/${folder}/${rjCode}_img_main.jpg`;
        }

        const container = linkEl.closest('tr') || linkEl.closest('.work_thumb_box') || linkEl.closest('li') || linkEl.parentElement.parentElement;

        let maker = 'DLsite';
        let price = '価格情報なし';

        if (container) {
          const makerEl = container.querySelector('.maker_name a, .author a, .maker a');
          if (makerEl) maker = makerEl.innerText.trim();

          const priceEl = container.querySelector('.price, .work_price, .price_default');
          if (priceEl) price = priceEl.innerText.trim();
        }

        if (!list.some(i => i.link === finalLink)) {
          list.push({
            title: titleText,
            link: finalLink,
            maker: maker,
            image: imgUrl || 'https://www.dlsite.com/images/web/common/no_image/no_image_200x200.gif',
            price: price
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

// 初期状態の青系デザインスタイル
const commonStyle = `
  * { box-sizing: border-box; }
  body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background-color: #f5f7fa; color: #333; margin: 0; padding: 0; line-height: 1.5; }
  header { background-color: #ffffff; padding: 20px; text-align: center; border-bottom: 1px solid #e1e8ed; }
  header h1 { margin: 0; font-size: 1.4rem; color: #1c2938; }
  nav.categories { background-color: #2b3846; padding: 10px; text-align: center; flex-wrap: wrap; display: flex; justify-content: center; gap: 15px; }
  nav.categories a { color: #ffffff; text-decoration: none; font-weight: bold; font-size: 0.9rem; }
  nav.categories a:hover { color: #1da1f2; text-decoration: underline; }
  .breadcrumb { max-width: 1200px; margin: 15px auto 0; padding: 0 20px; font-size: 0.85rem; color: #657786; }
  .breadcrumb a { color: #1da1f2; text-decoration: none; }
  .container { max-width: 1200px; margin: 20px auto; padding: 0 20px; }
  .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 20px; }
  .card { background: #ffffff; border-radius: 8px; border: 1px solid #e1e8ed; overflow: hidden; display: flex; flex-direction: column; transition: transform 0.15s ease; }
  .card:hover { transform: translateY(-2px); box-shadow: 0 4px 12px rgba(0,0,0,0.05); }
  .card-img-wrapper { width: 100%; height: 180px; background-color: #e1e8ed; overflow: hidden; }
  .card img { width: 100%; height: 100%; object-fit: cover; display: block; }
  .card-body { padding: 12px; display: flex; flex-direction: column; flex-grow: 1; }
  .card-title { font-size: 0.9rem; font-weight: bold; margin: 0 0 6px 0; line-height: 1.35; height: 2.7em; overflow: hidden; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; color: #1c2938; }
  .card-maker { font-size: 0.8rem; color: #657786; margin-bottom: 8px; }
  .card-price { font-size: 0.95rem; color: #e63946; font-weight: bold; margin-top: auto; margin-bottom: 10px; }
  .btn { display: block; text-align: center; background-color: #1da1f2; color: #ffffff; text-decoration: none; padding: 8px 0; border-radius: 4px; font-weight: bold; font-size: 0.85rem; }
  .btn:hover { background-color: #0c85d0; }
  footer { text-align: center; padding: 20px; background: #ffffff; color: #657786; margin-top: 40px; border-top: 1px solid #e1e8ed; font-size: 0.85rem; }
  footer a { color: #1da1f2; text-decoration: none; margin: 0 10px; }
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
  <meta name="referrer" content="no-referrer">
  <title>${title}</title>
  <meta name="description" content="${description}">
  <style>${commonStyle}</style>
</head>
<body>
  <header>
    <h1>${title}</h1>
  </header>
  <nav class="categories">
    <a href="/">総合最新</a>
    <a href="/asmr/">音声・ASMR特化</a>
    <a href="/manga/">マンガ・コミック</a>
    <a href="/game/">ゲーム・CG</a>
  </nav>

  <div class="breadcrumb">
    ${breadcrumbHTML}
  </div>

  <div class="container">
    <div class="grid">
      ${items.map(item => `
        <div class="card">
          <div class="card-img-wrapper">
            <img src="${item.image}" alt="${item.title}" loading="lazy" referrerpolicy="no-referrer">
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
    <p>
      <a href="/">トップページ</a> | 
      <a href="/asmr/">音声・ASMR</a> | 
      <a href="/manga/">マンガ</a> | 
      <a href="/game/">ゲーム</a>
    </p>
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
  const mangaDir = path.join(publicDir, 'manga');
  const gameDir = path.join(publicDir, 'game');

  if (!fs.existsSync(publicDir)) fs.mkdirSync(publicDir, { recursive: true });
  if (!fs.existsSync(asmrDir)) fs.mkdirSync(asmrDir, { recursive: true });
  if (!fs.existsSync(mangaDir)) fs.mkdirSync(mangaDir, { recursive: true });
  if (!fs.existsSync(gameDir)) fs.mkdirSync(gameDir, { recursive: true });

  // 1. トップページ（総合）
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

  // 3. マンガ・コミック特化ページ
  const mangaKeywords = ['CG', 'CG集', 'コミック', 'マンガ', '漫画', '同人誌', 'イラスト'];
  const mangaItems = items.filter(item => 
    mangaKeywords.some(kw => item.title.includes(kw) || item.maker.includes(kw))
  );
  const mangaBreadcrumbs = [
    { name: 'ホーム', path: '/' },
    { name: 'マンガ・コミック', path: '/manga/' }
  ];
  const mangaHTML = generateHTML(
    'DLsite 同人マンガ・CG集おすすめまとめ | 毎日更新ナビ',
    'DLsiteで人気の同人マンガ・CG集・イラスト作品を厳選してお届け。話題の新作コミックを毎日更新！',
    mangaItems.length > 0 ? mangaItems : items,
    mangaBreadcrumbs
  );
  fs.writeFileSync(path.join(mangaDir, 'index.html'), mangaHTML);

  // 4. ゲーム・CG特化ページ
  const gameKeywords = ['ゲーム', 'RPG', 'ACT', 'SLG', 'ADV', 'ノベル', 'シミュレーション', '体験版'];
  const gameItems = items.filter(item => 
    gameKeywords.some(kw => item.title.includes(kw) || item.maker.includes(kw))
  );
  const gameBreadcrumbs = [
    { name: 'ホーム', path: '/' },
    { name: 'ゲーム・CG', path: '/game/' }
  ];
  const gameHTML = generateHTML(
    'DLsite 同人ゲームおすすめまとめ | 毎日更新ナビ',
    'DLsiteで人気の同人ゲーム・長編RPG・アクション作品を厳選してお届け。話題の新作ゲームを毎日更新！',
    gameItems.length > 0 ? gameItems : items,
    gameBreadcrumbs
  );
  fs.writeFileSync(path.join(gameDir, 'index.html'), gameHTML);

  // 5. SEO用 sitemap.xml & robots.txt
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
  <url>
    <loc>${DOMAIN}/manga/</loc>
    <changefreq>daily</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>${DOMAIN}/game/</loc>
    <changefreq>daily</changefreq>
    <priority>0.8</priority>
  </url>
</urlset>`;
  fs.writeFileSync(path.join(publicDir, 'sitemap.xml'), sitemapXML);

  const robotsTxt = `User-agent: *
Allow: /
Sitemap: ${DOMAIN}/sitemap.xml`;
  fs.writeFileSync(path.join(publicDir, 'robots.txt'), robotsTxt);

  // 最新データをJSONとしても保存（Bluesky投稿などで参照用・main関数の内側に配置）
  fs.writeFileSync(path.join(publicDir, 'data.json'), JSON.stringify(items, null, 2));

  console.log('ビルド完了: 全カテゴリページ（総合/ASMR/マンガ/ゲーム）とdata.jsonを出力しました。');
}

main();