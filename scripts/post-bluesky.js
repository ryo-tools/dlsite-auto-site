import fs from 'fs';
import path from 'path';
import { BskyAgent } from '@atproto/api';

const HANDLE = process.env.BLUESKY_HANDLE;
const PASSWORD = process.env.BLUESKY_PASSWORD;

async function postToBluesky() {
  if (!HANDLE || !PASSWORD) {
    console.log('Blueskyのログイン情報が未設定のため投稿をスキップします。');
    return;
  }

  const jsonPath = path.join(process.cwd(), 'public', 'data.json');
  if (!fs.existsSync(jsonPath)) {
    console.log('data.json が見つからないため投稿をスキップします。');
    return;
  }

  const items = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
  if (!items || items.length === 0) {
    console.log('投稿対象の作品データがありません。');
    return;
  }

  // 1番目の最新作品を取得
  const topItem = items[0];

  const agent = new BskyAgent({ service: 'https://bsky.social' });

  try {
    await agent.login({ identifier: HANDLE, password: PASSWORD });
    console.log('Blueskyログイン成功');

    let imageEmbed = undefined;

    // 画像URLが存在する場合、画像をダウンロードしてBlueskyへアップロード
    if (topItem.image && topItem.image.startsWith('http')) {
      try {
        console.log(`画像をダウンロード中: ${topItem.image}`);
        const response = await fetch(topItem.image, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
            'Referer': 'https://www.dlsite.com/'
          }
        });

        if (response.ok) {
          const arrayBuffer = await response.arrayBuffer();
          const buffer = Buffer.from(arrayBuffer);

          // Blueskyサーバーへ画像をアップロード
          const uploadRes = await agent.uploadBlob(buffer, {
            encoding: 'image/jpeg'
          });

          // ポスト添付用データを作成
          imageEmbed = {
            $type: 'app.bsky.embed.images',
            images: [
              {
                alt: topItem.title,
                image: uploadRes.data.blob
              }
            ]
          };
          console.log('画像のアップロード成功！');
        }
      } catch (imgError) {
        console.error('画像アップロードに失敗（テキストのみで続行します）:', imgError);
      }
    }

    // 投稿本文を作成
    const text = `【DLsite最新おすすめ作品】\n\n『${topItem.title}』\nサークル：${topItem.maker}\n価格：${topItem.price}\n\n👇作品の詳細・チェックはこちら\n${topItem.link}`;

    // 投稿パラメータ作成
    const postPayload = {
      text: text,
      createdAt: new Date().toISOString()
    };

    if (imageEmbed) {
      postPayload.embed = imageEmbed;
    }

    await agent.post(postPayload);

    console.log(`Blueskyへの画像付き自動投稿完了: ${topItem.title}`);
  } catch (error) {
    console.error('Bluesky投稿エラー:', error);
  }
}

postToBluesky();