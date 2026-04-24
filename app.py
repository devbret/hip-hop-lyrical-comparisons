import re
import csv
from collections import Counter
from pathlib import Path


INPUT_FILE = "lyrics.txt"
OUTPUT_FILE = "comparison_statements.csv"


def clean_line(line: str) -> str:
    line = line.lower()

    line = line.replace("’", "'")
    line = line.replace("‘", "'")
    line = line.replace("“", '"')
    line = line.replace("”", '"')

    line = re.sub(r"\[.*?\]", " ", line)

    line = re.sub(r"[^a-z0-9\s]", " ", line)

    line = re.sub(r"\s+", " ", line).strip()

    return line


def line_contains_comparison(line: str) -> bool:
    return bool(re.search(r"\b(than|like)\b", line))


def extract_comparison_statements(text: str) -> list[str]:
    comparisons = []

    for raw_line in text.splitlines():
        line = clean_line(raw_line)

        if not line:
            continue

        if line_contains_comparison(line):
            comparisons.append(line)

    return comparisons


def export_counts_to_csv(comparisons: list[str], output_file: str) -> None:
    counts = Counter(comparisons)
    sorted_rows = sorted(counts.items(), key=lambda item: item[0])

    with open(output_file, "w", newline="", encoding="utf-8") as csvfile:
        writer = csv.writer(csvfile)
        writer.writerow(["comparison_statement", "count"])

        for statement, count in sorted_rows:
            writer.writerow([statement, count])


def main() -> None:
    input_path = Path(INPUT_FILE)

    if not input_path.exists():
        raise FileNotFoundError(f"Could not find input file: {INPUT_FILE}")

    text = input_path.read_text(encoding="utf-8", errors="ignore")

    comparisons = extract_comparison_statements(text)

    export_counts_to_csv(comparisons, OUTPUT_FILE)

    print(f"Found {len(comparisons)} total comparison lines.")
    print(f"Found {len(set(comparisons))} unique comparison lines.")
    print(f"Exported alphabetized CSV to: {OUTPUT_FILE}")


if __name__ == "__main__":
    main()