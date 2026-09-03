import json
import re
from datetime import date
from pathlib import Path

import requests
from bs4 import BeautifulSoup

USERNAME = "tejaspratapvp-droid"
URL = f"https://github.com/users/{USERNAME}/contributions"

response = requests.get(
    URL,
    headers={
        "User-Agent": "Mozilla/5.0"
    },
    timeout=30,
)

response.raise_for_status()

soup = BeautifulSoup(response.text, "html.parser")

days = []

for cell in soup.select("td.ContributionCalendar-day[data-date]"):
    day = cell.get("data-date", "")
    level = cell.get("data-level", "0")

    # GitHub may put the contribution count in aria-label
    # or inside a tooltip element.
    text = cell.get("aria-label", "")

    if not text:
        tooltip = cell.find("tool-tip")
        if tooltip:
            text = tooltip.get_text(" ", strip=True)

    match = re.search(r"(\d+)\s+contribution", text, re.IGNORECASE)

    count = int(match.group(1)) if match else 0

    days.append({
        "date": day,
        "count": count,
        "level": int(level or 0),
    })

Path("data").mkdir(exist_ok=True)

output = {
    "username": USERNAME,
    "generated": date.today().isoformat(),
    "days": days,
}

with open("data/contributions.json", "w", encoding="utf-8") as f:
    json.dump(output, f, indent=2)

print(f"Saved {len(days)} contribution days.")s