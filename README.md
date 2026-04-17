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


## 📌 コピペ用
→ `SPREADSHEET_ID` にスプレッドシートのIDを貼り付ける
→ スクリプトプロパティで `GEMINI_API_KEY` を設定する
→ メールの件名・本文・日程調整リンクを必要に応じて修正する

以下のコードを全てコピペ

```javascript
function doPost(e) {
  var step = "①データ受信";
  try {
    const params = JSON.parse(e.postData.contents);
    const imageBase64 = params.image;
    const myName = params.myName || "菅間";

    step = "②Gemini API呼び出し（名刺解析）";
    const apiKey = PropertiesService.getScriptProperties().getProperty("GEMINI_API_KEY");
    if (!apiKey) throw new Error("スクリプトプロパティに GEMINI_API_KEY が設定されていません");

    const url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=" + apiKey;

    const prompt = `
    添付された名刺画像から以下の情報を抽出し、JSON形式でのみ回答してください。
    JSONのキーは必ず以下にしてください:
    companyName (社名), industry (業種・推測でOK), contactName (担当者名), title (役職), email (メールアドレス), phone (電話番号), address (住所)
    抽出できない項目は空文字("")にしてください。
    `;

    const payload = {
      "contents": [{
        "parts": [
          {"text": prompt},
          {"inlineData": {"mimeType": "image/jpeg", "data": imageBase64}}
        ]
      }],
      "generationConfig": {"responseMimeType": "application/json"}
    };

    const options = {
      "method": "post",
      "contentType": "application/json",
      "payload": JSON.stringify(payload)
    };

    const response = UrlFetchApp.fetch(url, options);

    step = "③Geminiレスポンス解析";
    const responseBody = JSON.parse(response.getContentText());
    if (!responseBody.candidates || !responseBody.candidates[0]) {
      throw new Error("Geminiから有効な回答が返りませんでした");
    }
    const jsonStr = responseBody.candidates[0].content.parts[0].text;
    const data = JSON.parse(jsonStr);

    step = "④スプレッドシート書き込み";
    const SPREADSHEET_ID = "ここにスプレッドシートのIDを貼り付ける"; // ← 変更する
    const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getActiveSheet();
    sheet.appendRow([
      new Date(), myName, data.companyName, data.industry,
      data.contactName, data.title, data.email, data.phone, data.address
    ]);

    step = "⑤メール下書き作成";
    const subject = `名刺交換させていただいたお礼`; // ← 件名を変更する場合はここ
    const body = `${data.companyName}
${data.contactName} 様

株式会社Aitane（アイタネ）の${myName}です。
名刺交換をさせていただきありがとうございます！

弊社では、議事録作成からCRM入力までをAIで完全自動化し、営業の売上を最大化する『Aitane』というシステムを提供しております。
https://aitane.co.jp/service#crm

もしよろしければ、下記より次回の情報交換の場を押さえさせていただけますと幸いです。
▼日程調整リンク（カレンダーから空き枠を選ぶだけで完了します）
https://calendar.app.google/273KmJXyh4TmJ5paA

それでは、引き続きよろしくお願いいたします！

${myName}`; // ← 本文を変更する場合はここ

    if (data.email) {
      GmailApp.createDraft(data.email, subject, body); // 下書き作成（送信はしない）
    }

    return ContentService.createTextOutput("Success!");

  } catch(error) {
    var msg = "【" + step + "】で失敗しました。原因: " + error.message;
    Logger.log(msg);
    return ContentService.createTextOutput("Error: " + msg);
  }
}
```