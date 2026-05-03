# Hip-Hop Lyrical Comparisons

![Screenshot of the Hip-Hop Lyrical Comparisons Dashboard frontend.](https://hosting.photobucket.com/bbcfb0d4-be20-44a0-94dc-65bff8947cf2/7d0ebe4b-faff-4aca-b28b-70dfec2f5a0e.png)

Analyzes song lyrics for comparisons, enriches results with structured metadata and presents them through an interactive D3.js dashboard for exploring repeated phrases, patterns, modifiers, objects, and lyrical imagery.

## Overview

The Python script reads a plain text file of song lyrics, cleans each line and identifies lyrics containing standalone comparisons using words such as "_like_" or "_than_". During preprocessing, the script lowercases text, removes punctuation, normalizes whitespace and preserves each line as its own unit for analysis. It then extracts and enriches each comparison statement with useful metadata, including the comparison type, word count, character count, phrase pattern, comparison object, nearby marker context and any modifier appearing before "_than_". The processed results are exported both as a `.CSV` file for review and `.JSON` file designed for dashboard visualization.

The frontend uses D3.js to turn the generated `.JSON` data into an interactive analysis dashboard. It displays summary cards, takeaways, insight bullets, charts, word visualizations, grouped patterns, statement clusters and an explorer table for reviewing individual lines. Users can filter the dataset by comparison type, phrase pattern, comparison object, "_than_" modifier, search text or selected word from the word cloud. Interactive charts, tooltips, tabs and a detail panel make it easier to explore repeated comparisons, phrase structures, comparison types and imagery across the lyrics.

## Set Up

Below are instructions for installing and running this application on a Linux machine.

### Programs Needed

- [Git](https://git-scm.com/downloads)

- [Python](https://www.python.org/downloads/)

### Steps

1. Install the above programs

2. Open a terminal

3. Clone this repository: `git clone git@github.com:devbret/hip-hop-lyrical-comparisons.git`

4. Navigate to the repo's directory: `cd hip-hop-lyrical-comparisons`

5. Create a virtual environment: `python3 -m venv venv`

6. Activate your virtual environment: `source venv/bin/activate`

7. Place your `.TXT` input file at the root of this repo

8. Edit the value for `INPUT_FILE` on line 8 of `app.py` to match your `.TXT` filename

9. Run `app.py` to process: `python3 app.py`

10. The results will be returned to you at the root of this repo as `.CSV` and `.JSON` files

11. Start a web server to explore the output data: `python3 -m http.server 8000`

12. Launch the frontend by visiting `http://localhost:8000` in a browser

13. Exit the virtual environment: `deactivate`

## Other Considerations

This project repo is intended to demonstrate an ability to do the following:

- Extract text containing standalone comparison words such as "_like_" and "_than_"

- Clean lyrics by lowercasing text, removing punctuation, stripping section labels and normalizing whitespace

- Count repeated comparison statements and export unique enriched results to a reviewable CSV file

- Generate JSON data containing summaries, statement metadata, phrase patterns and comparison objects

- Visualize processed data via an interactive D3.js dashboard with charts, filters, tooltips, grouped clusters and more

If you have any questions or would like to collaborate, please reach out either on GitHub or via [my website](https://bretbernhoft.com/).
