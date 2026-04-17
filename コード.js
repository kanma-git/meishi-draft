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
    const SPREADSHEET_ID = "ここにスプレッドシートのIDを貼り付ける";
    const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getActiveSheet();
    sheet.appendRow([
      new Date(), myName, data.companyName, data.industry,
      data.contactName, data.title, data.email, data.phone, data.address
    ]);

    step = "⑤メール下書き作成";
    const subject = `名刺交換させていただいたお礼`;
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

${myName}`;

    if (data.email) {
      GmailApp.createDraft(data.email, subject, body);
    }

    return ContentService.createTextOutput("Success!");

  } catch(error) {
    var msg = "【" + step + "】で失敗しました。原因: " + error.message;
    Logger.log(msg);
    return ContentService.createTextOutput("Error: " + msg);
  }
}
