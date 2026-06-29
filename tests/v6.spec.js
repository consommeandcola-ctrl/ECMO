// @ts-check
const { test, expect } = require("@playwright/test");

function nearNow(offsetMin) {
  const d = new Date(Date.now() - offsetMin * 60000);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

test.beforeEach(async ({ page }) => {
  await page.goto("/ecpr_commander_v6.0.html");
  await page.evaluate(() => {
    localStorage.clear();
    if (window.confirm) window.__origConfirm = window.confirm;
    window.confirm = () => true;
  });
});

test("v6: 患者情報と報告書セクション", async ({ page }) => {
  await page.fill("#cpa_age", "58");
  await page.selectOption("#cpa_sex", "男性");
  await page.selectOption("#cpa_arrest_place", "自宅");
  await page.selectOption("#cpa_cause", "心原性");
  await page.selectOption("#cpa_rhythm", "VF");
  await page.fill("#cpa_arrest_time", nearNow(30));
  await page.fill("#cpa_cpr_time", nearNow(29));
  await page.fill("#cpa_arrival_time", nearNow(5));
  await page.locator("#btnConfirmCpa").click();

  await page.getByRole("button", { name: "ECPR", exact: true }).click();
  await page.locator('[data-ecpr="handover"]').click();
  await page.fill("#handover_text", "現場VF。AED1回。アドレナリン2回。");
  await page.locator("#btnConfirmHandover").click();

  await page.locator("#btnEcmoCall").click();
  await page.locator("#btnPcps").click();
  await page.locator("#btnCann").click();
  await page.locator("#btnArtCann").click();
  await page.locator('[data-weight-range="45-60kg"]').click();
  await page.selectOption("#art_cann_site", "右FA");
  await page.fill("#art_cann_cm", "15");
  await page.locator("#btnRecordArtCann").click();
  await page.locator("#btnVenCann").click();
  await page.selectOption("#ven_cann_site", "右FV");
  await page.fill("#ven_cann_actual", "23Fr");
  await page.locator("#btnRecordVenCann").click();

  await page.locator("#btnPump").click();
  await page.fill("#pump_flow", "2.5");
  await page.fill("#pump_fio2", "60");
  await page.locator("#btnConfirmPump").click();

  await page.locator('[data-ecpr="ct_route"]').click();
  await page.fill("#route_note", "解離除外");
  await page.locator("#btnConfirmRoute").click();
  await page.locator('[data-ecpr="ct_done"]').click();

  await page.locator("#btnBuildReport").click();
  const report = await page.locator("#report").textContent();

  expect(report).toContain("【1. 患者・心停止・搬入情報】");
  expect(report).toContain("患者: 58歳 男性");
  expect(report).toContain("心停止場所: 自宅");
  expect(report).toContain("【3. ECPRタイムポイント】");
  expect(report).toContain("送血留置");
  expect(report).toContain("脱血留置");
  expect(report).toContain("【4. タイムライン】");
  expect(report).not.toContain("[第1エピソード]");
  expect(report).not.toContain("[現エピソード]");
  expect(report).toContain("No flow:");
  expect(report).toContain("【5. ECPR詳細】");
  expect(report).toContain("【優先】CT優先");
  expect(report).toContain("【実施】CT実施");
  expect(report).toContain("流量 2.5L/min");
  expect(report).toContain("右FA");
});

test("v6: ROSC後再心停止でエピソード番号が増える", async ({ page }) => {
  await page.selectOption("#cpa_rhythm", "VF");
  await page.fill("#cpa_arrest_time", nearNow(20));
  await page.fill("#cpa_cpr_time", nearNow(19));
  await page.locator("#btnConfirmCpa").click();

  await page.locator("#btnRosc").click();
  await page.fill("#rosc_bp", "100/60");
  await page.locator("#btnConfirmRosc").click();
  await page.locator("#btnCpr").click();

  await page.locator("#btnBuildReport").click();
  const report = await page.locator("#report").textContent();
  expect(report).toContain("第2回");
  expect(report).not.toContain("[現エピソード]");
  expect(report).toContain("BP 100/60");
});
