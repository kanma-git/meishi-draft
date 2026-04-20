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
```javascript
/**
 * 名刺画像を Gemini で解析 → スプレッドシート追記 → Gmail下書き作成
 * Android / iPhone / PC いずれからも安定動作する版
 *
 * 修正点:
 *  1. Gemini 2.5 Flash の thinking を無効化(空レスポンス対策)
 *  2. レスポンス構造を段階的に検証
 *  3. responseSchema でJSON出力を強制
 *  4. MIME タイプを実バイトから自動判定(Android WebP / iPhone HEIC 対応)
 *  5. 429/5xx 向けリトライ機構
 *  6. 呼び出し元に JSON で成否を返す
 *  7. step による失敗箇所の特定ログ
 */
function doPost(e) {
  var step = "①データ受信";
  const startedAt = new Date();
  try {
    // ---- 入力パース -------------------------------------------------
    if (!e || !e.postData || !e.postData.contents) {
      throw new Error("リクエストボディが空です(エディタから直接実行していませんか?)");
    }
    const params = JSON.parse(e.postData.contents);
    const imageBase64 = params.image;
    const myName = params.myName || "傳田";
    if (!imageBase64) throw new Error("image(base64)が未指定です");

    // ---- MIME 自動判定(全端末対応) ---------------------------------
    step = "②MIMEタイプ判定";
    const mimeType = (params.mimeType && params.mimeType.startsWith("image/"))
      ? params.mimeType
      : detectImageMimeType(imageBase64);
    Logger.log("Detected MIME: " + mimeType);

    const supported = ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"];
    if (supported.indexOf(mimeType) === -1) {
      throw new Error("未対応の画像形式: " + mimeType + " (JPEG/PNG/WebP推奨)");
    }

    // ---- Gemini API 呼び出し(名刺解析) ------------------------------
    step = "③Gemini API呼び出し(名刺解析)";
    const data = extractBusinessCard(imageBase64, mimeType);

    // ---- スプレッドシート書き込み -----------------------------------
    step = "④スプレッドシート書き込み";
    const SPREADSHEET_ID = "ここにスプレッドシートのIDを貼り付ける"; // ← 変更する
    const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getActiveSheet();
    sheet.appendRow([
      startedAt, myName,
      data.companyName || "", data.industry || "",
      data.contactName || "", data.title || "",
      data.email || "", data.phone || "", data.address || ""
    ]);

    // ---- Gmail 下書き作成 -------------------------------------------
    step = "⑤メール下書き作成";
    var draftStatus = "skipped (email empty)";
    if (data.email) {
      const subject = `■名刺交換の御礼■ AI企業 ㈱Aitane:傳田`;
      const body = `${data.companyName}
${data.contactName}様

株式会社Aitane(アイタネ)の傳田(デンダ)でございます。
お名刺交換をありがとうございます。

本日のお話を踏まえ、一度情報交換の機会を頂けましたら幸いです。
お手数ですが、下記日程リンクよりご都合の良い日時をご選択ください。

▼日程調整リンク(カレンダーから空き枠を選ぶだけで完了します)
https://calendar.app.google/K4yApH9WKKUTme3q9

よろしくお願いいたします。`;

      try {
        GmailApp.createDraft(data.email, subject, body);
        draftStatus = "created";
      } catch (draftErr) {
        Logger.log("Draft error: " + draftErr);
        draftStatus = "failed: " + draftErr.toString();
      }
    }

    // ---- 正常終了レスポンス -----------------------------------------
    return jsonResponse({
      status: "success",
      mimeTypeUsed: mimeType,
      draft: draftStatus,
      extracted: data
    });

  } catch (error) {
    var msg = "【" + step + "】で失敗しました。原因: " + error.message;
    Logger.log(msg + "\n" + (error.stack || ""));
    return jsonResponse({
      status: "error",
      step: step,
      message: error.message
    });
  }
}

/* ================================================================
 *  Gemini 呼び出し(名刺情報抽出)
 * ================================================================ */
function extractBusinessCard(imageBase64, mimeType) {
  const apiKey = PropertiesService.getScriptProperties().getProperty("GEMINI_API_KEY");
  if (!apiKey) throw new Error("スクリプトプロパティに GEMINI_API_KEY が設定されていません");

  const url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=" + apiKey;

  const prompt = `添付された名刺画像から以下の情報を抽出してください。
抽出できない項目は空文字("")にしてください。推測は industry のみ可とします。
- companyName: 社名
- industry: 業種(推測OK)
- contactName: 担当者名(氏名)
- title: 役職
- email: メールアドレス
- phone: 電話番号(本人の番号があれば優先)
- address: 住所`;

  const payload = {
    contents: [{
      parts: [
        { text: prompt },
        { inlineData: { mimeType: mimeType, data: imageBase64 } }
      ]
    }],
    generationConfig: {
      responseMimeType: "application/json",
      maxOutputTokens: 2048,
      temperature: 0.1,
      // Gemini 2.5 Flash の思考機能を無効化(空レスポンス対策)
      thinkingConfig: { thinkingBudget: 0 },
      // 出力スキーマを厳密に指定
      responseSchema: {
        type: "OBJECT",
        properties: {
          companyName: { type: "STRING" },
          industry:    { type: "STRING" },
          contactName: { type: "STRING" },
          title:       { type: "STRING" },
          email:       { type: "STRING" },
          phone:       { type: "STRING" },
          address:     { type: "STRING" }
        },
        required: ["companyName","industry","contactName","title","email","phone","address"]
      }
    }
  };

  const options = {
    method: "post",
    contentType: "application/json",
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  };

  // リトライ(最大3回, 指数バックオフ)。429/5xx のみリトライ
  var response, lastError = "";
  for (var i = 0; i < 3; i++) {
    response = UrlFetchApp.fetch(url, options);
    var code = response.getResponseCode();
    if (code === 200) break;
    lastError = "HTTP " + code + ": " + response.getContentText().slice(0, 500);
    Logger.log("Retry " + (i + 1) + " - " + lastError);
    if (code !== 429 && code < 500) break; // 4xxはリトライ不要
    Utilities.sleep(1000 * (i + 1));
  }
  if (response.getResponseCode() !== 200) {
    throw new Error("Gemini API失敗: " + lastError);
  }

  // レスポンス検証(段階的に)
  const raw = response.getContentText();
  var parsed;
  try {
    parsed = JSON.parse(raw);
  } catch (parseErr) {
    throw new Error("API応答のJSONパース失敗: " + raw.slice(0, 300));
  }

  if (parsed.promptFeedback && parsed.promptFeedback.blockReason) {
    throw new Error("プロンプトがブロックされました: " + parsed.promptFeedback.blockReason);
  }
  if (!parsed.candidates || parsed.candidates.length === 0) {
    throw new Error("候補(candidates)が空です。Full: " + raw.slice(0, 500));
  }

  var candidate = parsed.candidates[0];
  var finishReason = candidate.finishReason;
  if (finishReason && finishReason !== "STOP") {
    throw new Error("Gemini異常終了: finishReason=" + finishReason);
  }

  var text = candidate.content && candidate.content.parts
          && candidate.content.parts[0] && candidate.content.parts[0].text;
  if (!text) {
    throw new Error("text パートが空です。Full: " + raw.slice(0, 500));
  }

  var data;
  try {
    data = JSON.parse(text);
  } catch (err) {
    throw new Error("抽出JSONのパース失敗: " + text.slice(0, 300));
  }
  return data;
}

/* ================================================================
 *  画像 MIME タイプ自動判定(マジックバイト方式)
 *  iPhone(HEIC) / Galaxy(WebP) / PC(JPEG/PNG) 全対応
 * ================================================================ */
function detectImageMimeType(base64) {
  const head = Utilities.base64Decode(base64.substring(0, 64));
  const b = head.map(function (v) { return v & 0xFF; });

  // JPEG: FF D8 FF
  if (b[0] === 0xFF && b[1] === 0xD8 && b[2] === 0xFF) return "image/jpeg";
  // PNG: 89 50 4E 47
  if (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4E && b[3] === 0x47) return "image/png";
  // WebP: "RIFF"...."WEBP"
  if (b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 &&
      b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50) return "image/webp";
  // HEIC/HEIF: ...."ftyp" + brand
  if (b[4] === 0x66 && b[5] === 0x74 && b[6] === 0x79 && b[7] === 0x70) {
    var brand = String.fromCharCode(b[8], b[9], b[10], b[11]);
    if (["heic","heix","hevc","hevx","mif1","msf1"].indexOf(brand) !== -1) return "image/heic";
    if (brand === "avif") return "image/avif";
  }
  // GIF: "GIF8"
  if (b[0] === 0x47 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x38) return "image/gif";

  Logger.log("MIME判定不能, JPEGにフォールバック. Head: " +
             b.slice(0, 12).map(function (v) { return v.toString(16); }).join(" "));
  return "image/jpeg";
}

/* ================================================================
 *  ContentService で JSON を返すヘルパ
 * ================================================================ */
function jsonResponse(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
```
