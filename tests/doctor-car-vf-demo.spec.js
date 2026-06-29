// @ts-check
/** ドクターカー VF 38歳症例デモ: 報告書を生成してファイル出力 */
const { test, expect } = require("@playwright/test");
const fs = require("fs");
const path = require("path");

const LEGACY_SRC = path.join(__dirname, "..", "ecpr_commander_v5.1_legacy.txt");
const LEGACY_HTML = path.join(__dirname, "..", "ecpr_commander_v5.1_legacy.html");
const OUT = path.join(__dirname, "..", "test-results", "doctor-car-vf-report.txt");

test.beforeAll(() => {
  fs.copyFileSync(LEGACY_SRC, LEGACY_HTML);
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
});

test("ドクターカー VF 38歳 11:32接触シナリオ", async ({ page }) => {
  await page.goto("/ecpr_commander_v5.1_legacy.html");
  await page.evaluate(() => {
    localStorage.clear();
    window.confirm = () => true;
    let min = 33;
    EcprCommanderV5.prototype.nowTime = function () {
      const m = min++;
      const h = 11 + Math.floor(m / 60);
      return `${String(h).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
    };
  });

  // --- CPA入力: ドクターカー搬送 VF 38歳 ---
  await page.selectOption("#cpa_start_type", "プレホスCPA継続");
  await page.selectOption("#cpa_rhythm", "VF");
  await page.fill("#cpa_arrest_time", "11:15");
  await page.fill("#cpa_cpr_time", "11:16");
  await page.fill("#cpa_arrival_time", "11:32");
  await page.fill("#cpa_last_epi_time", "11:28");
  await page.getByRole("button", { name: "目撃あり" }).click();
  await page.getByRole("button", { name: "Bystander CPRあり" }).click();
  await page.getByRole("button", { name: "BVM" }).click();
  await page.getByRole("button", { name: "末梢静脈路" }).click();
  await page.getByRole("button", { name: "除細動済み" }).click();
  await page.locator('[data-step-count="epi"][data-delta="1"]').click();
  await page.locator('[data-step-count="epi"][data-delta="1"]').click();
  await page.locator('[data-step-count="shock"][data-delta="1"]').click();
  await page.locator('[data-step-count="shock"][data-delta="1"]').click();
  await page.fill(
    "#cpa_memo",
    "38歳男性。ドクターカー症例。目撃下院外心停止。推定AMI。DNARなし。家族へ状況説明済み。"
  );
  await page.locator("#btnConfirmCpa").click();

  // --- 院内蘇生 ---
  await page.locator("#btnShock").click();
  await page.locator("#btnEpi").click();
  await page.locator("#btnRhythm").click();
  await page.locator('[data-rhythm="PEA"]').click();
  await page.locator("#btnEpi").click();
  await page.getByRole("button", { name: "12誘導" }).click();
  await page.getByRole("button", { name: "心エコー" }).click();

  // --- ECPR ---
  await page.getByRole("button", { name: "ECPR", exact: true }).click();
  await page.getByRole("button", { name: "Witnessあり" }).click();
  await page.getByRole("button", { name: "VF/pVT" }).click();
  await page.getByRole("button", { name: "可逆性疾患疑い" }).click();
  await page.locator("#btnEcmoCall").click();
  await page.locator("#btnPcps").click();
  await page.locator('[data-ecpr="piv"]').click();
  await page.locator('[data-ecpr="echo"]').click();
  await page.locator('[data-ecpr="prime"]').click();
  await page.locator("#btnArtCann").click();
  await page.locator('[data-weight-range="45-60kg"]').click();
  await page.fill("#art_cann_cm", "14");
  await page.locator("#btnRecordArtCann").click();
  await page.locator("#btnVenCann").click();
  await page.locator('[data-weight-range="45-60kg"]').click();
  await page.fill("#ven_cann_cm", "38");
  await page.locator("#btnRecordVenCann").click();
  await page.locator('[data-ecpr="connect"]').click();
  await page.locator("#btnPump").click();

  // --- 転帰 ---
  await page.getByRole("button", { name: "蘇生操作" }).click();
  await page.locator("#btnRosc").click();
  await page.fill("#rosc_time", "11:58");
  await page.locator("#btnConfirmRosc").click();

  await page.locator("#btnBuildReport").click();
  const report = await page.locator("#report").textContent();
  expect(report).toContain("11:32");
  expect(report).toContain("38歳");
  expect(report).toContain("VF");
  expect(report).toContain("ROSC時刻: 11:58");
  expect(report).toContain("No flow: 1分00秒");
  expect(report).toContain("Low flow: 42分00秒");
  expect(report).toContain("No+Low flow合計: 43分00秒");
  expect(report).toContain("処置記録:");
  expect(report).not.toContain("工程記録:");
  fs.writeFileSync(OUT, report || "", "utf8");
  console.log("\n===== 生成報告書 =====\n");
  console.log(report);
  console.log("\n===== 保存先: " + OUT + " =====\n");
});
