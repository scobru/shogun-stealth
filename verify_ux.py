import asyncio
from playwright.async_api import async_playwright

async def verify_ux_changes():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context()
        page = await context.new_page()

        try:
            # Navigate to the app
            await page.goto("http://localhost:8080")
            print("Navigated to http://localhost:8080")

            # Wait for content to load
            await page.wait_for_selector("text=Gateway to Stealth", timeout=10000)
            print("Gateway loaded")

            # Simulate login (if possible without complex auth)
            # Since I can't easily simulate WebAuthn/GunDB login in a headless script without seeding,
            # I will check if I can mock the state or if I can at least see the landing page.
            # The "Scan" tab is protected by auth.

            # However, I can try to click the "Explorer" tab even if logged out to see if it renders or shows the "Auth Required" state.
            # The dashboard tabs are visible even if not logged in?
            # Looking at StealthDashboard.tsx:
            #   {!isLoggedIn && ( ... Gateway to Stealth ... )}
            #   Tab Navigation is rendered below that.

            # Click on "Explorer" tab (id="scan")
            await page.click("button:has-text('Explorer')")
            print("Clicked Explorer tab")

            # Wait a bit for transition
            await page.wait_for_timeout(1000)

            # Since we are not logged in, it should show "Sequence Authorization Required"
            # This verifies the component is mounting.

            # To verify the "Copy" button changes, I would need to be logged in and have announcements.
            # This is hard to automate in this environment without a seeded GunDB/User state.

            # I will take a screenshot of the dashboard to at least verify the app is running and the UI is intact.
            await page.screenshot(path="verification_dashboard.png")
            print("Screenshot saved to verification_dashboard.png")

        except Exception as e:
            print(f"Error: {e}")
            await page.screenshot(path="verification_error.png")
        finally:
            await browser.close()

if __name__ == "__main__":
    asyncio.run(verify_ux_changes())
