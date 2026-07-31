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

  const agent = new BskyAgent({ service: 'https://bsky.social' });

  try {
    await agent.login({ identifier: HANDLE, password: PASSWORD });
    console.log('Blueskyログイン成功');

    const siteUrl = 'https://dlsite-auto-site.pages.dev';
    const text = `【DLsite最新おすすめ】\n人気の新作・同人音声まとめを更新しました！\n\n最新作品をチェック👇\n${siteUrl}`;

    await agent.post({
      text: text,
      createdAt: new Date().toISOString()
    });

    console.log('Blueskyへの自動投稿が完了しました！');
  } catch (error) {
    console.error('Bluesky投稿エラー:', error);
  }
}

postToBluesky();