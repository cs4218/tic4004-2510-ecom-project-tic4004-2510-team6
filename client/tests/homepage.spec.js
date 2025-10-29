import { test, expect } from "@playwright/test";

test.describe("Header Component UI", () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the app's base URL
    await page.goto("http://localhost:3000/login");
  });

  test("#Test Case 1: should display logo and main navigation links", async ({ page }) => {
    await expect(page.locator("text=🛒 Virtual Vault")).toBeVisible();
    await expect(page.locator("nav >> text=Home")).toBeVisible();
    await expect(page.locator(".nav-link")).toContainText(['Categories']);
  });

  test("#Test Case 2: should show Register and Login when user is not logged in", async ({ page }) => {
    await expect(page.getByRole("link", { name: "Register" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Login" })).toBeVisible();
  });

  test("#Test Case 3: should display dropdown menu when hovering over Categories", async ({ page }) => {

    await page.getByRole("link", { name: "Categories" }).click();
    await expect(page.locator(".dropdown-menu")).toBeVisible();
  });

  test("#Test Case 4: should navigate to Cart page when Cart link is clicked", async ({ page }) => {
    await page.click("text=Cart");
    await expect(page).toHaveURL(/.*\/cart/);
  });

  test("#Test Case 5: should display badge count for cart items", async ({ page }) => {
    const badge = page.locator(".ant-badge-count");
    await expect(badge).toBeVisible();
  });


  test("#Test Case 6: should show user dropdown when logged in", async ({ page }) => {
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
