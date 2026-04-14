# MEISHI Flow - GASコード管理ガイド

> このREADMEは、非エンジニアがあとから見ても作業できるよう、全体の仕組みと手順をわかりやすくまとめたものです。

---

## 📌 全体の仕組みを理解する

このプロジェクトでは、3つの場所がつながっています。

```
【Google Apps Script（GAS）】
　スプレッドシートや Gmail と連携して
　実際に動くプログラムが置かれている場所
　　　　　↕ clasp push / clasp pull
【ローカルPC（Cursor / フォルダ）】
　自分のMacの中にある作業フォルダ
　/Users/yutakanma/Downloads/dev/dev_名刺Flow_WEB用/
　　　　　↕ git push / git pull
【GitHub（meishi-flow リポジトリ）】
　コードのバックアップ・履歴管理をする場所
　https://github.com/kanma-git/meishi-flow
```

### 3つの関係をひと言で

| 場所 | 役割 |
|------|------|
| GAS | プログラムが実際に動く場所（スプレッドシートと直結） |
| ローカルPC | コードを書いたり編集する作業場所 |
| GitHub | コードの保存・履歴・バックアップ場所 |

> ⚠️ GASとGitHubは**直接つながっていません**。ローカルPCが必ず中継します。

---

## 📁 このフォルダの中身

```
dev_名刺Flow_WEB用/
├── コード.js          ← GASのメインプログラム（名刺スキャン処理など）
├── appsscript.json   ← GASプロジェクトの設定ファイル（基本触らない）
├── .clasp.json       ← GASとローカルをつなぐ設定（基本触らない）
├── .gitignore        ← GitHubに送らないファイルの設定
├── index.html        ← MEISHI Flow のWebアプリ画面
└── manifest.json     ← PWA（スマホアプリ風）設定
```

---

## 🛠 コードを修正するときの手順

### ステップ1：Claudeにコード修正を依頼する

Claude（このチャット）に「このGASコードをこう直して」と伝えます。
Claudeが修正済みのコードを返してくれます。

例：
> 「名刺スキャン後に送るメールの件名を変えたい。今は『名刺受け取りました』になっているけど『はじめまして！名刺ありがとうございます』に変えて」

---

### ステップ2：ローカルのファイルを書き換える

Claudeから受け取ったコードを、Cursor（またはテキストエディタ）で  
`/Users/yutakanma/Downloads/dev/dev_名刺Flow_WEB用/コード.js` を開いて上書き保存します。

---

### ステップ3：GASに反映する（clasp push）

ターミナルで以下を実行します。  
これでローカルの変更がスプレッドシートと連携しているGASに反映されます。

```bash
cd ~/Downloads/dev/dev_名刺Flow_WEB用
clasp push
```

> ✅ これが完了すると、スプレッドシートや Gmail 連携が実際に更新されます。

---

### ステップ4：GitHubにも保存する（git push）

```bash
git add .
git commit -m "fix: 変更内容のメモ（例：メール件名を変更）"
git push
```

> 💡 `git commit -m "..."` のメッセージは日本語でOKです。何を変えたか一言書いておくと後で見返しやすいです。

---

## ✅ 毎回の作業チェックリスト

```
□ Claudeにコード修正を依頼
□ コード.js を上書き保存
□ clasp push（GASに反映）
□ git add . && git commit -m "メモ" && git push（GitHubに保存）
```

---

## 🔧 初回セットアップ（済み）

以下は初回のみ実施済みです。2回目以降は不要です。

```bash
npm install -g @google/clasp   # claspのインストール
clasp login                    # Googleアカウント認証
clasp clone <スクリプトID>      # GASプロジェクトをローカルに取得
git init                       # Gitの初期化
git remote add origin <URL>    # GitHubと接続
```

---

## ❓ よくあるトラブル

### `cd: no such file or directory`
→ フォルダのパスが違います。以下で移動してください。
```bash
cd ~/Downloads/dev/dev_名刺Flow_WEB用
```

### `clasp push` してもGASが変わらない
→ GASエディタをブラウザでリロードしてみてください。

### GitHubにpushできない
→ まず `git pull origin main` を実行してから再度 `git push` してください。

---

## 📎 関連リンク

- GASプロジェクト: https://script.google.com/d/1y8i_GG6Z11aKlkOc_wE3if0J4yUJfcpf16ZS56SUs9ay4zs7Sg0_Tcpn/edit
- GitHubリポジトリ: https://github.com/kanma-git/meishi-flow
