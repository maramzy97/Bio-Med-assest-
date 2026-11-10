import { test, expect } from "@playwright/test";
test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "لوحة المتابعة", exact: true }),
  ).toBeVisible();
});
async function nav(page, label) {
  await page
    .getByRole("button", { name: label, exact: true })
    .filter({ visible: true })
    .first()
    .click();
}
async function pin(page, value = "1234") {
  await page.getByLabel("رمز الحماية", { exact: true }).fill(value);
  await page.getByRole("button", { name: "تحقق ومتابعة" }).click();
}
test("dashboard isolation, registry search and device fields", async ({
  page,
}) => {
  await expect(page.locator(".asset-card")).toHaveCount(0);
  await nav(page, "الأجهزة");
  await expect(page.locator(".asset-card")).toHaveCount(6);
  await page.getByLabel("البحث في الأجهزة").fill("SN-70231");
  await expect(page.locator(".asset-card")).toHaveCount(1);
  await page.locator(".asset-card").click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(page.getByRole("tabpanel")).toContainText("Fresenius");
  await page.getByRole("tab", { name: "بطاقة QR" }).click();
  await expect(page.locator("#print-badge > svg")).toBeVisible();
  await page.screenshot({
    path: "test-results/qr-" + test.info().project.name + ".png",
    fullPage: true,
  });
});
test("PIN guard and department creation", async ({ page }) => {
  await nav(page, "الأقسام");
  await page
    .getByRole("button", { name: "إضافة قسم جديد", exact: true })
    .click();
  await pin(page, "0000");
  await expect(page.getByRole("alert")).toContainText("غير صحيح");
  await pin(page);
  await page.getByLabel("اسم القسم", { exact: true }).fill("الأشعة التشخيصية");
  await page.getByRole("button", { name: "إضافة القسم", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "الأشعة التشخيصية" }),
  ).toBeVisible();
});
test("maintenance timeline, atomic status change and persistence", async ({
  page,
}) => {
  await nav(page, "الأجهزة");
  await page.getByLabel("البحث في الأجهزة").fill("BME-0002");
  await page.locator(".asset-card").click();
  await page.getByRole("button", { name: "تسجيل صيانة", exact: true }).click();
  await pin(page);
  await page
    .getByLabel("تفاصيل العطل والإجراء الفني *", { exact: true })
    .fill("تم فحص الجهاز واستبدال الفلتر بنجاح");
  await page
    .getByLabel("قطع الغيار المستبدلة", { exact: true })
    .fill("فلتر هواء");
  await page
    .getByLabel("اسم الفني / المهندس *", { exact: true })
    .fill("م. أحمد");
  await page.getByLabel("التكلفة بالجنيه المصري").fill("450");
  await page
    .getByLabel("الحالة بعد الصيانة", { exact: true })
    .selectOption("active");
  await page
    .getByRole("button", { name: "تسجيل الصيانة وتحديث الجهاز" })
    .click();
  await page.getByRole("tab", { name: "سجل الصيانة" }).click();
  await expect(page.locator(".timeline")).toContainText("فلتر هواء");
  await page.reload();
  await nav(page, "الأجهزة");
  await page.getByLabel("البحث في الأجهزة").fill("BME-0002");
  await expect(page.locator(".asset-card .badge")).toHaveText("في الخدمة");
});
test("new asset, PIN protected status, and QR lookup", async ({ page }) => {
  await nav(page, "الأجهزة");
  await page.getByRole("button", { name: "إضافة جهاز جديد" }).click();
  await pin(page);
  await page
    .getByLabel("اسم الجهاز *", { exact: true })
    .fill("جهاز صدمات كهربائية");
  await page.getByLabel("القسم *", { exact: true }).selectOption("icu");
  await page.getByLabel("رقم الأصل *", { exact: true }).fill("BME-NEW");
  await page.getByLabel("الرقم المسلسل *", { exact: true }).fill("SN-NEW");
  await page.getByRole("button", { name: "حفظ بيانات الجهاز" }).click();
  await page.getByLabel("البحث في الأجهزة").fill("BME-NEW");
  await page.locator(".asset-card").click();
  await page.getByRole("button", { name: "خارج الخدمة", exact: true }).click();
  await pin(page);
  await expect(page.locator(".profile-summary .badge")).toHaveText(
    "خارج الخدمة",
  );
  await page.getByRole("button", { name: "إغلاق", exact: true }).click();
  await nav(page, "مسح QR");
  await page.getByLabel("رقم الأصل أو رابط الجهاز").fill("BME-NEW");
  await page.getByRole("button", { name: "فتح كارت الجهاز" }).click();
  await expect(page.getByRole("dialog")).toContainText("جهاز صدمات كهربائية");
});
test("layout has no horizontal overflow and tabs remain isolated", async ({
  page,
}) => {
  for (const label of ["الرئيسية", "الأجهزة", "الأقسام", "مسح QR"]) {
    await nav(page, label);
    expect(
      await page.evaluate(
        () =>
          document.documentElement.scrollWidth <=
          document.documentElement.clientWidth,
      ),
    ).toBe(true);
  }
  await nav(page, "الرئيسية");
  await page.screenshot({
    path: "test-results/dashboard-" + test.info().project.name + ".png",
    fullPage: true,
  });
});
test("deep link opens matching device", async ({ page }) => {
  await page.goto("/?asset=BME-0003");
  await expect(page.getByRole("dialog")).toContainText("حضانة أطفال");
});
