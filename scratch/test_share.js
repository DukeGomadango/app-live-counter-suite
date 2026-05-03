
import { generateShareUrl, parseTweetId } from './src/lib/share';

// Mock localStorage
global.localStorage = {
  getItem: (key) => null,
  setItem: (key, value) => {},
  removeItem: (key) => {},
};

const text = "Test Share";
const options = { toolId: "panel" };
const url = generateShareUrl(text, options);
console.log("Generated URL:", url);

const tweetUrl = "https://x.com/user/status/1234567890";
const tweetId = parseTweetId(tweetUrl);
console.log("Parsed Tweet ID:", tweetId);
