
from flask import Flask, render_template, request, jsonify
from urllib.parse import urlparse
import ipaddress
import socket
import requests

app = Flask(__name__)

TIMEOUT = (5, 15)
USER_AGENT = "BugHunterAI/1.0"


def validate_url(url):
    if not url:
        return None, "Please enter a website URL."

    if "://" not in url:
        url = "https://" + url

    try:
        parsed = urlparse(url)

        if parsed.scheme not in ("http", "https"):
            return None, "Only HTTP and HTTPS URLs are supported."

        if not parsed.hostname:
            return None, "Please enter a valid website URL."

        if parsed.username or parsed.password:
            return None, "URLs containing credentials are not allowed."

        hostname = parsed.hostname

        if hostname.lower() == "localhost":
            return None, "Local addresses cannot be scanned."

        try:
            addresses = socket.getaddrinfo(
                hostname, None, type=socket.SOCK_STREAM
            )
        except socket.gaierror:
            return None, "Could not resolve the website hostname."

        for address in addresses:
            ip = ipaddress.ip_address(address[4][0])
            if not ip.is_global:
                return None, "Private and local network addresses are not allowed."

        return url, None

    except ValueError:
        return None, "Please enter a valid website URL."


@app.route("/")
def home():
    return render_template("index.html")


@app.route("/scan", methods=["POST"])
def scan():
    data = request.get_json(silent=True) or {}
    url, error = validate_url(data.get("url", "").strip())

    if error:
        return jsonify({
            "success": False,
            "message": error
        }), 400

    try:
        with requests.get(
            url,
            timeout=TIMEOUT,
            headers={"User-Agent": USER_AGENT},
            allow_redirects=False,
            stream=True
        ) as response:

            status = response.status_code
            issues = []

            if 300 <= status < 400:
                issues.append({
                    "severity": "Info",
                    "title": "Redirect response",
                    "details": "The website returned a redirect response."
                })
            elif status >= 500:
                issues.append({
                    "severity": "High",
                    "title": f"Server error: HTTP {status}",
                    "details": "The server returned a 5xx status code."
                })
            elif status >= 400:
                issues.append({
                    "severity": "Medium",
                    "title": f"HTTP error: {status}",
                    "details": "The website returned an HTTP error status."
                })
            elif status < 200:
                issues.append({
                    "severity": "Info",
                    "title": f"Unexpected HTTP status: {status}",
                    "details": "Review the response from the website."
                })

        return jsonify({
            "success": True,
            "url": url,
            "final_url": url,
            "status_code": status,
            "issues": issues,
            "message": (
                "Scan completed. No HTTP status errors detected."
                if not issues
                else "Scan completed. Review the findings."
            )
        })

    except requests.exceptions.Timeout:
        return jsonify({
            "success": False,
            "message": "The website timed out. Please try again."
        }), 504
    except requests.exceptions.SSLError:
        return jsonify({
            "success": False,
            "message": "Secure connection failed. Check the HTTPS certificate."
        }), 400
    except requests.exceptions.ConnectionError:
        return jsonify({
            "success": False,
            "message": "Could not connect to the website. Check the URL or network."
        }), 502
    except requests.exceptions.RequestException:
        return jsonify({
            "success": False,
            "message": "The website request failed."
        }), 502


@app.errorhandler(500)
def internal_error(error):
    app.logger.error("Internal server error: %s", error)
    return jsonify({
        "success": False,
        "message": "An internal server error occurred."
    }), 500


if __name__ == "__main__":
    app.run(debug=True)
