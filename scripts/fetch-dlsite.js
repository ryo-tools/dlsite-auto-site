import fs from 'fs';
import path from 'path';
import { chromium } from 'playwright';

// アフィリエイトID
const AFFILIATE_ID = 'yofukashireview'; 
const TARGET_URL = 'https://www.dlsite.com/maniax/';
const SITE_DOMAIN = 'https://dlsite-auto-site.pages.dev';

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

function buildHtmlTemplate({ title, description, canonicalUrl, itemsHtml }) {
  return `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)}</title>
  <meta name="description" content="${escapeHtml(description)}">
  <link rel="canonical" href="${canonicalUrl}">
  
  <!-- OGP (SNS表示用タグ) -->
  <meta property="og:type" content="website">
  <meta property="og:title" content="${escapeHtml(title)}">
  <meta property="og:description" content="${escapeHtml(description)}">
  <meta property="og:url" content="${canonicalUrl}">
  <meta property="og:site_name" content="音声・ASMR特化まとめナビ">
  
  <link rel="stylesheet" href="/css/style.css">
</head>
<body>
  <header class="header">
    <div class="container">
      <h1><a href="/" style="color: inherit; text-decoration: none;">音声・ASMR特化まとめナビ</a></h1>
      <p>DLsiteの最新・人気作品を毎日自動更新中</p>
      <nav style="margin-top: 15px; display: flex; justify-content: center; gap: 15px;">
        <a href="/" style="color: #38bdf8; text-decoration: none; font-weight: bold;">[ 全体最新 ]</a>
        <a href="/asmr/" style="color: #38bdf8; text-decoration: none; font-weight: bold;">[ ASMR・音声特化 ]</a>
      </nav>
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
}

async function generateSite() {
  const publicDir = path.join(process.cwd(), 'public');
  const asmrDir = path.join(publicDir, 'asmr');

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

    console.log('Scrolling page to trigger image loading...');
    for (let i = 0; i < 6; i++) {
      await page.evaluate(() => window.scrollBy(0, 800));
      await page.waitForTimeout(500);
    }

    console.log('Extracting product items from DOM...');
    items = await page.evaluate(() => {
      const results = [];
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

        let imgUrl = '';
        if (img) {
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

  } catch (error) {
    console.error('Browser automation error:', error.message);
  } finally {
    await browser.close();
  }

  // HTMLカード要素の生成ヘルパー
  const renderCards = (itemList) => itemList.map(item => {
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

  // 1. トップページ用（全体最新30件）
  const topHtml = buildHtmlTemplate({
    title: '【最新】おすすめASMR・同人音声まとめ特化ナビ',
    description: 'DLsiteの最新おすすめASMR・同人音声作品を自動更新で届ける特化型データベースです。',
    canonicalUrl: `${SITE_DOMAIN}/`,
    itemsHtml: renderCards(items)
  });

  // 2. SEO特化ページ用（ASMR・ボイスタイトルを中心に抽出）
  const asmrItems = items.filter(i => i.title.includes('ASMR') || i.title.includes('ボイス') || i.title.includes('耳かき') || i.title.includes('音声'));
  const targetAsmrItems = asmrItems.length > 0 ? asmrItems : items;

  const asmrHtml = buildHtmlTemplate({
    title: '【2026年最新】おすすめASMR・同人音声作品まとめ - 特化ナビ',
    description: '耳かき・睡眠導入・甘やかしなど、DLsiteで今売れている人気のASMR・同人音声作品をまとめた特化ページです。',
    canonicalUrl: `${SITE_DOMAIN}/asmr/`,
    itemsHtml: renderCards(targetAsmrItems)
  });

  // ディレクトリ生成 & 書き込み
  if (!fs.existsSync(publicDir)) fs.mkdirSync(publicDir, { recursive: true });
  if (!fs.existsSync(asmrDir)) fs.mkdirSync(asmrDir, { recursive: true });

  fs.writeFileSync(path.join(publicDir, 'index.html'), topHtml, 'utf-8');
  fs.writeFileSync(path.join(asmrDir, 'index.html'), asmrHtml, 'utf-8');

  console.log('Successfully generated multiple SEO pages (index.html & asmr/index.html)!');
}

generateSite();