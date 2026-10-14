async function scanWebsite() {
    const url = document.getElementById("url").value.trim();
    const button = document.getElementById("scanBtn");
    const message = document.getElementById("message");
    const progress = document.getElementById("progress");
    const findings = document.getElementById("findings");

    if (!url) {
        message.textContent = "Please enter a website URL.";
        return;
    }

    message.style.color = "";
    message.textContent = "";
    progress.classList.remove("hidden");
    progress.textContent = "Scanning website...";
    button.disabled = true;
    button.textContent = "Scanning...";
    findings.textContent = "Checking website response...";

    try {
        const response = await fetch("/scan", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ url })
        });

        const data = await response.json();

        if (!response.ok || !data.success) {
            throw new Error(data.message || "Scan failed.");
        }

        const issues = Array.isArray(data.issues) ? data.issues : [];
        const confirmedFindings = issues.filter(
            issue => issue.severity !== "Info"
        );
        const isRedirect =
            Number(data.status_code) >= 300 &&
            Number(data.status_code) < 400;

        document.getElementById("httpStatus").textContent =
            data.status_code ?? "—";
        document.getElementById("issueCount").textContent =
            confirmedFindings.length;
        document.getElementById("scanResult").textContent =
            isRedirect ? "Redirect Detected" :
            confirmedFindings.length ? "Review Findings" : "Passed";

        message.textContent = isRedirect
            ? "Redirect detected. A redirect is not automatically a bug."
            : data.message;

        findings.replaceChildren();

        const summary = document.createElement("p");
        summary.textContent = "Scanned: " + (data.url || url);
        findings.appendChild(summary);

        if (isRedirect && data.redirect_url) {
            const destination = document.createElement("p");
            destination.textContent =
                "Redirect destination: " + data.redirect_url;
            findings.appendChild(destination);
        }

        if (issues.length === 0) {
            const item = document.createElement("div");
            item.className = "finding";
            item.textContent =
                "No HTTP status errors detected. This does not guarantee the website is bug-free.";
            findings.appendChild(item);
        }

        issues.forEach(issue => {
            const item = document.createElement("div");
            item.className = "finding";

            const title = document.createElement("h3");
            title.textContent = issue.title || "Finding";

            const severity = document.createElement("p");
            severity.textContent =
                "Severity: " + (issue.severity || "Unknown");

            const details = document.createElement("p");
            details.textContent = issue.details || "";

            item.append(title, severity, details);
            findings.appendChild(item);
        });

    } catch (error) {
        message.style.color = "#ffb5b5";
        message.textContent = error.message;
        findings.textContent = "Unable to complete the scan.";
        document.getElementById("scanResult").textContent = "Failed";
    } finally {
        progress.classList.add("hidden");
        progress.textContent = "Scanning website...";
        button.disabled = false;
        button.textContent = "Start Scan";
    }
}

async function runBrowserTest() {
    const url = document.getElementById("url").value.trim();
    const button = document.getElementById("browserTestBtn");
    const scanButton = document.getElementById("scanBtn");
    const message = document.getElementById("message");
    const progress = document.getElementById("progress");
    const findings = document.getElementById("findings");

    if (!url) {
        message.textContent = "Please enter a website URL.";
        return;
    }

    message.style.color = "";
    message.textContent = "";
    progress.classList.remove("hidden");
    progress.textContent = "Running browser test...";
    button.disabled = true;
    scanButton.disabled = true;
    button.textContent = "Testing...";
    findings.textContent = "Opening website in a browser...";

    try {
        const response = await fetch("/browser-test", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ url })
        });

        const data = await response.json();

        if (!response.ok || !data.success) {
            throw new Error(data.message || "Browser test failed.");
        }

        const pageErrors = Array.isArray(data.page_errors)
            ? data.page_errors : [];
        const consoleErrors = Array.isArray(data.console_errors)
            ? data.console_errors : [];

        findings.replaceChildren();

        const summary = document.createElement("p");
        summary.textContent =
            "Browser test: " + (data.message || "Completed");
        findings.appendChild(summary);

        const details = [
            ["Page title", data.title || "Not available"],
            ["Final URL", data.final_url || url],
            ["HTTP status", data.status_code ?? "Not available"],
            ["JavaScript page errors", pageErrors.length],
            ["Console errors", consoleErrors.length]
        ];

        details.forEach(([label, value]) => {
            const item = document.createElement("div");
            item.className = "finding";

            const text = document.createElement("p");
            text.textContent = label + ": " + value;

            item.appendChild(text);
            findings.appendChild(item);
        });

        [
            ["JavaScript page errors", pageErrors],
            ["Console errors", consoleErrors]
        ].forEach(([label, errors]) => {
            if (errors.length > 0) {
                const heading = document.createElement("h3");
                heading.textContent = label;
                findings.appendChild(heading);

                errors.forEach(error => {
                    const item = document.createElement("div");
                    item.className = "finding";
                    item.textContent = String(error);
                    findings.appendChild(item);
                });
            }
        });

        document.getElementById("httpStatus").textContent =
            data.status_code ?? "—";
        document.getElementById("issueCount").textContent =
            pageErrors.length + consoleErrors.length;
        document.getElementById("scanResult").textContent =
            pageErrors.length + consoleErrors.length > 0
                ? "Review Findings"
                : "Browser Test Passed";

        message.textContent = data.message ||
            "Browser test completed. Review any reported errors.";

    } catch (error) {
        message.style.color = "#ffb5b5";
        message.textContent = error.message;
        findings.textContent = "Unable to complete the browser test.";
        document.getElementById("scanResult").textContent = "Failed";
    } finally {
        progress.classList.add("hidden");
        progress.textContent = "Scanning website...";
        button.disabled = false;
        scanButton.disabled = false;
        button.textContent = "Browser Test";
    }
}