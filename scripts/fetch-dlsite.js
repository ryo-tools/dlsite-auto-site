import fs from 'fs';
import path from 'path';
import { chromium } from 'playwright';

// アフィリエイトID
const AFFILIATE_ID = 'yofukashireview'; 

// トップページ（100%年齢クッキーが効いてランキング・新着作品が取得可能なURL）
const TARGET_URL = 'https://www.dlsite.com/maniax/';

function addAffiliateTag(url, affId) {
  if (!url) return '#';
  const cleanUrl = url.split('?')[0];
  return `https://www.dlsite.com/maniax/dramat/=/aff_id/${affId}/url/${encodeURIComponent(cleanUrl)}`;
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

async function generateSite() {
  const publicDir = path.join(process.cwd(), 'public');
  const indexPath = path.join(publicDir, 'index.html');

  console.log('Starting headless browser...');
  const browser = await chromium.launch({ headless: true });

  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
    locale: 'ja-JP',
    viewport: { width: 1440, height: 900 }
  });

  await context.addCookies([
    { name: 'adult', value: '1', domain: '.dlsite.com', path: '/' },
    { name: 'adult_checked', value: '1', domain: '.dlsite.com', path: '/' },
    { name: 'locale', value: 'ja_JP', domain: '.dlsite.com', path: '/' }
  ]);

  const page = await context.newPage();
  let items = [];

  try {
    console.log('Navigating to DLsite maniax Top...');
    await page.goto(TARGET_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });

    const ageBtn = page.locator('.btn_yes, a.btn_enter, .age_check_btn').first();
    if (await ageBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      console.log('Clicking age verification modal...');
      await ageBtn.click();
      await page.waitForTimeout(1000);
    }

    // 遅延読み込みの全画像を展開するために画面下部までスクロール＆待機
    console.log('Scrolling page to trigger image loading...');
    for (let i = 0; i < 6; i++) {
      await page.evaluate(() => window.scrollBy(0, 800));
      await page.waitForTimeout(500);
    }

    console.log('Extracting product items from DOM...');
    items = await page.evaluate(() => {
      const results = [];
      // 各作品の要素ブロックを取得
      const workElements = Array.from(document.querySelectorAll('.work_1col, .work_thumb_inner, .search_result_item, .work_item, dl, li'));

      for (const box of workElements) {
        if (results.length >= 30) break;

        const a = box.querySelector('a[href*="/product_id/"]');
        if (!a) continue;

        const href = a.href || '';
        if (!href) continue;

        let title = a.innerText?.trim() || '';
        const img = box.querySelector('img');
        if (!title || title.length < 2) {
          title = img?.alt || img?.title || '';
        }
        if (!title || title.length < 2) continue;

        const cleanUrl = href.split('?')[0];
        if (results.some(r => r.url === cleanUrl)) continue;

        // 画像URLの厳密取得
        let imgUrl = '';
        if (img) {
          // 属性の優先順位をつけて本物の画像URLを取得
          const candidate = img.getAttribute('data-src') || 
                            img.getAttribute('data-original') || 
                            img.getAttribute('data-lazy-src') || 
                            img.src || '';

          if (candidate && !candidate.includes('blank.gif') && !candidate.includes('pixel.gif') && !candidate.startsWith('data:')) {
            imgUrl = candidate.startsWith('//') ? 'https:' + candidate : candidate;
          }
        }

        const makerEl = box.querySelector('.maker_name, .sub_title, a[href*="/maker/"]');
        const makerName = makerEl?.innerText?.trim() || '同人サークル';

        results.push({
          title,
          url: cleanUrl,
          makerName,
          imgUrl
        });
      }
      return results;
    });

    console.log(`Successfully fetched ${items.length} items using Playwright!`);

  } catch (error) {
    console.error('Browser automation error:', error.message);
  } finally {
    await browser.close();
  }

  if (items.length === 0) {
    console.warn('Fallback to sample data as browser returned 0 items');
    items = [
      {
        title: '【ASMR】耳かき＆最高級甘やかしボイス',
        makerName: '声優特化サークル',
        url: 'https://www.dlsite.com/maniax/work/=/product_id/RJ01183210.html',
        imgUrl: ''
      }
    ];
  }

  const itemsHtml = items.map(item => {
    const affLink = addAffiliateTag(item.url, AFFILIATE_ID);
    return `
      <article class="card">
        <div class="card-img">
          ${item.imgUrl ? `<img src="${item.imgUrl}" alt="${escapeHtml(item.title)}" loading="lazy">` : '<div style="background:#222;height:200px;display:flex;align-items:center;justify-content:center;color:#888;">No Image</div>'}
        </div>
        <div class="card-body">
          <span class="maker">${escapeHtml(item.makerName)}</span>
          <h2 class="title"><a href="${affLink}" target="_blank" rel="nofollow noopener">${escapeHtml(item.title)}</a></h2>
          <div class="action">
            <a href="${affLink}" target="_blank" rel="nofollow noopener" class="btn">作品詳細・試聴はこちら</a>
          </div>
        </div>
      </article>
    `;
  }).join('');

  const htmlContent = `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>【最新】おすすめASMR・同人音声まとめ特化ナビ</title>
  <meta name="description" content="DLsiteの最新おすすめASMR・同人音声作品を自動更新で届ける特化型データベースです。">
  <link rel="stylesheet" href="./css/style.css">
</head>
<body>
  <header class="header">
    <div class="container">
      <h1>音声・ASMR特化まとめナビ</h1>
      <p>DLsiteの最新・人気作品を毎日自動更新中</p>
    </div>
  </header>
  <main class="container grid">
    ${itemsHtml}
  </main>
  <footer class="footer">
    <div class="container">
      <p>&copy; ${new Date().getFullYear()} 音声・ASMR特化まとめナビ. All rights reserved.</p>
    </div>
  </footer>
</body>
</html>`;

  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true });
  }

  fs.writeFileSync(indexPath, htmlContent, 'utf-8');
  console.log('Successfully generated public/index.html!');
}

generateSite();