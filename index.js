import express from "express";
import dotenv from "dotenv";
import { BskyAgent } from "@atproto/api";

dotenv.config();

const app = express();

const agent = new BskyAgent({
  service: "https://bsky.social",
});

// ログイン（起動時1回）
await agent.login({
  identifier: process.env.BSKY_ID,
  password: process.env.BSKY_APP_PASSWORD,
});

// ===== キャッシュ =====
const CACHE_TTL = 5 * 60 * 1000; // 5分
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
        "id": "#bsky-feed",
        "type": "BskyFeedGenerator",
        "serviceEndpoint": "https://hatinohe-eed-oywe667-6syvp0ml.leapcell.dev",
        "description": "#八戸 フィード"
      }
    ]
  });
});



app.get("/xrpc/app.bsky.feed.getFeedSkeleton", async (req, res) => {
  try {
    // キャッシュ有効なら即返す
    if (Date.now() - cache.time < CACHE_TTL) {
      return res.json({ feed: cache.feed });
    }

    const { data } = await agent.app.bsky.feed.searchPosts({
      q: "#八戸",
      limit: 30,
    });

    const feed = data.posts.map((post) => ({
      post: post.uri,
    }));

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
