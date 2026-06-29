// @ts-check
const { test, expect } = require("@playwright/test");
const fs = require("fs");
const path = require("path");

const LEGACY_SRC = path.join(__dirname, "..", "ecpr_commander_v5.1_legacy.txt");
const LEGACY_HTML = path.join(__dirname, "..", "ecpr_commander_v5.1_legacy.html");

test.beforeAll(() => {
  fs.copyFileSync(LEGACY_SRC, LEGACY_HTML);
});

test.beforeEach(async ({ page }) => {
  await page.goto("/ecpr_commander_v5.1_legacy.html");
  await page.evaluate(() => {
    localStorage.clear();
    if (window.confirm) window.__origConfirm = window.confirm;
    window.confirm = () => true;
  });
});

function nearNow(offsetMin) {
  const d = new Date(Date.now() - offsetMin * 60000);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

async function confirmRosc(page, time) {
  await expect(page.locator("#roscModal")).toHaveClass(/show/);
  if (time) await page.fill("#rosc_time", time);
  await page.locator("#btnConfirmRosc").click();
}

async function fillCpaScenario(page) {
  await page.selectOption("#cpa_rhythm", "VF");
  await page.fill("#cpa_arrest_time", nearNow(20));
  await page.fill("#cpa_cpr_time", nearNow(1));
  await page.fill("#cpa_arrival_time", nearNow(5));
  await page.fill("#cpa_last_epi_time", nearNow(3));
  await page.getByRole("button", { name: "目撃あり" }).click();
  await page.getByRole("button", { name: "Bystander CPRあり" }).click();
  await page.getByRole("button", { name: "BVM" }).click();
  await page.getByRole("button", { name: "除細動済み" }).click();
  await page.locator('[data-step-count="epi"][data-delta="1"]').click();
  await page.locator('[data-step-count="epi"][data-delta="1"]').click();
  await page.locator('[data-step-count="shock"][data-delta="1"]').click();
  await page.fill("#cpa_memo", "推定AMI。DNARなし。家族同席。");
}

async function buildFullScenario(page) {
  await fillCpaScenario(page);
  await page.locator("#btnConfirmCpa").click();
  await page.locator("#btnShock").click();
  await page.locator("#btnEpi").click();
  await page.locator("#btnAmio").click();
  await page.getByRole("button", { name: "ECPR", exact: true }).click();
  await page.getByRole("button", { name: "Witnessあり" }).click();
  await page.getByRole("button", { name: "VF/pVT" }).click();
  await page.locator("#btnEcmoCall").click();
  await page.locator("#btnPcps").click();
  await page.locator('[data-ecpr="prime"]').click();
  await page.locator("#btnPump").click();
  await page.getByRole("button", { name: "蘇生操作" }).click();
  await page.locator("#btnRosc").click();
  await confirmRosc(page);
}

test("初期表示: CPAタブ・タイマー未開始", async ({ page }) => {
  await expect(page.locator("#view-cpa")).toHaveClass(/active/);
  await expect(page.locator("#timerArrest")).toHaveText("--:--");
  await expect(page.locator("#headerSummary")).toHaveText("CPA情報未確定");
  await expect(page.locator("#confirmedPill")).toHaveText("CPA未確定");
});

test("CPA確定後: ライブタブへ遷移しタイマーが動く", async ({ page }) => {
  await fillCpaScenario(page);
  await page.locator("#btnConfirmCpa").click();

  await expect(page.locator("#view-live")).toHaveClass(/active/);
  await expect(page.locator("#confirmedPill")).toHaveText("CPA確定済み");
  await expect(page.locator("#headerSummary")).toContainText("VF");
  await expect(page.locator("#headerSummary")).toContainText("Adr");

  await page.waitForTimeout(1100);
  const arrest = await page.locator("#timerArrest").textContent();
  expect(arrest).not.toBe("--:--");
  expect(arrest).toMatch(/^\d{2}:\d{2}$/);
});

test("蘇生操作: 除細動・アドレナリン・波形・ROSC", async ({ page }) => {
  await fillCpaScenario(page);
  await page.locator("#btnConfirmCpa").click();

  await page.locator("#btnShock").click();
  await page.locator("#btnEpi").click();
  await expect(page.locator("#shockBadge")).toHaveText("2");
  await expect(page.locator("#epiBadge")).toHaveText("3");

  await page.locator("#btnRhythm").click();
  await page.locator('[data-rhythm="PEA"]').click();
  await expect(page.locator("#nextHint")).toContainText("PEA");

  await page.locator("#btnRosc").click();
  await confirmRosc(page);
  await expect(page.locator("#timerCycle")).toHaveText("STOP");
  await expect(page.locator("#timerEpi")).toHaveText("STOP");
});

test("ECPR操作盤: 工程フローとタスク記録", async ({ page }) => {
  await fillCpaScenario(page);
  await page.locator("#btnConfirmCpa").click();
  await page.getByRole("button", { name: "ECPR", exact: true }).click();

  await page.locator("#btnEcmoCall").click();
  await page.locator("#btnPcps").click();
  await page.locator('[data-ecpr="piv"]').click();
  await page.locator('[data-ecpr="prime"]').click();

  await expect(page.locator('#ecprFlow .lane[data-flow="call"]')).toHaveClass(/done/);
  await expect(page.locator('#ecprFlow .lane[data-flow="decision"]')).toHaveClass(/done/);
  await expect(page.locator("#btnEcmoCall")).toHaveClass(/done/);
});

test("カニューレモーダル: 体重レンジ選択と留置記録", async ({ page }) => {
  await page.getByRole("button", { name: "ECPR", exact: true }).click();
  await page.locator("#btnArtCann").click();
  await expect(page.locator("#cannulaModal")).toHaveClass(/show/);
  await expect(page.locator("#cannulaModal")).toHaveAttribute("data-focus", "art");
  await expect(page.locator("#cann_modal_title")).toHaveText("送血カニューレ");
  await expect(page.locator('[data-cann-col="ven"]')).toBeHidden();
  await expect(page.locator("#art_cann_size option")).toHaveCount(4);
  await expect(page.locator("#art_cann_size option").nth(1)).toHaveText("17Fr 18cm");

  await page.locator('[data-weight-range="60-70kg"]').click();
  await expect(page.locator("#cann_suggest")).toContainText("送血");
  await expect(page.locator("#cann_suggest")).not.toContainText("脱血");
  await expect(page.locator("#art_cann_size")).toHaveValue("19Fr 18cm");
  await page.fill("#art_cann_cm", "15");
  await page.locator("#btnRecordArtCann").click();

  const logText = await page.locator("#log .log-text").first().textContent();
  expect(logText).toContain("送血カニューレ留置");
});

test("カニューレモーダル: 脱血ボタンは脱血候補のみ表示", async ({ page }) => {
  await page.getByRole("button", { name: "ECPR", exact: true }).click();
  await page.locator("#btnVenCann").click();
  await expect(page.locator("#cannulaModal")).toHaveAttribute("data-focus", "ven");
  await expect(page.locator("#cann_modal_title")).toHaveText("脱血カニューレ");
  await expect(page.locator('[data-cann-col="art"]')).toBeHidden();
  await expect(page.locator("#ven_cann_size option")).toHaveCount(5);
  await expect(page.locator("#ven_cann_size option").nth(1)).toHaveText("23Fr 50cm");

  await page.locator('[data-weight-range="60-70kg"]').click();
  await expect(page.locator("#cann_suggest")).toContainText("脱血");
  await expect(page.locator("#cann_suggest")).not.toContainText("送血");
  await expect(page.locator("#ven_cann_size")).toHaveValue("25Fr 50cm");
});

test("物品チェック: アコーディオン開閉とチェック", async ({ page }) => {
  const firstHead = page.locator(".kit-head").first();
  await firstHead.click();
  await expect(page.locator(".kit-cat").first()).toHaveClass(/open/);

  const firstCheckbox = page.locator('.kit-item input[type="checkbox"]').first();
  await firstCheckbox.check();
  await expect(firstHead).toContainText("1/");
});

test("心肺蘇生報告書: 構造・セクション・タイムスタンプ", async ({ page }) => {
  await buildFullScenario(page);
  await page.locator("#btnBuildReport").click();
  const report = await page.locator("#report").textContent();

  expect(report).toContain("心肺蘇生報告書");
  expect(report).not.toContain("ECPR Commander");
  expect(report).not.toMatch(/生成:/);
  expect(report).toContain("============================================================");

  expect(report).toContain("【1. 心停止・搬入情報】");
  expect(report).toContain("開始状況:");
  expect(report).toContain("初期波形: VF");
  expect(report).toMatch(/心停止時刻: \d{2}:\d{2}/);
  expect(report).toContain("搬入前メモ:");
  expect(report).toContain("DNAR");

  expect(report).toContain("【2. 蘇生サマリー】");
  expect(report).toMatch(/Adrenaline: 合計\d+回/);
  expect(report).toMatch(/除細動: 合計\d+回/);
  expect(report).toContain("転帰: ROSC");

  expect(report).toContain("No flow:");
  expect(report).toContain("Low flow:");
  expect(report).toContain("No+Low flow合計:");

  const flowLines = (report || "").split("\n").filter((l) => /No flow:|Low flow:|No\+Low flow合計:/.test(l));
  test.info().annotations.push({ type: "flow-lines", description: flowLines.join(" | ") });

  expect(report).toContain("【3. タイムライン】");
  expect(report).toMatch(/\d{2}:\d{2} 除細動/);
  expect(report).toMatch(/\d{2}:\d{2} Adrenaline/);
  expect(report).toMatch(/\d{2}:\d{2} ECMOコール/);
  expect(report).not.toMatch(/\d{2}:\d{2} \[/);

  expect(report).toContain("【4. ECPR】");
  expect(report).toContain("ECMOコール");
  expect(report).toContain("PCPS宣言");
  expect(report).toContain("処置記録:");
  expect(report).not.toContain("工程記録:");

  expect(report).not.toMatch(/工程: .+\/.+\//);
  expect(report).not.toMatch(/—|–/);
  expect(report).not.toMatch(/\[CPA\].*【CPA状況】/);
  expect(report?.length || 0).toBeGreaterThan(200);
});

test("心肺蘇生報告書: カニューレと工程が行単位で出力", async ({ page }) => {
  await fillCpaScenario(page);
  await page.locator("#btnConfirmCpa").click();
  await page.getByRole("button", { name: "ECPR", exact: true }).click();
  await page.locator("#btnArtCann").click();
  await page.locator('[data-weight-range="60-70kg"]').click();
  await page.fill("#art_cann_cm", "15");
  await page.locator("#btnRecordArtCann").click();
  await page.locator('[data-ecpr="prime"]').click();
  await page.locator("#btnBuildReport").click();

  const report = await page.locator("#report").textContent();
  expect(report).toContain("カニューレ:");
  expect(report).toContain("送血:");
  expect(report).toContain("固定15cm");
  expect(report).toMatch(/  \d{2}:\d{2} 回路プライミング/);
  expect(report).not.toContain("工程: ");
});

test("目撃あり/なしは排他選択", async ({ page }) => {
  await page.getByRole("button", { name: "目撃あり" }).click();
  await page.getByRole("button", { name: "目撃なし" }).click();

  const witnessOn = await page.locator('[data-group="witness"] .chip.on').count();
  expect(witnessOn).toBe(1);

  const state = await page.evaluate(() => JSON.parse(localStorage.getItem("ecpr_commander_v5_legacy")).cpa.witness);
  expect(state).toContain("目撃なし");
  expect(state).not.toContain("目撃あり");
});

test("Bystander CPRあり/なしは排他選択", async ({ page }) => {
  await page.getByRole("button", { name: "Bystander CPRあり" }).click();
  await page.getByRole("button", { name: "Bystander CPRなし" }).click();

  const state = await page.evaluate(() => JSON.parse(localStorage.getItem("ecpr_commander_v5_legacy")).cpa.witness);
  expect(state).toContain("Bystander CPRなし");
  expect(state).not.toContain("Bystander CPRあり");
});

test("メモ入力で物品チェックの開閉状態を維持", async ({ page }) => {
  await page.locator(".kit-head").first().click();
  await expect(page.locator(".kit-cat").first()).toHaveClass(/open/);

  await page.fill("#cpa_memo", "テスト");
  await page.waitForTimeout(600);

  const stillOpen = await page.locator(".kit-cat").first().evaluate((el) => el.classList.contains("open"));
  expect(stillOpen).toBe(true);
});

test("リズムROSC選択は単一ログ", async ({ page }) => {
  await fillCpaScenario(page);
  await page.locator("#btnConfirmCpa").click();
  await page.locator("#btnRhythm").click();
  await page.locator('[data-rhythm="ROSC"]').click();
  await confirmRosc(page);

  const roscLogs = await page.locator("#log .log-text").filter({ hasText: /ROSC/ }).count();
  expect(roscLogs).toBe(1);
});

test("CPRサイクルタイマーは残り時間を表示", async ({ page }) => {
  await fillCpaScenario(page);
  await page.locator("#btnConfirmCpa").click();

  const cycleVal = await page.locator("#timerCycle").textContent();
  const cycleRemain = await page.locator("#timerCycleRemain").textContent();
  expect(cycleVal).toMatch(/^\d{2}:\d{2}$/);
  expect(cycleRemain).toMatch(/経過/);
});

test("localStorage永続化", async ({ page }) => {
  await fillCpaScenario(page);
  await page.locator("#btnConfirmCpa").click();
  await page.reload();
  await expect(page.locator("#confirmedPill")).toHaveText("CPA確定済み");
  await expect(page.locator("#cpa_rhythm")).toHaveValue("VF");
});

test("コンソールエラーなし", async ({ page }) => {
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (msg) => {
    if (msg.type() === "error") errors.push(msg.text());
  });

  await buildFullScenario(page);
  await page.locator("#btnBuildReport").click();

  expect(errors).toEqual([]);
});
