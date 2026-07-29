import Parser from 'rss-parser';
import fs from 'fs';
import path from 'path';

const parser = new Parser();

// あなたのアフィリエイトIDを入力
const AFFILIATE_ID = 'yofukashireview'; 
const RSS_URL = 'https://www.dlsite.com/maniax/rss/'; 

function addAffiliateTag(url, affId) {
  if (!url) return '#';
  const cleanUrl = url.split('/link/')[0]; 
  return `https://www.dlsite.com/maniax/dramat/=/aff_id/${affId}/url/${encodeURIComponent(cleanUrl)}`;
}

function escapeHtml(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

async function generateSite() {
  try {
    console.log('Fetching RSS from DLsite...');
    const feed = await parser.parseURL(RSS_URL);
    
    const itemsHtml = feed.items.slice(0, 30).map(item => {
      const affLink = addAffiliateTag(item.link, AFFILIATE_ID);
      const title = escapeHtml(item.title);
      const content = item.contentSnippet ? escapeHtml(item.contentSnippet.slice(0, 120)) + '...' : '';
      const pubDate = item.pubDate ? new Date(item.pubDate).toLocaleDateString('ja-JP') : '';

      return `
        <article class="card">
          <div class="card-body">
            <span class="date">${pubDate}</span>
            <h2 class="title"><a href="${affLink}" target="_blank" rel="nofollow noopener">${title}</a></h2>
            <p class="description">${content}</p>
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

    const publicDir = path.join(process.cwd(), 'public');
    if (!fs.existsSync(publicDir)) {
      fs.mkdirSync(publicDir, { recursive: true });
    }

    fs.writeFileSync(path.join(publicDir, 'index.html'), htmlContent, 'utf-8');
    console.log('Successfully generated public/index.html');

  } catch (error) {
    console.error('Error generating site:', error);
    process.exit(1);
  }
}

generateSite();