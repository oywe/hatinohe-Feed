import express from "express";
import dotenv from "dotenv";
import { BskyAgent } from "@atproto/api";

dotenv.config();

const app = express();

const agent = new BskyAgent({
  service: "https://bsky.social",
});

// ユーザーリスト（handle または DID を入れる）
const USER_LIST = [
  "noh.f5.si"
];

await agent.login({
  identifier: process.env.BSKY_ID,
  password: process.env.BSKY_APP_PASSWORD,
});

// ===== キャッシュ =====
const CACHE_TTL = 5 * 60 *333;
let cache = {
  time: 0,
  feed: [],
};

app.get("/.well-known/did.json", (req, res) => {
  res.json({
    "@context": ["https://www.w3.org/ns/did/v1"],
    "id": "did:web:hatinohe-eed-oywe667-6syvp0ml.leapcell.dev",
    "service": [
      {
        "id": "#bsky_fg",
        "serviceEndpoint": "https://hatinohe-eed-oywe667-6syvp0ml.leapcell.dev",
        "type": "BskyFeedGenerator"
      }
    ]
  });
});

app.get("/xrpc/app.bsky.feed.getFeedSkeleton", async (req, res) => {
  try {
    // キャッシュ
    if (Date.now() - cache.time < CACHE_TTL) {
      return res.json({ feed: cache.feed });
    }

    const postSet = new Set();

    // ① #八戸 の投稿
    const tagResult = await agent.app.bsky.feed.searchPosts({
      q: "八戸",
      limit:100
    });

    tagResult.data.posts.forEach(p => postSet.add(p.uri));

    // ② ユーザーリストの投稿
    for (const actor of USER_LIST) {
      try {
        const userResult = await agent.app.bsky.feed.getAuthorFeed({
          actor,
          limit: 10
        });
        userResult.data.feed.forEach(item => postSet.add(item.post.uri));
      } catch (err) {
        console.warn(`Failed to fetch feed for ${actor}:`, err.message);
      }
    }

    const feed = Array.from(postSet).map(uri => ({ post: uri }));

    cache = {
      time: Date.now(),
      feed,
    };

    res.json({ feed });
  } catch (err) {
    console.error("Feed error:", err);
    res.status(500).json({ feed: [] });
  }
});

app.listen(process.env.PORT || 3000, () => {
  console.log("Hachinohe feed running");
});

