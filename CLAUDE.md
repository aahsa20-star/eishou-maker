# 詠唱メーカー (Eishou Maker) v5

Twitch配信向けの厨二病詠唱テキスト生成Webツール。
視聴者がチャットで単語を投稿 → 配信者が選んでAI詠唱を生成。
1ページ完結設計。OBSなしでもChromeだけで動く。

## デプロイ

- **本番**: https://eishou-maker.vercel.app
- **リポジトリ**: https://github.com/aahsa20-star/eishou-maker.git
- **ホスティング**: Vercel（GitHub mainブランチへのpushで自動デプロイ）

## ファイル構成

```
index.html              # メイン（1ページ完結・3カラム儀式祭壇型）
privacy.html            # プライバシーポリシー
terms.html              # 利用規約
api/
  chant.js              # 詠唱生成API（Anthropic + Upstash Redis）
  image.js              # 画像生成API（Claude→DALL-E 3 + Upstash Redis）
  auth/
    callback.js         # Twitch OAuthコールバック・JWT発行
    refresh.js          # サブスク状態再検証・JWT更新
    verify.js           # JWT検証
    logout.js           # ログアウト
public/
  bgm/
    Moonlight_on_Vellum.mp3  # Gemini生成BGM
vercel.json             # Vercel設定
package.json            # jsonwebtoken・cookie
```

## 技術スタック

- **フロントエンド**: バニラHTML/CSS/JS（フレームワークなし）
- **フォント**: Zen Kaku Gothic New（UI）、Yuji Syuku（詠唱テキスト）
- **API**: Anthropic Claude API（claude-sonnet-4-20250514）、OpenAI DALL-E 3
- **レートリミット**: Upstash Redis REST API（永続化・多重インスタンス対応）
- **認証**: Twitch OAuth → JWT（7日有効期限）→ HttpOnly Cookie
- **Twitch連携**: IRC WebSocket（justinfan匿名接続）
- **音声**: Web Audio API（オシレーター合成）+ Web Speech API（読み上げ）

## レイアウト（3カラム儀式祭壇型）

| カラム | 内容 |
|--------|------|
| 左：供物の間 | 集いし言霊・言霊を刻む・儀式のテーマ（折りたたみ）・古の教え |
| 中央：儀式祭壇 | タイプ選択・選ばれし言霊・魔法陣canvas・詠唱生成ボタン・生成結果 |
| 右：記録の間 | 詠唱の記録・封印された詠唱 |

## 詠唱タイプ

| タイプ | カラー | トーン |
|--------|--------|--------|
| 召喚 | #C8A050 | 強大な存在を呼び出す荘厳さ |
| 解放 | #5A8A80 | 封じられた力の爆発的開放感 |
| 封印 | #6A5A8A | 重厚な静寂、呪いのような厳かさ |
| 滅亡 | #7A3030 | 絶望と諦観、壮大な終末感 |
| 覚醒 | #5A7A5A | 静かな始まりから高まる覚醒感 |
| 自己紹介 | #B48CC8 | プロフィールから厨二調自己紹介文を生成 |

## 属性（12種類）

| 属性 | カラー | 主な用途 |
|------|--------|---------|
| 闇 | #6A3A8A | 暗黒・邪悪 |
| 光 | #C8A050 | 神聖・希望 |
| 炎 | #C84B4B | 情熱・破壊 |
| 氷 | #4B8AC8 | 冷静・封印 |
| 雷 | #C8C04B | 速度・覚醒 |
| 風 | #4BC8A0 | 自由・記憶 |
| 土 | #8A6A3A | 束縛・大地 |
| 混沌 | #8A3A6A | 混乱・変化 |
| 神聖 | #C8B87A | 祈り・加護 |
| 血 | #8A1A1A | 肉体・戦い |
| 夢 | #6A5A9A | 幻想・過去 |
| 虚無 | #5A5A7A | 消滅・空虚 |

## レア度分布（配信映え重視）

| レア度 | 確率 | 条件 |
|--------|------|------|
| コモン | 10% | 単語1〜2個の短い詠唱のみ |
| アンコモン | 25% | - |
| レア | 35% | - |
| スーパーレア | 20% | - |
| レジェンド | 10% | 特に独創的・印象的な詠唱 |

## 環境変数（Vercel）

| キー | 用途 |
|-----|------|
| ANTHROPIC_API_KEY | 詠唱生成・画像プロンプト変換 |
| OPENAI_API_KEY | DALL-E 3画像生成 |
| TWITCH_CLIENT_ID | Twitch OAuth |
| TWITCH_CLIENT_SECRET | Twitch OAuth |
| TWITCH_BROADCASTER_ID | 856788846（datsusara_aki） |
| JWT_SECRET | 認証トークン署名 |
| KV_REST_API_URL | Upstash Redis接続URL |
| KV_REST_API_TOKEN | Upstash Redis認証トークン |

## 利用制限

| ユーザー種別 | 詠唱生成 | 画像生成 |
|------------|---------|---------|
| 未ログイン・一般 | 2回/日 | 利用不可 |
| サブスクライバー | 20回/時 | 5回/日 |

## Twitchコマンド

| コマンド | 動作 |
|---------|------|
| `!word 単語` | 単語カードを追加 |
| `!vote 番号` | 該当番号の単語に投票（1人1票制） |
| `!odai テキスト` | お題候補を提案（募集ON時のみ） |

## セキュリティ

- **CORS**: eishou-maker.vercel.appのみ許可
- **OAuth state**: UUID v4形式チェックによるCSRF対策
- **XSS対策**: ユーザー入力を全箇所でesc()エスケープ
- **JWT**: 7日有効期限、HttpOnly/Secure/SameSite=Lax Cookie
- **サブスク再検証**: ページ読込時にTwitch APIで毎回確認
- **レートリミット永続化**: Upstash Redis（再起動・多重インスタンスでも機能）

## カラーパレット

```css
--fg-base:     #E8DFC8   /* メインテキスト */
--fg-dim:      #A09070   /* サブテキスト */
--gold:        #A07830   /* 召喚系アクセント */
--gold-bright: #C8A050   /* ハイライト金 */
--teal:        #5A8A80   /* 解放系アクセント */
--bg-base:     #0E0C09   /* 背景 */
--bg-panel:    #13110D   /* パネル背景 */
/* 封印: #6A5A8A  滅亡: #7A3030  覚醒: #5A7A5A  自己紹介: #B48CC8 */
```

## 開発メモ

- Vercelツールバーは`vercel.json`設定では消せない → CSSで`display:none`
- レート制限はサーバー側（Upstash Redis）とクライアント側（index.html）の両方で管理
- overlay.htmlは廃止・削除済み（index.htmlに統合）
- 魔法陣canvasはResizeObserverでサイズ追従、requestAnimationFrameで常時回転
- 自己紹介タイプ選択時は左カラム非表示、プロフィールフォーム表示に切替

## 将来のタスク（P3）

- コード分割（CSS/JSの外部ファイル化）
- セッションまとめ機能（配信後の共有資産）
- マルチテナント化（他配信者への展開）
- Twitch EventSub移行
