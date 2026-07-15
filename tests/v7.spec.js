const { test, expect } = require("@playwright/test");
const { startServer } = require("./serve");
const APP_URL = "http://127.0.0.1:8765/v7.0/";

let appServer;
test.beforeAll(async () => { appServer = await startServer(); });
test.afterAll(async () => {
  if (!appServer) return;
  await new Promise((resolve) => {
    appServer.close(resolve);
    if (appServer.closeAllConnections) appServer.closeAllConnections();
  });
});

test.beforeEach(async ({ page }) => {
  await page.goto(APP_URL);
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.locator('[data-view="ecpr"]').click();
});

async function recordWire(page, target, step) {
  await page.locator("#btnWire").click();
  await page.selectOption("#wire_target", target);
  await page.locator(step === "inserted" ? "#btnRecordWireInserted" : "#btnRecordWireConfirmed").click();
}

async function pastDateValue(page) {
  return page.evaluate(() => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  });
}

async function openRetro(page, kind, time, note = "") {
  if (!(await page.locator("#retroEntryModal").evaluate((el) => el.classList.contains("show")))) {
    await page.locator("#btnRetroEntry").click();
  }
  await page.selectOption("#retro_kind", kind);
  await page.fill("#retro_date", await pastDateValue(page));
  await page.fill("#retro_time", time);
  await page.fill("#retro_note", note);
}

test("送血だけの記録で未実施の脱血カニューレを保存・出力しない", async ({ page }) => {
  await page.locator("#btnArtCann").click();
  await page.locator('[data-art-site="右FA"]').click();
  await page.locator("#btnRecordArtCann").click();

  const state = await page.evaluate(() => JSON.parse(localStorage.getItem("ecpr_commander_v7")));
  expect(state.ecpr.cannula.artActual).toBe("16Fr");
  expect(state.ecpr.cannula.venActual).toBe("");
  expect(state.ecpr.tasks.art_cann).toMatch(/^\d{2}:\d{2}$/);
  expect(state.ecpr.tasks.ven_cann).toBeUndefined();

  await page.locator('[data-rail="report"]').click();
  await page.locator("#btnBuildReport").click();
  const report = await page.locator("#report").textContent();
  expect(report).toContain("送血:");
  expect(report).not.toMatch(/^  脱血:/m);
});

test("ワイヤー逸脱後に第2試行を開始し、再挿入・再確認を時系列保存する", async ({ page }) => {
  await page.locator("#btnCann").click();
  await recordWire(page, "art", "inserted");
  await recordWire(page, "art", "confirmed");

  await page.locator("#btnCannProblem").click();
  await page.selectOption("#cann_problem_target", "art");
  await page.selectOption("#cann_problem_phase", "dilation");
  await page.selectOption("#cann_problem_kind", "wire_displacement");
  await page.fill("#cann_problem_note", "シミュレーション");
  await page.locator("#btnConfirmCannProblem").click();

  await expect(page.locator("#wireStatus")).toContainText("第2試行 再確認待ち");
  await expect(page.locator('#ecprFlow [data-flow="cann"]')).toHaveClass(/warn/);

  await recordWire(page, "art", "inserted");
  await recordWire(page, "art", "confirmed");
  await expect(page.locator("#wireStatus")).toContainText("第2試行 確認済");

  const state = await page.evaluate(() => JSON.parse(localStorage.getItem("ecpr_commander_v7")));
  expect(state.schemaVersion).toBe(9);
  expect(state.ecpr.cannulationAttempts).toHaveLength(2);
  expect(state.ecpr.cannulationAttempts[0]).toMatchObject({ target: "art", attemptNo: 1, status: "abandoned" });
  expect(state.ecpr.cannulationAttempts[0].problem).toMatchObject({ kind: "wire_displacement", phase: "dilation" });
  expect(state.ecpr.cannulationAttempts[1]).toMatchObject({ target: "art", attemptNo: 2, status: "active" });
  expect(state.ecpr.cannulationAttempts[1].wireConfirmedAt).toMatch(/^\d{2}:\d{2}$/);

  const kinds = state.events.map((event) => event.kind).filter(Boolean);
  expect(kinds).toEqual(expect.arrayContaining(["wire_inserted", "wire_confirmed", "cannulation_problem", "repuncture_started"]));
  const seq = state.events.map((event) => event.seq);
  expect(seq).toEqual([...seq].sort((a, b) => a - b));

  await page.locator('[data-rail="report"]').click();
  await page.locator("#btnBuildReport").click();
  const report = await page.locator("#report").textContent();
  const firstProblem = report.indexOf("第1試行 ダイレーション中 ワイヤー抜去・逸脱");
  const retryStart = report.indexOf("第2試行 再穿刺開始");
  const retryConfirm = report.indexOf("第2試行 ガイドワイヤーX線先端確認");
  expect(firstProblem).toBeGreaterThan(-1);
  expect(retryStart).toBeGreaterThan(firstProblem);
  expect(retryConfirm).toBeGreaterThan(retryStart);
  expect(report).toContain("送血側 第1試行 [中断]");
  expect(report).toContain("送血側 第2試行 [進行中]");
});

test("送血側と脱血側の試行状態を独立して保存し再読み込みできる", async ({ page }) => {
  await recordWire(page, "art", "confirmed");
  await recordWire(page, "ven", "inserted");

  await page.reload();
  await page.locator('[data-view="ecpr"]').click();
  await expect(page.locator("#wireStatus")).toContainText("送:第1試行 確認済");
  await expect(page.locator("#wireStatus")).toContainText("脱:第1試行 挿入済");

  const state = await page.evaluate(() => JSON.parse(localStorage.getItem("ecpr_commander_v7")));
  expect(state.ecpr.cannulationAttempts.filter((attempt) => attempt.target === "art")).toHaveLength(1);
  expect(state.ecpr.cannulationAttempts.filter((attempt) => attempt.target === "ven")).toHaveLength(1);
});

test("v6保存データをschemaVersion 9へ移行する", async ({ page }) => {
  await page.evaluate(() => {
    localStorage.clear();
    localStorage.setItem("ecpr_commander_v6", JSON.stringify({
      confirmed: true,
      cpa: { age: "58", witness: [], prehospital: [] },
      ecpr: { tasks: { wire_xp: "12:34" }, criteria: [] },
      events: [{ t: "12:34", cat: "ECPR", text: "ガイドワイヤーX線確認", ep: 1 }]
    }));
  });
  await page.reload();

  const state = await page.evaluate(() => JSON.parse(localStorage.getItem("ecpr_commander_v7")));
  expect(state.schemaVersion).toBe(9);
  expect(state.ecpr.cannulationAttempts).toEqual([]);
  expect(state.ecpr.tasks.wire_xp).toBe("12:34");
  expect(state.events[0].id).toBeTruthy();
  expect(state.events[0].seq).toBe(1);
});

test("深夜をまたぐイベントを実時刻順に報告書へ出力する", async ({ page }) => {
  await page.locator("#btnCann").click();
  await page.evaluate(() => {
    const state = JSON.parse(localStorage.getItem("ecpr_commander_v7"));
    const beforeMidnight = new Date(2026, 6, 15, 23, 59).getTime();
    const afterMidnight = new Date(2026, 6, 16, 0, 1).getTime();
    state.eventSeq = 2;
    state.events = [
      { id: "event-2", t: "00:01", atMs: afterMidnight, seq: 2, cat: "ECPR", text: "深夜後イベント", ep: 1 },
      { id: "event-1", t: "23:59", atMs: beforeMidnight, seq: 1, cat: "ECPR", text: "深夜前イベント", ep: 1 },
    ];
    localStorage.setItem("ecpr_commander_v7", JSON.stringify(state));
  });
  await page.reload();
  await page.locator('[data-view="ecpr"]').click();
  await page.locator('[data-rail="report"]').click();
  await page.locator("#btnBuildReport").click();

  const report = await page.locator("#report").textContent();
  expect(report.indexOf("23:59 深夜前イベント")).toBeLessThan(report.indexOf("00:01 深夜後イベント"));
});

test("事後入力は実施時刻と入力時刻を分けて保存し、ログと帳票に明示する", async ({ page }) => {
  await openRetro(page, "adrenaline", "14:35", "右前腕ルート");
  await page.locator("#btnSaveRetro").click();

  const state = await page.evaluate(() => JSON.parse(localStorage.getItem("ecpr_commander_v7")));
  const event = state.events.at(-1);
  expect(event).toMatchObject({ entryMode: "retrospective", t: "14:35", kind: "adrenaline" });
  expect(event.occurredAtMs).toBeLessThanOrEqual(event.recordedAtMs);
  expect(event.text).toContain("右前腕ルート");
  expect(state.live.epiCount).toBe(1);
  await expect(page.locator("#log")).toContainText("事後");

  await page.locator('[data-rail="report"]').click();
  await page.locator("#btnBuildReport").click();
  const report = await page.locator("#report").textContent();
  expect(report).toContain("14:35 Adrenaline 1mg 1回目 / 右前腕ルート");
  expect(report).toContain("〔事後入力");
});

test("保存して続けるで複数件を入力でき、帳票は入力順ではなく実施時刻順になる", async ({ page }) => {
  await openRetro(page, "echo", "14:40");
  await page.locator("#btnSaveRetroContinue").click();
  await expect(page.locator("#retroEntryModal")).toHaveClass(/show/);

  await openRetro(page, "prime", "14:35");
  await page.locator("#btnSaveRetro").click();
  await page.locator('[data-rail="report"]').click();
  await page.locator("#btnBuildReport").click();
  const report = await page.locator("#report").textContent();
  expect(report.indexOf("14:35 回路プライミング")).toBeLessThan(report.indexOf("14:40 エコー準備"));
});

test("事後入力したワイヤー逸脱と再穿刺を送血側の試行履歴へ紐付ける", async ({ page }) => {
  await openRetro(page, "cannulation_start", "14:30");
  await page.selectOption("#retro_target", "art");
  await page.locator("#btnSaveRetroContinue").click();

  await openRetro(page, "wire_inserted", "14:31");
  await page.selectOption("#retro_target", "art");
  await page.locator("#btnSaveRetroContinue").click();

  await openRetro(page, "wire_displacement", "14:33", "ダイレーター交換中");
  await page.selectOption("#retro_target", "art");
  await page.selectOption("#retro_phase", "dilation");
  await page.locator("#btnSaveRetroContinue").click();

  await openRetro(page, "repuncture_started", "14:34");
  await page.selectOption("#retro_target", "art");
  await page.locator("#btnSaveRetro").click();

  const state = await page.evaluate(() => JSON.parse(localStorage.getItem("ecpr_commander_v7")));
  expect(state.ecpr.cannulationAttempts).toHaveLength(2);
  expect(state.ecpr.cannulationAttempts[0]).toMatchObject({ target: "art", attemptNo: 1, status: "abandoned" });
  expect(state.ecpr.cannulationAttempts[0].problem).toMatchObject({ kind: "wire_displacement", phase: "dilation", entryMode: "retrospective" });
  expect(state.ecpr.cannulationAttempts[1]).toMatchObject({ target: "art", attemptNo: 2, status: "active" });
  expect(state.ecpr.cannulationAttempts[1].retryOf).toBe(state.ecpr.cannulationAttempts[0].id);
  expect(state.events.filter((event) => event.entryMode === "retrospective")).toHaveLength(4);
});

test("スマートフォン幅でも事後入力モーダルが横にはみ出さず操作できる", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.locator("#btnRetroEntry").click();
  await page.selectOption("#retro_kind", "wire_displacement");
  const layout = await page.evaluate(() => {
    const box = document.querySelector("#retroEntryModal .modal-box").getBoundingClientRect();
    return {
      documentWidth: document.documentElement.scrollWidth,
      viewportWidth: window.innerWidth,
      boxLeft: box.left,
      boxRight: box.right,
      scrollable: document.querySelector("#retroEntryModal .modal-box").scrollHeight > document.querySelector("#retroEntryModal .modal-box").clientHeight,
    };
  });
  expect(layout.documentWidth).toBeLessThanOrEqual(layout.viewportWidth);
  expect(layout.boxLeft).toBeGreaterThanOrEqual(0);
  expect(layout.boxRight).toBeLessThanOrEqual(layout.viewportWidth);
  await expect(page.locator("#btnSaveRetro")).toBeVisible();
});

test("v7.2をPWAキャッシュからオフライン起動できる", async ({ page, context }) => {
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.reload();
  await expect.poll(() => page.evaluate(() => Boolean(navigator.serviceWorker.controller))).toBe(true);
  await context.setOffline(true);
  await page.reload();
  await expect(page).toHaveTitle(/v7\.2/);
  await expect(page.locator("#btnRetroEntry")).toBeVisible();
});
