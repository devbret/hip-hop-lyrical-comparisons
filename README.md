# Hip-Hop Lyrical Comparisons

Analyzes song lyrics to find, count and export unique comparison-based lines containing either "than" or "like".

## Overview

Reads a text file of song lyrics, cleans each line and searches for lines containing comparison words. Specifically, this application looks for the standalone words "than" or "like", which are commonly used in comparison statements. While cleaning the lyrics, it lowercases the text, removes punctuation, strips out section labels, normalizes whitespace and preserves each line as its own separate unit.

After identifying the comparison lines, the app counts how many times each unique comparison statement appears. It then exports the results to a CSV file called `comparison_statements.csv`, with one row per unique comparison statement and a count showing how often it occurred. Finally, it prints a short summary showing the total number of comparison lines found, the number of unique comparison lines and the location of the generated CSV file.
