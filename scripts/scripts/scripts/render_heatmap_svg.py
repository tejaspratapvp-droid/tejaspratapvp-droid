import json
from pathlib import Path

INPUT = Path("data/contributions.json")
OUTPUT = Path("contrib-heatmap.svg")

with open(INPUT, "r", encoding="utf-8") as f:
    data = json.load(f)

days = data.get("days", [])

# Keep the most recent 371 days (53 weeks)
days = days[-371:]

while len(days) < 371:
    days.insert(0, {"date": "", "count": 0, "level": 0})

width = 900
height = 180

cell = 12
gap = 3
start_x = 25
start_y = 55

svg = []

svg.append(
    f'<svg viewBox="0 0 {width} {height}" '
    f'width="{width}" height="{height}" '
    f'role="img">'
)

svg.append(
    '<rect width="100%" height="100%" rx="18" fill="#0d1117"/>'
)

svg.append(
    '<text x="25" y="30" fill="#ffffff" '
    'font-family="monospace" font-size="16" '
    'font-weight="bold">GitHub Contribution Activity</text>'
)

svg.append(
    f'<text x="25" y="47" fill="#8b949e" '
    f'font-family="monospace" font-size="10">'
    f'{data.get("username", "github-user")} • live activity</text>'
)

levels = {
    0: "#161b22",
    1: "#0e4429",
    2: "#006d32",
    3: "#26a641",
    4: "#39d353",
}

for index, day in enumerate(days):
    week = index // 7
    weekday = index % 7

    x = start_x + week * (cell + gap)
    y = start_y + weekday * (cell + gap)

    level = int(day.get("level", 0))
    level = max(0, min(level, 4))

    count = day.get("count", 0)
    date = day.get("date", "")

    svg.append(
        f'<rect x="{x}" y="{y}" width="{cell}" height="{cell}" '
        f'rx="2" fill="{levels[level]}">'
        f'<title>{count} contributions on {date}</title>'
        f'</rect>'
    )

svg.append(
    '<text x="25" y="168" fill="#8b949e" '
    'font-family="monospace" font-size="10">'
    'Less '
    '</text>'
)

for i in range(5):
    x = 55 + i * 18

    svg.append(
        f'<rect x="{x}" y="160" width="12" height="12" '
        f'rx="2" fill="{levels[i]}"/>'
    )

svg.append(
    '<text x="155" y="168" fill="#8b949e" '
    'font-family="monospace" font-size="10">More</text>'
)

svg.append("</svg>")

OUTPUT.write_text("\n".join(svg), encoding="utf-8")

print(f"Generated {OUTPUT}")
