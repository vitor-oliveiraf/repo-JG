import { test, expect } from "@playwright/test";

for (const path of ["/login", "/cadastro"]) {
  test(`auth stays centered and inside production viewport: ${path}`, async ({
    page,
  }) => {
    await page.goto("/");
    await page.getByRole("link", { name: "Entrar", exact: true }).click();
    if (path === "/cadastro")
      await page
        .locator(".auth-tabs")
        .getByRole("link", { name: "Criar conta" })
        .click();
    const dialog = page.locator(".auth-dialog");
    await expect(dialog).toBeVisible();
    await expect
      .poll(async () => {
        const box = await dialog.boundingBox();
        const viewport = page.viewportSize()!;
        return (
          !!box &&
          Math.abs(box.x + box.width / 2 - viewport.width / 2) < 1 &&
          box.y >= 15 &&
          box.y + box.height <= viewport.height - 15
        );
      })
      .toBe(true);
    await expect(page.locator(".auth-tabs")).toBeInViewport();
    await page.getByRole("button", { name: "Fechar", exact: true }).click();
    await expect(page).toHaveURL(/\/$/);
    await page.getByRole("button", { name: "Cenários", exact: true }).click();
    const generic = page.getByRole("dialog");
    await expect(generic).toBeVisible();
    const box = (await generic.boundingBox())!;
    expect(
      Math.abs(box.x + box.width / 2 - page.viewportSize()!.width / 2),
    ).toBeLessThan(1);
    expect(box.y).toBeGreaterThanOrEqual(0);
    await page.keyboard.press("Escape");
    await expect(
      page.getByRole("button", { name: "Cenários", exact: true }),
    ).toBeFocused();
  });
}
