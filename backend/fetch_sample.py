from playwright.sync_api import sync_playwright
import time

def fetch_top_ranker():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
        )
        page = context.new_page()

        print("Navigating to ranking page...")
        page.goto("https://aion.plaync.com/ranking/battle?world=classic", wait_until="networkidle")
        
        # Click the first character in the table
        # Selector guess: .ranking_table tbody tr:first-child a
        # Or check textual content.
        try:
            print("Waiting for list...")
            page.wait_for_selector(".ranking-table tbody tr", timeout=10000)
            
            # Get first row
            row = page.locator(".ranking-table tbody tr").first
            # Click the character name link
            link = row.locator("a").first
            
            print("Clicking first character...")
            link.click()
            
            print("Waiting for detail page...")
            page.wait_for_load_state("networkidle")
            time.sleep(3) # Extra wait for JS
            
            content = page.content()
            with open("debug_detail_sample.html", "w", encoding="utf-8") as f:
                f.write(content)
            print("Saved debug_detail_sample.html")
            
        except Exception as e:
            print(f"Error: {e}")
            # Save whatever we have
            with open("debug_error_sample.html", "w", encoding="utf-8") as f:
                f.write(page.content())
        
        browser.close()

if __name__ == "__main__":
    fetch_top_ranker()
