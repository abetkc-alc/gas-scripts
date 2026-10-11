# gas-scripts

Google Apps Script (GAS) のスクリプト置き場。

- リモート: https://github.com/abetkc-alc/gas-scripts

## 作業記録

### 2026-10-12
- `gas-scripts` フォルダを作成
- `git init`（ブランチ: `main`）し、リモート `origin` を https://github.com/abetkc-alc/gas-scripts.git に設定
- この README.md を作成して初回コミット・プッシュ

### 2026-10-12（2）
- `summary_dashboard.gs` を追加
  - `runDashboard`：「売上データ」シート（A:日付 / B:担当者名 / C:商品名 / D:金額）を月ごとに集計し、「月次サマリー」シート（A:月 / B:合計売上 / C:件数）をクリアして書き直す。月次推移の縦棒グラフを作り直す
  - `setDailyTrigger`：`runDashboard` を毎朝9時台に実行するトリガーを登録（既存のトリガーは削除してから登録するので重複しない）
  - 補足：1行目は見出しとして扱う。日付・金額が不正な行は飛ばす。「2026年1月」が日付に変換されないようA列はテキスト形式にする

## スクリプト一覧
| ファイル | 内容 |
|---|---|
| `summary_dashboard.gs` | 売上データの月次集計＋棒グラフ＋毎朝9時の自動実行 |

### summary_dashboard.gs の使い方
1. 対象のスプレッドシートで「拡張機能 > Apps Script」を開き、コードを貼り付ける
2. `runDashboard` を一度手動で実行し、権限を承認する
3. `setDailyTrigger` を一度実行する（以後は毎朝9〜10時の間に自動実行される）

## 運用ルール
- 作業が終わったら、この README の「作業記録」に日付と内容を追記してから commit → `git push`
