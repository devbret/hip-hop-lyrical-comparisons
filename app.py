import re
import csv
import json
from collections import Counter
from pathlib import Path


INPUT_FILE = "lyrics.txt"

OUTPUT_CSV_FILE = "comparison_statements.csv"
OUTPUT_JSON_FILE = "comparison_dashboard.json"


def clean_line(line: str) -> str:
    line = line.lower()

    line = line.replace("'", "'")
    line = line.replace("'", "'")
    line = line.replace("“", '"')
    line = line.replace("”", '"')

    line = re.sub(r"\[.*?\]", " ", line)
    line = re.sub(r"[^a-z0-9\s]", " ", line)
    line = re.sub(r"\s+", " ", line).strip()

    return line


def line_contains_comparison(line: str) -> bool:
    return bool(re.search(r"\b(than|like)\b", line))


def get_comparison_type(line: str) -> str:
    has_like = bool(re.search(r"\blike\b", line))
    has_than = bool(re.search(r"\bthan\b", line))

    if has_like and has_than:
        return "both"
    if has_like:
        return "like"
    if has_than:
        return "than"

    return "unknown"


def get_marker_context(line: str) -> dict:
    words = line.split()

    for index, word in enumerate(words):
        if word in {"like", "than"}:
            return {
                "first_marker": word,
                "word_before_marker": words[index - 1] if index > 0 else "",
                "word_after_marker": words[index + 1] if index + 1 < len(words) else "",
            }

    return {
        "first_marker": "",
        "word_before_marker": "",
        "word_after_marker": "",
    }


def extract_pattern(line: str) -> str:
    """
    Extracts a compact phrase pattern for easier D3 grouping.

    Examples:
    - "you move like a ghost" -> "like a"
    - "nothing like you" -> "like you"
    - "better than before" -> "better than"
    - "more than enough" -> "more than"
    """

    context = get_marker_context(line)

    marker = context["first_marker"]
    before = context["word_before_marker"]
    after = context["word_after_marker"]

    if marker == "like" and after:
        return f"like {after}"

    if marker == "than" and before:
        return f"{before} than"

    if marker == "than" and after:
        return f"than {after}"

    return ""


def extract_comparison_object(line: str) -> str:
    """
    Extracts everything after the first comparison marker.

    Examples:
    - "you move like a ghost" -> "a ghost"
    - "better than before" -> "before"
    """

    match = re.search(r"\b(like|than)\b\s+(.+)$", line)

    if not match:
        return ""

    return match.group(2).strip()


def extract_than_modifier(line: str) -> str:
    """
    Extracts the word immediately before 'than'.

    Examples:
    - "better than before" -> "better"
    - "more than enough" -> "more"
    - "stronger than you" -> "stronger"

    This is mainly useful for visualizing comparative intensity.
    """

    words = line.split()

    for index, word in enumerate(words):
        if word == "than" and index > 0:
            return words[index - 1]

    return ""


def extract_comparison_statements(text: str) -> list[str]:
    comparisons = []

    for raw_line in text.splitlines():
        line = clean_line(raw_line)

        if not line:
            continue

        if line_contains_comparison(line):
            comparisons.append(line)

    return comparisons


def build_statement_rows(comparisons: list[str]) -> list[dict]:
    counts = Counter(comparisons)

    rows = []

    for statement, count in counts.items():
        context = get_marker_context(statement)

        rows.append({
            "comparison_statement": statement,
            "count": count,
            "comparison_type": get_comparison_type(statement),
            "word_count": len(statement.split()),
            "char_count": len(statement),
            "pattern": extract_pattern(statement),
            "comparison_object": extract_comparison_object(statement),
            "than_modifier": extract_than_modifier(statement),
            "first_marker": context["first_marker"],
            "word_before_marker": context["word_before_marker"],
            "word_after_marker": context["word_after_marker"],
        })

    rows.sort(key=lambda row: (-row["count"], row["comparison_statement"]))

    return rows


def build_pattern_rows(statement_rows: list[dict]) -> list[dict]:
    pattern_counts = Counter()

    for row in statement_rows:
        pattern = row["pattern"]

        if pattern:
            pattern_counts[pattern] += row["count"]

    return [
        {
            "pattern": pattern,
            "count": count,
        }
        for pattern, count in pattern_counts.most_common()
    ]


def build_object_rows(statement_rows: list[dict]) -> list[dict]:
    object_counts = Counter()

    for row in statement_rows:
        comparison_object = row["comparison_object"]

        if comparison_object:
            object_counts[comparison_object] += row["count"]

    return [
        {
            "comparison_object": comparison_object,
            "count": count,
        }
        for comparison_object, count in object_counts.most_common()
    ]


def build_than_modifier_rows(statement_rows: list[dict]) -> list[dict]:
    modifier_counts = Counter()

    for row in statement_rows:
        modifier = row["than_modifier"]

        if modifier:
            modifier_counts[modifier] += row["count"]

    return [
        {
            "than_modifier": modifier,
            "count": count,
        }
        for modifier, count in modifier_counts.most_common()
    ]


def build_word_rows(comparisons: list[str]) -> list[dict]:
    word_counts = Counter()

    for line in comparisons:
        for word in line.split():
            word_counts[word] += 1

    return [
        {
            "word": word,
            "count": count,
        }
        for word, count in word_counts.most_common()
    ]


def build_summary(comparisons: list[str], statement_rows: list[dict]) -> dict:
    type_counts = Counter(row["comparison_type"] for row in statement_rows)

    return {
        "total_comparison_lines": len(comparisons),
        "unique_comparison_lines": len(statement_rows),
        "like_statement_count": type_counts.get("like", 0),
        "than_statement_count": type_counts.get("than", 0),
        "both_statement_count": type_counts.get("both", 0),
        "average_word_count": round(
            sum(row["word_count"] * row["count"] for row in statement_rows) / len(comparisons),
            2
        ) if comparisons else 0,
        "average_char_count": round(
            sum(row["char_count"] * row["count"] for row in statement_rows) / len(comparisons),
            2
        ) if comparisons else 0,
    }


def export_statement_rows_to_csv(statement_rows: list[dict], output_file: str) -> None:
    fieldnames = [
        "comparison_statement",
        "count",
        "comparison_type",
        "word_count",
        "char_count",
        "pattern",
        "comparison_object",
        "than_modifier",
        "first_marker",
        "word_before_marker",
        "word_after_marker",
    ]

    with open(output_file, "w", newline="", encoding="utf-8") as csvfile:
        writer = csv.DictWriter(csvfile, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(statement_rows)


def export_dashboard_json(
    comparisons: list[str],
    statement_rows: list[dict],
    output_file: str
) -> None:
    dashboard_data = {
        "summary": build_summary(comparisons, statement_rows),
        "statements": statement_rows,
        "patterns": build_pattern_rows(statement_rows),
        "comparison_objects": build_object_rows(statement_rows),
        "than_modifiers": build_than_modifier_rows(statement_rows),
        "words": build_word_rows(comparisons),
    }

    with open(output_file, "w", encoding="utf-8") as jsonfile:
        json.dump(dashboard_data, jsonfile, indent=2)


def main() -> None:
    input_path = Path(INPUT_FILE)

    if not input_path.exists():
        raise FileNotFoundError(f"Could not find input file: {INPUT_FILE}")

    text = input_path.read_text(encoding="utf-8", errors="ignore")

    comparisons = extract_comparison_statements(text)
    statement_rows = build_statement_rows(comparisons)

    export_statement_rows_to_csv(statement_rows, OUTPUT_CSV_FILE)
    export_dashboard_json(comparisons, statement_rows, OUTPUT_JSON_FILE)

    print(f"Found {len(comparisons)} total comparison lines.")
    print(f"Found {len(statement_rows)} unique comparison lines.")
    print(f"Exported enriched CSV to: {OUTPUT_CSV_FILE}")
    print(f"Exported dashboard JSON to: {OUTPUT_JSON_FILE}")


if __name__ == "__main__":
    main()