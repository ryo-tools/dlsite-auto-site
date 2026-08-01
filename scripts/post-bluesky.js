import fs from 'fs';
import path from 'path';
import { BskyAgent, RichText } from '@atproto/api';

const HANDLE = process.env.BLUESKY_HANDLE;
const PASSWORD = process.env.BLUESKY_PASSWORD;
const SITE_URL = 'https://dlsite-auto-site.pages.dev/asmr/';

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

  // ASMR・音声作品に絞り込む
  const asmrKeywords = ['ASMR', '音声', 'ボイス', '耳かき', '睡眠', '囁き', '耳攻め', '癒やし', 'バイノーラル', 'シチュエーション'];
  const asmrItems = items.filter(item => 
    asmrKeywords.some(kw => item.title.includes(kw) || item.maker.includes(kw))
  );

  // ASMR作品が見つかればその1番目、なければ全体の1番目を取得
  const topItem = asmrItems.length > 0 ? asmrItems[0] : items[0];

  const agent = new BskyAgent({ service: 'https://bsky.social' });

  try {
    await agent.login({ identifier: HANDLE, password: PASSWORD });
    console.log('Blueskyログイン成功');

    let thumbBlob = undefined;

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

          const uploadRes = await agent.uploadBlob(buffer, {
            encoding: 'image/jpeg'
          });

          thumbBlob = uploadRes.data.blob;
          console.log('サムネイル画像のアップロード成功！');
        }
      } catch (imgError) {
        console.error('画像アップロードに失敗（テキストカードのみで続行します）:', imgError);
      }
    }

    // 1. 本文テキストを作成し、RichTextでURLを自動リンク化
    const rawText = `【DLsite最新おすすめASMR】\n\n『${topItem.title}』\nサークル：${topItem.maker}\n価格：${topItem.price}\n\n👇最新のASMR作品一覧・詳細はこちらから\n${SITE_URL}`;
    const rt = new RichText({ text: rawText });
    await rt.detectFacets(agent); // URLを検出して青文字リンク（facets）化

    // 2. 「画像を押すとサイトに飛ぶ」外部リンクカード（embed.external）とセルフラベルを設定
    const postPayload = {
      text: rt.text,
      facets: rt.facets,
      embed: {
        $type: 'app.bsky.embed.external',
        external: {
          uri: SITE_URL,
          title: `【最新ASMR】${topItem.title}`,
          description: `サークル: ${topItem.maker} | 価格: ${topItem.price} - DLsiteおすすめASMR・同人音声まとめ`,
          thumb: thumbBlob
        }
      },
      labels: {
        $type: 'com.atproto.label.defs.selfLabels',
        values: [
          { val: 'sexual' }
        ]
      },
      createdAt: new Date().toISOString()
    };

    await agent.post(postPayload);

    console.log(`BlueskyへのASMR作品投稿完了: ${topItem.title}`);
  } catch (error) {
    console.error('Bluesky投稿エラー:', error);
  }
}

postToBluesky();