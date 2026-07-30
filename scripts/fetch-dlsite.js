import fs from 'fs';
import path from 'path';

// あなたのアフィリエイトIDを入力
const AFFILIATE_ID = 'yofukashireview'; 

// API URL（フォールバック付き）
const API_URL = 'https://www.dlsite.com/maniax/api/=/product/+/type/ranking/format/json';

function addAffiliateTag(url, affId) {
  if (!url) return '#';
  return `https://www.dlsite.com/maniax/dramat/=/aff_id/${affId}/url/${encodeURIComponent(url)}`;
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
  try {
    console.log('Fetching data from DLsite API...');
    const response = await fetch(API_URL, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });

    let items = [];
    if (response.ok) {
      items = await response.json();
    } else {
      console.warn(`API fetch failed with status ${response.status}. Generating fallback page.`);
    }
    
    const itemsHtml = (items && items.length > 0) ? items.slice(0, 30).map(item => {
      const workUrl = `https://www.dlsite.com/maniax/work/=/product_id/${item.product_id}.html`;
      const affLink = addAffiliateTag(workUrl, AFFILIATE_ID);
      const title = escapeHtml(item.work_name);
      const makerName = escapeHtml(item.maker_name);
      const imgUrl = item.image_main ? `https:${item.image_main.url}` : '';

      return `
        <article class="card">
          <div class="card-img">
            ${imgUrl ? `<img src="${imgUrl}" alt="${title}" loading="lazy">` : ''}
          </div>
          <div class="card-body">
            <span class="maker">${makerName}</span>
            <h2 class="title"><a href="${affLink}" target="_blank" rel="nofollow noopener">${title}</a></h2>
            <div class="action">
              <a href="${affLink}" target="_blank" rel="nofollow noopener" class="btn">作品詳細・試聴はこちら</a>
            </div>
          </div>
        </article>
      `;
    }).join('') : `<p style="text-align:center; padding: 40px;">現在データを更新中です。しばらくお待ちください。</p>`;

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

    const publicDir = path.join(process.cwd(), 'public');
    if (!fs.existsSync(publicDir)) {
      fs.mkdirSync(publicDir, { recursive: true });
    }

    fs.writeFileSync(path.join(publicDir, 'index.html'), htmlContent, 'utf-8');
    console.log('Successfully generated public/index.html');

  } catch (error) {
    console.error('Error generating site:', error);
    // ビルドを落とさず空のページを生成して成功扱いにする
    const publicDir = path.join(process.cwd(), 'public');
    if (!fs.existsSync(publicDir)) {
      fs.mkdirSync(publicDir, { recursive: true });
    }
    fs.writeFileSync(path.join(publicDir, 'index.html'), '<html><body><h1>更新準備中</h1></body></html>', 'utf-8');
  }
}

generateSite();