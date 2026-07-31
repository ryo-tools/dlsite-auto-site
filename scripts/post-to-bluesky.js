import { BskyAgent } from '@atproto/api';
import fs from 'fs';
import path from 'path';

async function postToBluesky() {
  const handle = process.env.BLUESKY_HANDLE; // 例: user.bsky.social
  const password = process.env.BLUESKY_PASSWORD; // アプリパスワード

  if (!handle || !password) {
    console.log('Bluesky credentials missing. Skipping SNS auto-post.');
    return;
  }

  const publicDir = path.join(process.cwd(), 'public');
  const indexPath = path.join(publicDir, 'index.html');

  if (!fs.existsSync(indexPath)) {
    console.log('No generated HTML found. Skipping post.');
    return;
  }

  const agent = new BskyAgent({ service: 'https://bsky.social' });

  try {
    await agent.login({ identifier: handle, password });
    console.log('Successfully logged in to Bluesky!');

    const postText = `【本日のおすすめ同人音声・ASMR作品】\n\nDLsiteの最新おすすめ・人気作品が自動更新されました！\n\n▼最新作品の試聴・詳細はこちらから\nhttps://dlsite-auto-site.pages.dev/asmr/\n\n#ASMR #同人音声 #DLsite #自動更新まとめ`;

    await agent.post({
      text: postText,
      createdAt: new Date().toISOString(),
    });

    console.log('Successfully posted update to Bluesky!');
  } catch (error) {
    console.error('Failed to post to Bluesky:', error.message);
  }
}

postToBluesky();