# Gemini Live API リアルタイム文字起こし（Web）

Gemini **Live API (WebSocket)** を使って、ブラウザのマイク入力を **リアルタイム文字起こし**します。

## 構成
- `client/` : Vite (Vanilla JS) フロント。マイク→PCM16(16kHz mono)化してWebSocket送信。結果を表示。
- `server/` : Node.js WebSocket中継（ブラウザ ⇄ Gemini Live API）。APIキーはサーバに置く。

## 事前準備
- Node.js **18+**
- Gemini API Key

`server/.env` を作成:
```env
GEMINI_API_KEY=YOUR_KEY_HERE
# 任意: Live対応モデル名を変える場合
GEMINI_LIVE_MODEL=gemini-live-2.5-flash-preview
```

## 起動
```bash
npm i
npm run dev
# http://127.0.0.1:5173
```

## 使い方
- **Start**: マイクを取り込み開始（Geminiへ送信）
- **Stop**: 停止
- **Mock**（E2E用）: URL末尾に `?mock=1` を付けると、WebSocket/マイク無しで擬似文字起こしが動きます。

## テスト
### ユニットテスト（Vitest）
```bash
npm test
```

### E2E（Playwright）
初回のみ:
```bash
npx playwright install --with-deps
```
実行:
```bash
npm run test:e2e
```

## 注意
- 音声は **PCM16 little-endian / 16kHz / mono** を想定しています（環境により内部で変換されます）。
- 本番では再接続・レート制御・同意/保存方針などを追加してください。
