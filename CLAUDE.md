# 詠唱メーカー (Eishou Maker)

Twitch配信向けの厨二病詠唱テキスト生成ツール。
視聴者がチャットで単語を投稿 → 配信者が選んでAI詠唱を生成 → OBSオーバーレイに表示。

## デプロイ

- **本番**: https://eishou-maker.vercel.app
- **リポジトリ**: https://github.com/aahsa20-star/eishou-maker.git
- **ホスティング**: Vercel（GitHub mainブランチへのpushで自動デプロイ）
- **API**: Anthropic Claude API（claude-sonnet-4-20250514）

## ファイル構成

```
index.html      - コントロールパネル（配信者が操作する画面）
overlay.html    - OBSブラウザソース用オーバーレイ（1920x1080）
api/chant.js    - Vercel Serverless Function（Claude API呼び出し）
vercel.json     - Vercel設定（メモリ128MB、タイムアウト15秒）
```

## 技術スタック

- **フロントエンド**: バニラHTML/CSS/JS（フレームワークなし）
- **フォント**: Zen Kaku Gothic New（UI）、Yuji Syuku（詠唱テキスト）
- **API**: Anthropic Claude API（Vercel Serverless経由）
- **Twitch連携**: IRC WebSocket（justinfan匿名接続）
- **音声**: Web Audio API（SoundEngineクラスでオシレーター合成）
- **読み上げ**: Web Speech API（SpeechSynthesisUtterance）
- **ページ間通信**: localStorage + storageイベント

## 主要機能

### index.html（コントロールパネル）
- Twitch IRC接続（`!word 単語`でリスナーから単語収集）
- 手動単語追加
- 単語カード表示（投票数、ホットカード、個別削除、全削除）
- ドラッグ&ドロップで単語並び替え
- 詠唱タイプ選択（召喚/解放/封印/滅亡/覚醒）
- AI詠唱生成 → プレビュー → コピー
- 詠唱履歴（最新5件、コピー/再表示/削除）
- 読み上げON/OFF、参加説明ON/OFF
- 効果音ON/OFF + ボリュームスライダー
- レート制限表示（5回/時間）

### overlay.html（OBSオーバーレイ）
- 詠唱ウィンドウ（筆走りclip-pathアニメーション）
- タイプラベルズーム演出
- 各行の筆走り出現 + 光のトレイル
- 履歴サイドバー（最新5件）
- 参加ガイド表示（トグル可能）
- 効果音（localStorage経由でindex.htmlと同期）

### api/chant.js（サーバーサイド）
- IPベースのレート制限（5回/時間）
- タイプ別システムプロンプト（トーン指定）
- 単語サニタイズ（20文字制限、最大20個）

## 効果音（Web Audio API）

外部ファイルなし、全てオシレーター合成。

### index.html側
| トリガー | 音 |
|---|---|
| `!word`受信 | 高音きらめき（ランダムピッチ） |
| 単語選択 | 共鳴音（3オシレーター） |
| 単語削除 | 下降トーン |
| 詠唱生成 | 低音ドローン上昇（タイプ別音程） |
| コピー | 確認音（2トーン） |

### overlay.html側
| トリガー | 音 |
|---|---|
| ウィンドウ出現 | 低音ドローン上昇 |
| 行テキスト出現 | 段階チャイム（ピッチ上昇） |
| 全行表示完了 | 衝撃波ブーム |
| フェードアウト | 溶解音 |

BGMは未実装。

## デザイン経緯

1. **初期実装** - 基本機能
2. **RPG風** - FF/DQメッセージウィンドウ風
3. **SAO風** - ホログラム＋幾何学的UI
4. **フリーレン風** - 現在のデザインベース。落ち着いた色合い
5. **AI感除去** - 黄色を落ち着かせ、絵文字ボタン排除、フォント統一
6. **フォント整理** - Cormorant Garamond削除、2フォント体制（Zen Kaku + Yuji Syuku）
7. **カラー改修** - teal/purple追加、タイプ別カラー
8. **配信映え強化** - フォント拡大、輪郭強化、発光エフェクト、コントラスト改善

## カラーパレット

```css
--fg-base:     #E8DFC8   /* メインテキスト */
--fg-dim:      #A09070   /* サブテキスト */
--gold:        #A07830   /* 召喚系アクセント */
--gold-bright: #C8A050   /* ハイライト金 */
--teal:        #5A8A80   /* 解放系アクセント */
--bg-base:     #0E0C09   /* 背景 */
--bg-panel:    #13110D   /* パネル背景 */
/* 封印: #6A5A8A  滅亡: #7A3030  覚醒: #5A7A5A */
```

## 開発メモ

- Vercelツールバーは`vercel.json`設定では消せない → CSSで`display:none`
- `vercel.json`の`toolbar`プロパティはスキーマエラーになる
- overlay↔index間の通信はlocalStorage + storageイベントのみ
- レート制限はサーバー側（api/chant.js）とクライアント側（index.html）の両方で管理
- OBSブラウザソースではAudioContext自動再生制限なし
