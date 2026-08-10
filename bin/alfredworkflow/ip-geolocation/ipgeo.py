#!/usr/bin/env python3
import ipaddress
import json
import os
import re
import socket
import subprocess
import sys
import tempfile
import time
import urllib.error
import urllib.parse
import urllib.request


IP_GEOLOCATION_API = "http://ip-api.com/json/"
IP_API_FIELDS = "585727"


def env(name, default=""):
    value = os.environ.get(name)
    if value is None or value == "":
        return default
    return value


def language():
    return env("language", "en")


def coordinates_format():
    return env("coordinates_format", "latLon")


def show_ipv6():
    return env("show_ipv6", "0") in {"1", "true", "TRUE", "yes", "YES"}


def cache_dir():
    path = env("alfred_workflow_cache")
    if not path:
        path = os.path.join(tempfile.gettempdir(), "ip-geolocation-alfred")
    os.makedirs(path, exist_ok=True)
    return path


def cache_get(key, ttl):
    path = os.path.join(cache_dir(), key + ".json")
    try:
        if time.time() - os.path.getmtime(path) > ttl:
            return None
        with open(path, "r", encoding="utf-8") as file_obj:
            return json.load(file_obj)
    except (FileNotFoundError, OSError, json.JSONDecodeError):
        return None


def cache_set(key, value):
    path = os.path.join(cache_dir(), key + ".json")
    tmp_path = path + ".tmp"
    with open(tmp_path, "w", encoding="utf-8") as file_obj:
        json.dump(value, file_obj, ensure_ascii=False)
    os.replace(tmp_path, path)


def request_text(url, timeout=5):
    req = urllib.request.Request(url, headers={"User-Agent": "IP-Geolocation-Alfred/1.0"})
    with urllib.request.urlopen(req, timeout=timeout) as response:
        return response.read().decode("utf-8").strip()


def request_json(url, params=None, timeout=6):
    if params:
        url = url + "?" + urllib.parse.urlencode(params)
    req = urllib.request.Request(url, headers={"User-Agent": "IP-Geolocation-Alfred/1.0"})
    with urllib.request.urlopen(req, timeout=timeout) as response:
        return json.loads(response.read().decode("utf-8"))


def public_ip(version):
    key = "public-ipv" + str(version)
    cached = cache_get(key, 3600)
    if cached and cached.get("ip"):
        return cached["ip"]

    url = "https://api.ipify.org" if version == 4 else "https://api6.ipify.org"
    try:
        ip = request_text(url)
    except (urllib.error.URLError, TimeoutError, socket.timeout):
        ip = ""
    if ip:
        cache_set(key, {"ip": ip})
    return ip


def ifconfig_output():
    try:
        return subprocess.check_output(["/sbin/ifconfig"], text=True, timeout=3)
    except (OSError, subprocess.SubprocessError):
        return ""


def local_ipv4():
    for match in re.finditer(r"\binet\s+(\d+\.\d+\.\d+\.\d+)\s+", ifconfig_output()):
        ip = match.group(1)
        if ip != "127.0.0.1" and not ip.startswith("169.254."):
            return ip

    try:
        sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        sock.connect(("8.8.8.8", 80))
        return sock.getsockname()[0]
    except OSError:
        return ""
    finally:
        try:
            sock.close()
        except Exception:
            pass


def local_ipv6():
    current_interface = ""
    for line in ifconfig_output().splitlines():
        if line and not line[0].isspace() and ":" in line:
            current_interface = line.split(":", 1)[0]
            continue
        match = re.search(r"\binet6\s+(\S+)", line)
        if not match:
            continue
        ip = match.group(1)
        if current_interface == "lo0" or ip == "::1":
            continue
        return ip.split("%", 1)[0]
    return ""


def normalize_target(raw_query):
    query = (raw_query or "").strip()
    if not query or ("." not in query and ":" not in query):
        return ""

    if query.startswith(("https://", "http://")):
        parsed = urllib.parse.urlparse(query)
        query = parsed.netloc or parsed.path

    if "/" in query:
        query = query.split("/", 1)[0]

    if query.startswith("[") and "]" in query:
        query = query[1 : query.index("]")]
    elif ":" in query and query.count(":") == 1 and "." in query:
        query = query.split(":", 1)[0]

    if ((query.count(".") == 3 and re.fullmatch(r"[0-9.]+", query)) or query.count(":") >= 2):
        try:
            ipaddress.ip_address(query)
        except ValueError:
            return ""

    return query


def ip_geolocation(target):
    if not target:
        return {"status": "fail"}

    key = "geo-" + re.sub(r"[^A-Za-z0-9_.-]", "_", target + "-" + language() + "-" + coordinates_format())
    cached = cache_get(key, 300)
    if cached:
        return cached

    try:
        data = request_json(
            IP_GEOLOCATION_API + urllib.parse.quote(target, safe=""),
            {"lang": language(), "fields": IP_API_FIELDS},
        )
    except (urllib.error.URLError, TimeoutError, socket.timeout, json.JSONDecodeError):
        data = {"status": "fail"}

    cache_set(key, data)
    return data


def location_text(data):
    parts = [data.get("country", ""), data.get("regionName", ""), data.get("city", "")]
    parts = [part for part in parts if part]
    if data.get("district"):
        parts.append(data["district"])
    location = ", ".join(parts)
    if data.get("zip"):
        location = location + ", ZIP: " + str(data["zip"]) if location else "ZIP: " + str(data["zip"])
    return location


def coordinates_text(data):
    lat = data.get("lat", "")
    lon = data.get("lon", "")
    if coordinates_format() == "lonLat":
        return f"{lon} , {lat}"
    return f"{lat} , {lon}"


def as_number(data):
    value = data.get("as", "")
    return value.split(" ", 1)[0] if value else ""


def readable_geolocation(data, include_ip=True):
    rows = []
    if include_ip:
        rows.append(("IP", str(data.get("query", ""))))
    rows.extend(
        [
            ("Location", location_text(data)),
            ("GeoCoordinates", coordinates_text(data)),
            ("Timezone", str(data.get("timezone", ""))),
            ("AS", as_number(data)),
            ("ISP", str(data.get("isp", ""))),
            ("Organization", str(data.get("org", ""))),
        ]
    )
    return [(key, value) for key, value in rows if value]


def all_json(rows):
    return json.dumps(dict(rows), ensure_ascii=False, indent=2)


def alfred_item(title, subtitle="", arg="", valid=True, icon=None, all_arg=None, uid=None):
    item = {
        "title": title,
        "subtitle": subtitle,
        "arg": arg,
        "valid": valid,
        "text": {"copy": arg, "largetype": arg},
    }
    if uid:
        item["uid"] = uid
    if icon:
        item["icon"] = {"path": icon}
    if all_arg is not None:
        item["mods"] = {"cmd": {"valid": True, "arg": all_arg, "subtitle": "Copy all info"}}
    return item


def output(items):
    print(json.dumps({"items": items}, ensure_ascii=False))


def items_from_rows(rows, icon):
    all_info = all_json(rows)
    return [
        alfred_item(key, value, value, True, icon, all_info, key)
        for key, value in rows
        if value
    ]


def query_items(query):
    target = normalize_target(query)
    if not query.strip():
        return [alfred_item("IP Geolocation", "Type IP address or domain", valid=False, icon="query-ip-geolocation.png")]
    if not target:
        return [alfred_item("Invalid Query", "Enter valid IP address or domain", valid=False, icon="query-ip-geolocation.png")]

    data = ip_geolocation(target)
    if data.get("status") != "success":
        return [alfred_item("No Geolocation Info", target, valid=False, icon="query-ip-geolocation.png")]

    return items_from_rows(readable_geolocation(data, include_ip=True), "query-ip-geolocation.png")


def my_ip_rows():
    rows = [
        ("Local IPv4", local_ipv4()),
    ]
    if show_ipv6():
        rows.append(("Local IPv6", local_ipv6()))

    public4 = public_ip(4)
    public6 = public_ip(6) if show_ipv6() else ""
    rows.append(("Public IPv4", public4))
    if show_ipv6():
        rows.append(("Public IPv6", public6))

    data = ip_geolocation(public4)
    if data.get("status") == "success":
        rows.extend(readable_geolocation(data, include_ip=False))
    return [(key, value) for key, value in rows if value]


def my_items(_query):
    rows = my_ip_rows()
    if not rows:
        return [alfred_item("No Geolocation Info", valid=False, icon="my-ip-geolocation.png")]
    return items_from_rows(rows, "my-ip-geolocation.png")


def copy_ip_items(query):
    candidates = [
        ("Local IPv4", local_ipv4),
        ("Public IPv4", lambda: public_ip(4)),
        ("Local IPv6", local_ipv6),
        ("Public IPv6", lambda: public_ip(6)),
    ]
    query_lower = (query or "").strip().lower()
    filter_by_label = any(token in query_lower for token in ("local", "public", "ipv4", "ipv6"))
    items = []
    for title, resolver in candidates:
        if filter_by_label and query_lower not in title.lower():
            continue
        ip = resolver()
        if not ip:
            continue
        haystack = (title + " " + ip).lower()
        if query_lower and query_lower not in haystack:
            continue
        items.append(alfred_item(title, ip, ip, True, "copy-ip.png", None, title))

    if not items:
        items.append(alfred_item("No IP Found", "Try local, public, ipv4, or ipv6", valid=False, icon="copy-ip.png"))
    return items


def main(mode):
    if len(sys.argv) > 1:
        query = sys.argv[1]
    elif sys.stdin.isatty():
        query = ""
    else:
        query = sys.stdin.read().strip()
    if mode == "query":
        output(query_items(query))
    elif mode == "my":
        output(my_items(query))
    elif mode == "copy":
        output(copy_ip_items(query))
    else:
        output([alfred_item("Invalid Mode", mode, valid=False)])


if __name__ == "__main__":
    main(sys.argv[1] if len(sys.argv) > 1 else "")
