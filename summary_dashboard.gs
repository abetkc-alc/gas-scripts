/**
 * 売上データ 月次サマリー＆ダッシュボード
 *
 * 「売上データ」シートを月ごとに集計し、「月次サマリー」シートに書き出して
 * 月次推移の棒グラフを作成する。
 *
 * 使い方：
 *   1. スプレッドシートの「拡張機能 > Apps Script」にこのファイルを貼り付ける
 *   2. runDashboard を一度手動で実行し、権限を承認する
 *   3. setDailyTrigger を一度実行すると、毎朝9時台に runDashboard が自動実行される
 */

// シート名などの設定
const SOURCE_SHEET_NAME = '売上データ';
const SUMMARY_SHEET_NAME = '月次サマリー';
const HEADER_ROWS = 1; // 「売上データ」シートの見出し行数
const CHART_TITLE = '月次売上推移';

/**
 * メイン処理：売上データを月ごとに集計し、サマリーとグラフを書き直す
 */
function runDashboard() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sourceSheet = ss.getSheetByName(SOURCE_SHEET_NAME);
  if (!sourceSheet) {
    throw new Error('「' + SOURCE_SHEET_NAME + '」シートが見つかりません。');
  }

  // 出力先シートがなければ作成する
  let summarySheet = ss.getSheetByName(SUMMARY_SHEET_NAME);
  if (!summarySheet) {
    summarySheet = ss.insertSheet(SUMMARY_SHEET_NAME);
  }

  // 売上データを読み込んで月ごとに集計する
  const monthly = aggregateByMonth_(sourceSheet, ss.getSpreadsheetTimeZone());

  // サマリーシートを書き直す
  writeSummary_(summarySheet, monthly);

  // 棒グラフを作り直す
  rebuildChart_(summarySheet, monthly.length);
}

/**
 * 「売上データ」シートの全行を読み込み、月ごとの合計売上と件数を返す
 * 戻り値：[{ key: '2026-01', label: '2026年1月', total: 数値, count: 数値 }, ...]（月の昇順）
 */
function aggregateByMonth_(sheet, timeZone) {
  const lastRow = sheet.getLastRow();
  if (lastRow <= HEADER_ROWS) {
    return [];
  }

  // A〜D列（日付・担当者名・商品名・金額）を一括で取得する
  const values = sheet
    .getRange(HEADER_ROWS + 1, 1, lastRow - HEADER_ROWS, 4)
    .getValues();

  const map = {};
  values.forEach(function (row) {
    const date = toDate_(row[0]);
    const amount = Number(row[3]);

    // 日付が不正な行・金額が数値でない行はスキップする
    if (!date || row[3] === '' || isNaN(amount)) {
      return;
    }

    const year = Number(Utilities.formatDate(date, timeZone, 'yyyy'));
    const month = Number(Utilities.formatDate(date, timeZone, 'M'));
    const key = year + '-' + ('0' + month).slice(-2); // 並べ替え用のキー

    if (!map[key]) {
      map[key] = { key: key, label: year + '年' + month + '月', total: 0, count: 0 };
    }
    map[key].total += amount;
    map[key].count += 1;
  });

  // 月の古い順に並べる
  return Object.keys(map)
    .sort()
    .map(function (key) {
      return map[key];
    });
}

/**
 * セルの値を Date に変換する（Date型・文字列「2026/01/05」の両方に対応）
 * 変換できない場合は null を返す
 */
function toDate_(value) {
  if (value instanceof Date) {
    return isNaN(value.getTime()) ? null : value;
  }
  if (typeof value === 'string' && value.trim() !== '') {
    const m = value.trim().match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})/);
    if (m) {
      return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
    }
  }
  return null;
}

/**
 * 「月次サマリー」シートをクリアしてから集計結果を書き込む
 */
function writeSummary_(sheet, monthly) {
  // 値・書式を毎回すべてクリアする
  sheet.clear();

  const rows = [['月', '合計売上', '件数']];
  monthly.forEach(function (m) {
    rows.push([m.label, m.total, m.count]);
  });

  // 「2026年1月」が日付に自動変換されないよう、A列を書式なしテキストにする
  sheet.getRange(1, 1, rows.length, 1).setNumberFormat('@');
  sheet.getRange(1, 1, rows.length, 3).setValues(rows);

  // 見た目を整える
  sheet.getRange(1, 1, 1, 3).setFontWeight('bold').setBackground('#f1f3f4');
  if (monthly.length > 0) {
    sheet.getRange(2, 2, monthly.length, 1).setNumberFormat('#,##0');
    sheet.getRange(2, 3, monthly.length, 1).setNumberFormat('0');
  }
  sheet.setFrozenRows(1);
  sheet.autoResizeColumns(1, 3);
}

/**
 * 既存のグラフを削除し、月次推移の棒グラフを新しく作成する
 */
function rebuildChart_(sheet, dataRowCount) {
  // 前回作成したグラフを削除する（実行のたびに増えないようにするため）
  sheet.getCharts().forEach(function (chart) {
    sheet.removeChart(chart);
  });

  if (dataRowCount === 0) {
    return; // データがなければグラフは作らない
  }

  // A列（月）とB列（合計売上）を見出し行ごと範囲に指定する
  const range = sheet.getRange(1, 1, dataRowCount + 1, 2);

  const chart = sheet
    .newChart()
    .setChartType(Charts.ChartType.COLUMN) // 縦棒グラフ
    .addRange(range)
    .setNumHeaders(1)
    .setPosition(1, 5, 0, 0) // E1セルの位置に配置
    .setOption('title', CHART_TITLE)
    .setOption('legend', { position: 'none' })
    .setOption('hAxis', { title: '月' })
    .setOption('vAxis', { title: '合計売上（円）', format: '#,##0' })
    .setOption('width', 600)
    .setOption('height', 360)
    .build();

  sheet.insertChart(chart);
}

/**
 * runDashboard を毎朝9時（9:00〜10:00の間）に自動実行するトリガーを登録する
 * ※ 何度実行しても重複しないよう、既存の runDashboard トリガーは削除してから登録する
 */
function setDailyTrigger() {
  ScriptApp.getProjectTriggers().forEach(function (trigger) {
    if (trigger.getHandlerFunction() === 'runDashboard') {
      ScriptApp.deleteTrigger(trigger);
    }
  });

  ScriptApp.newTrigger('runDashboard')
    .timeBased()
    .everyDays(1)
    .atHour(9)
    .create();
}
