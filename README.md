# Hip-Hop Lyrical Comparisons

![Screenshot of the Hip-Hop Lyrical Comparisons Dashboard frontend.](https://hosting.photobucket.com/bbcfb0d4-be20-44a0-94dc-65bff8947cf2/7d0ebe4b-faff-4aca-b28b-70dfec2f5a0e.png)

Analyzes song lyrics to find, count and export unique comparison-based lines containing either "than" or "like".

## Overview

Reads a text file of song lyrics, cleans each line and searches for lines containing comparison words. Specifically, this application looks for the standalone words "than" or "like", which are commonly used in comparison statements. While cleaning the lyrics, it lowercases the text, removes punctuation, strips out section labels, normalizes whitespace and preserves each line as its own separate unit.

After identifying the comparison lines, the app counts how many times each unique comparison statement appears. It then exports the results to a CSV file called `comparison_statements.csv`, with one row per unique comparison statement and a count showing how often it occurred. Finally, it prints a short summary showing the total number of comparison lines found, the number of unique comparison lines and the location of the generated CSV file.

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

7. Place your `.TXT` file at the root of this repo

8. Edit the value for `INPUT_FILE` on line 7 of `app.py` to match your input `.TXT` filename

9. Run `app.py` to process: `python3 app.py`

10. The results will be returned to you at the root of this repo as a `.CSV` file

11. Exit the virtual environment: `deactivate`

## Other Considerations

This project repo is intended to demonstrate an ability to do the following:

- Extract lyric lines containing standalone comparison words such as "than" and "like"

- Clean and normalize input text by lowercasing, removing punctuation, stripping section labels and preserving line-by-line structure

- Count repeated comparison statements and export the unique results with totals to an alphabetized CSV file

If you have any questions or would like to collaborate, please reach out either on GitHub or via [my website](https://bretbernhoft.com/).
