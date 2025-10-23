import { test, expect } from "@playwright/test";

test.describe("Header Component UI", () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the app's base URL
    await page.goto("http://localhost:3000");
  });

  test("should display logo and main navigation links", async ({ page }) => {
    await expect(page.locator("text=🛒 Virtual Vault")).toBeVisible();
    await expect(page.locator("nav >> text=Home")).toBeVisible();
    await expect(page.locator(".nav-link")).toContainText(['Categories']);
  });

  test("should show Register and Login when user is not logged in", async ({ page }) => {
    await expect(page.locator("text=Register")).toBeVisible();
    await expect(page.locator("text=Login")).toBeVisible();
  });

  test("should display dropdown menu when hovering over Categories", async ({ page }) => {

    await page.getByRole("link", { name: "Categories" }).click();
    await expect(page.locator(".dropdown-menu")).toBeVisible();
  });

  test("should navigate to Cart page when Cart link is clicked", async ({ page }) => {
    await page.click("text=Cart");
    await expect(page).toHaveURL(/.*\/cart/);
  });

  test("should display badge count for cart items", async ({ page }) => {
    const badge = page.locator(".ant-badge-count");
    await expect(badge).toBeVisible();
  });


  test("should show user dropdown when logged in", async ({ page }) => {
    // Mock localStorage to simulate logged-in user
    await page.addInitScript(() => {
      localStorage.setItem(
        "auth",
        JSON.stringify({
          user: { name: "TestUser", role: 0 },
          token: "mockToken",
        })
      );
    });

    await page.reload();

    await expect(page.locator("nav >> text=TestUser")).toBeVisible();
    await page.click("text=TestUser");
    await expect(page.locator("text=Dashboard")).toBeVisible();
    await expect(page.locator("text=Logout")).toBeVisible();
  });
});
