import re

def get_device_name(ua_string):
    """
    Simpler but production-ready User-Agent parser for common devices.
    Returns something like 'Chrome on Windows' or 'Safari on iPhone'.
    """
    if not ua_string:
        return "Unknown Device"
    
    # Identify OS
    if "Windows" in ua_string:
        os = "Windows"
    elif "Macintosh" in ua_string:
        os = "macOS"
    elif "iPhone" in ua_string:
        os = "iPhone"
    elif "iPad" in ua_string:
        os = "iPad"
    elif "Android" in ua_string:
        os = "Android"
    elif "Linux" in ua_string:
        os = "Linux"
    else:
        os = "Unknown OS"

    # Identify Browser
    if "Edg/" in ua_string:
        browser = "Microsoft Edge"
    elif "Chrome" in ua_string and "Safari" in ua_string:
        # Chrome identifies as both Chrome and Safari
        browser = "Chrome"
    elif "Firefox" in ua_string:
        browser = "Firefox"
    elif "Safari" in ua_string and "Chrome" not in ua_string:
        browser = "Safari"
    else:
        browser = "Web Browser"

    return f"{browser} on {os}"
