
from playwright.sync_api import sync_playwright, TimeoutError as PlaywrightTimeoutError


def run_browser_test(url):
    result = {
        "success": False,
        "title": "",
        "final_url": "",
        "page_errors": [],
        "console_errors": [],
        "message": ""
    }

    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True)

            page = browser.new_page()
            page_errors = []
            console_errors = []

            page.on(
                "pageerror",
                lambda error: page_errors.append(str(error))
            )

            page.on(
                "console",
                lambda message: console_errors.append(message.text)
                if message.type == "error"
                else None
            )

            try:
                response = page.goto(
                    url,
                    wait_until="domcontentloaded",
                    timeout=15000
                )

                result["title"] = page.title()
                result["final_url"] = page.url
                result["page_errors"] = page_errors
                result["console_errors"] = console_errors
                result["status_code"] = (
                    response.status if response else None
                )
                result["success"] = True
                result["message"] = (
                    "Browser test completed. Review any reported errors."
                )

            except PlaywrightTimeoutError:
                result["message"] = (
                    "Browser navigation timed out. "
                    "The page may still be loading."
                )

            finally:
                browser.close()

    except Exception as error:
        result["message"] = f"Browser test failed: {error}"

    return result
