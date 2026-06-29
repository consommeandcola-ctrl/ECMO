// @ts-check
/** v6.0 実臨床デモ: 37歳男性 VF ECPR（救命救急センター看護師視点の記録） */
const { test, expect } = require("@playwright/test");
const fs = require("fs");
const path = require("path");

const OUT = path.join(__dirname, "..", "test-results", "v6-37vf-clinical-report.txt");

test.beforeAll(() => {
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
});

test("v6 実臨床: 37歳男性 VF ECPR", async ({ page }) => {
  await page.goto("/ecpr_commander_v6.0.html");
  await page.evaluate(() => {
    localStorage.clear();
    window.confirm = () => true;
    let min = 33;
    EcprCommanderV6.prototype.nowTime = function () {
      const m = min++;
      const h = 11 + Math.floor(m / 60);
      return `${String(h).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
    };
  });

  // --- CPA情報確定（搬入時 11:32 接触） ---
  await page.fill("#cpa_age", "37");
  await page.selectOption("#cpa_sex", "男性");
  await page.selectOption("#cpa_arrest_place", "自宅");
  await page.selectOption("#cpa_cause", "心原性");
  await page.selectOption("#cpa_start_type", "プレホスCPA継続");
  await page.selectOption("#cpa_rhythm", "VF");
  await page.fill("#cpa_arrest_time", "11:15");
  await page.fill("#cpa_cpr_time", "11:16");
  await page.fill("#cpa_arrival_time", "11:32");
  await page.fill("#cpa_last_epi_time", "11:28");
  await page.getByRole("button", { name: "目撃あり" }).click();
  await page.getByRole("button", { name: "Bystander CPRあり" }).click();
  await page.getByRole("button", { name: "AED使用" }).click();
  await page.getByRole("button", { name: "BVM" }).click();
  await page.getByRole("button", { name: "末梢静脈路" }).click();
  await page.getByRole("button", { name: "除細動済み" }).click();
  await page.locator('[data-step-count="epi"][data-delta="1"]').click();
  await page.locator('[data-step-count="epi"][data-delta="1"]').click();
  await page.locator('[data-step-count="epi"][data-delta="1"]').click();
  await page.locator('[data-step-count="shock"][data-delta="1"]').click();
  await page.locator('[data-step-count="shock"][data-delta="1"]').click();
  await page.locator('[data-step-count="shock"][data-delta="1"]').click();
  await page.fill(
    "#cpa_memo",
    "37歳男性。配偶者目撃。推定AMI。既往なし。DNARなし。家族へ状況説明・同意取得。"
  );
  await page.locator("#btnConfirmCpa").click();

  // --- 院内初期蘇生（救急外来） ---
  await page.locator("#btnShock").click();
  await page.locator("#btnEpi").click();
  await page.locator("#btnRhythm").click();
  await page.locator('[data-rhythm="VF"]').click();
  await page.locator('[data-quick="12誘導心電図"]').click();
  await page.locator('[data-quick="心エコー"]').click();

  // --- ECPR工程 ---
  await page.getByRole("button", { name: "ECPR", exact: true }).click();
  await page.getByRole("button", { name: "Witnessあり" }).click();
  await page.getByRole("button", { name: "VF/pVT" }).click();
  await page.getByRole("button", { name: "可逆性疾患疑い" }).click();
  await page.getByRole("button", { name: "ADL良好" }).click();

  await page.locator('[data-ecpr="handover"]').click();
  await page.fill(
    "#handover_text",
    "現場VF持続。AED1回ショック。バイスタンダーCPR約5分。救急隊到着後BVM換気。除細動計3回(200J相当)。アドレナリン3回(11:20,11:24,11:28)。搬送中もVF。意識消失持続。"
  );
  await page.locator("#btnConfirmHandover").click();

  await page.locator("#btnEcmoCall").click();
  await page.locator("#btnPcps").click();

  await page.locator('[data-ecpr="role"]').click();
  await page.fill("#role_leader", "救急科医A");
  await page.fill("#role_cannulator", "循環器医B");
  await page.fill("#role_ce", "臨床工学技士C");
  await page.fill("#role_recorder", "看護師(記録担当)");
  await page.locator("#btnConfirmRole").click();

  await page.locator('[data-ecpr="piv"]').click();
  await page.locator('[data-ecpr="cpr_quality"]').click();
  await page.fill("#cpr_etco2", "18");
  await page.fill("#cpr_depth", "適切");
  await page.fill("#cpr_quality_note", "圧迫中断最小化。2分交代。LUCASなし徒手CPR。");
  await page.locator("#btnConfirmCprQuality").click();

  await page.locator('[data-ecpr="echo"]').click();
  await page.locator('[data-ecpr="prime"]').click();
  await page.locator('[data-ecpr="act"]').click();
  await page.locator('[data-ecpr="heparin"]').click();
  await page.fill("#heparin_unit", "5000");
  await page.locator("#btnConfirmHeparin").click();

  await page.locator("#btnCann").click();
  await page.locator("#btnArtCann").click();
  await page.locator('[data-weight-range="60-70kg"]').click();
  await page.selectOption("#art_cann_site", "右FA");
  await page.fill("#art_cann_cm", "14");
  await page.locator("#btnRecordArtCann").click();

  await page.locator("#btnVenCann").click();
  await page.locator('[data-weight-range="60-70kg"]').click();
  await page.selectOption("#ven_cann_site", "右FV");
  await page.fill("#ven_cann_cm", "38");
  await page.locator("#btnRecordVenCann").click();

  await page.locator('[data-ecpr="wire_xp"]').click();
  await page.locator('[data-ecpr="connect"]').click();

  await page.locator("#btnPump").click();
  await page.fill("#pump_flow", "2.8");
  await page.fill("#pump_fio2", "80");
  await page.fill("#pump_rpm", "3200");
  await page.locator("#btnConfirmPump").click();

  await page.locator("#btnDpcCann").click();
  await page.selectOption("#dpc_cann_size", "5Fr");
  await page.fill("#dpc_cann_cm", "12");
  await page.locator("#btnRecordDpcCann").click();

  await page.locator('[data-ecpr="ct_route"]').click();
  await page.fill("#route_note", "大動脈解離・肺塞栓除外のため");
  await page.locator("#btnConfirmRoute").click();
  await page.locator('[data-ecpr="cag_route"]').click();
  await page.fill("#route_note", "VF・若年男性・心原性停止。LAD病変疑い");
  await page.locator("#btnConfirmRoute").click();
  await page.locator('[data-ecpr="ct_done"]').click();
  await page.locator('[data-ecpr="right_spo2"]').click();

  // --- ROSC（ECMO確立後の循環再開） ---
  await page.getByRole("button", { name: "蘇生処置" }).click();
  await page.selectOption("#case_outcome", "ICU入室");
  await page.locator("#btnRosc").click();
  await page.fill("#rosc_time", "12:12");
  await page.fill("#rosc_bp", "98/52");
  await page.fill("#rosc_pulse", "112");
  await page.fill("#rosc_note", "ECMO流量2.8L/minで自己心拍再開。自己呼吸弱い。皮膚温かい。散瞳なし。");
  await page.locator("#btnConfirmRosc").click();

  await page.locator("#btnBuildReport").click();
  const report = await page.locator("#report").textContent();

  expect(report).toContain("37歳 男性");
  expect(report).toContain("VF");
  expect(report).toContain("【3. ECPRタイムポイント】");
  expect(report).toContain("12:12");
  expect(report).toContain("ICU入室");
  expect(report).toContain("救急隊申し送り");
  expect(report).toContain("右FA");
  expect(report).toContain("右FV");

  fs.writeFileSync(OUT, report || "", "utf8");
  console.log("\n===== v6.0 37歳VF 実臨床報告書 =====\n");
  console.log(report);
});
