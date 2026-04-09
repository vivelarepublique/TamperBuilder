#!/usr/bin/env python3
import sys
import os
import re
from typing import List, Tuple, Dict, Optional


class RGB:
    def __init__(self, r: int, g: int, b: int):
        self.r = r
        self.g = g
        self.b = b


ThemeEntry = Tuple[str, str]  # (name, value)


def get_target_dir() -> str:
    if len(sys.argv) >= 2:
        return os.path.abspath(sys.argv[1])
    return os.path.abspath("src/assets/svg")


def get_output_path() -> str:
    if len(sys.argv) >= 3:
        return os.path.abspath(sys.argv[2])
    return os.path.abspath("temp/root.css")


def hex_to_rgb(hex_color: str) -> RGB:
    hex_color = hex_color.lstrip("#")
    return RGB(
        r=int(hex_color[0:2], 16), g=int(hex_color[2:4], 16), b=int(hex_color[4:6], 16)
    )


def rgb_to_hex(rgb: RGB) -> str:
    return f"#{rgb.r:02x}{rgb.g:02x}{rgb.b:02x}"


def soften_extreme(value: int, delta: int = 21) -> int:
    if value == 255:
        return value - delta
    if value == 0:
        return value + delta
    return value


def soften_color_extremes(hex_color: str) -> str:
    rgb = hex_to_rgb(hex_color)
    return rgb_to_hex(
        RGB(r=soften_extreme(rgb.r), g=soften_extreme(rgb.g), b=soften_extreme(rgb.b))
    )


def average_colors(colors: List[str]) -> str:
    total_r = total_g = total_b = 0
    n = len(colors)
    for c in colors:
        rgb = hex_to_rgb(c)
        total_r += rgb.r
        total_g += rgb.g
        total_b += rgb.b
    return rgb_to_hex(
        RGB(r=round(total_r / n), g=round(total_g / n), b=round(total_b / n))
    )


def count_frequencies(arr: List[str]) -> Dict[str, int]:
    freq = {}
    for color in arr:
        freq[color] = freq.get(color, 0) + 1
    return freq


def find_most_frequent(colors: List[str]) -> Optional[str]:
    freq = count_frequencies(colors)
    max_count = 0
    dominant = None
    for color, count in freq.items():
        if count > max_count:
            max_count = count
            dominant = color
    return dominant if max_count > 1 else None


def weighted_color_mix(colors: List[str]) -> str:
    freq = count_frequencies(colors)
    total_r = total_g = total_b = 0
    total_count = 0
    for color, count in freq.items():
        rgb = hex_to_rgb(color)
        total_r += rgb.r * count
        total_g += rgb.g * count
        total_b += rgb.b * count
        total_count += count
    return rgb_to_hex(
        RGB(
            r=round(total_r / total_count),
            g=round(total_g / total_count),
            b=round(total_b / total_count),
        )
    )


def darken(hex_color: str, amount: int, limit: int = 21) -> str:
    rgb = hex_to_rgb(hex_color)
    return rgb_to_hex(
        RGB(
            r=max(limit, rgb.r - amount),
            g=max(limit, rgb.g - amount),
            b=max(limit, rgb.b - amount),
        )
    )


def lighten(hex_color: str, amount: int, limit: int = 210) -> str:
    rgb = hex_to_rgb(hex_color)
    return rgb_to_hex(
        RGB(
            r=min(limit, rgb.r + amount),
            g=min(limit, rgb.g + amount),
            b=min(limit, rgb.b + amount),
        )
    )


def generate_css_vars(entries: List[ThemeEntry]) -> str:
    lines = []
    for name, value in entries:
        bg = darken(value, 21)
        border = darken(value, 42)
        shadow = lighten(value, 21) + "84"
        lines.append(f"    --ft-color-{name}: {value};")
        lines.append(f"    --ft-background-color-{name}: {bg};")
        lines.append(f"    --ft-border-color-{name}: {border};")
        lines.append(f"    --ft-shadow-color-{name}: {shadow};")
    return "\n".join(lines)


def extract_colors(target_dir: str, output_path: str) -> None:

    if not os.path.isdir(target_dir):
        sys.exit(1)

    svg_files = [f for f in os.listdir(target_dir) if f.lower().endswith(".svg")]
    if not svg_files:
        return

    results: List[ThemeEntry] = []
    for file in svg_files:
        file_path = os.path.join(target_dir, file)
        with open(file_path, "r", encoding="utf-8") as f:
            content = f.read()

        colors = re.findall(r"#[a-fA-F0-9]{6}", content)
        colors = [c.lower() for c in colors]
        name = os.path.splitext(file)[0]

        if len(colors) == 0:
            results.append((name, "#000000"))
        elif len(colors) == 1:
            results.append((name, soften_color_extremes(colors[0])))
        elif len(colors) <= 4:
            dominant = find_most_frequent(colors)
            if dominant:
                results.append((name, soften_color_extremes(dominant)))
            else:
                results.append((name, soften_color_extremes(average_colors(colors))))
        else:
            results.append((name, soften_color_extremes(weighted_color_mix(colors))))

    css_content = f":root {{\n{generate_css_vars(results)}\n}}\n"

    out_dir = os.path.dirname(output_path)
    if out_dir:
        os.makedirs(out_dir, exist_ok=True)

    with open(output_path, "w", encoding="utf-8") as f:
        f.write(css_content)

    print(f"✅ CSS file has been generated at: {output_path}")


if __name__ == "__main__":
    target = get_target_dir()
    output = get_output_path()
    extract_colors(target, output)
