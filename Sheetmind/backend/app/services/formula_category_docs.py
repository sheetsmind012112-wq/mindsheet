"""
Formula Category Documentation for SheetMind.

Provides:
- Category keyword mapping for intent classification
- Detailed documentation per formula category
- Mini cheat sheet of ALL Google Sheets functions
- Helper functions for dynamic prompt injection
"""

from typing import List

# ---------------------------------------------------------------------------
# Category Keywords — trigger words that map to formula categories
# ---------------------------------------------------------------------------

CATEGORY_KEYWORDS = {
    "financial": [
        "loan", "payment", "mortgage", "interest", "investment", "depreciation",
        "annuity", "pmt", "fv", "npv", "irr", "rate", "nper", "amortization",
        "compound", "principal", "installment", "lease", "bond", "yield",
    ],
    "lookup": [
        "lookup", "vlookup", "xlookup", "find value", "search for",
        "match and return", "cross-reference", "index match", "hlookup",
        "pull from", "get from another",
    ],
    "date": [
        "date", "days between", "months", "weekday", "holiday", "workday",
        "network days", "business days", "deadline", "duration", "edate",
        "eomonth", "datedif", "calculate age", "age of", "tenure", "elapsed",
    ],
    "text": [
        "text", "string", "extract", "regex", "split", "join", "concatenate",
        "replace", "clean", "trim", "upper", "lower", "substring", "parse",
        "email", "phone number", "pattern",
    ],
    "aggregation": [
        "sum", "count", "average", "total", "group by", "aggregate",
        "summarize", "by category", "per region", "subtotal",
    ],
    "array": [
        "array", "lambda", "map", "reduce", "spill", "dynamic array",
        "arrayformula", "byrow", "bycol", "sequence", "flatten",
        "each row", "apply to all",
    ],
    "statistical": [
        "standard deviation", "stdev", "variance", "correlation", "percentile",
        "forecast", "trend", "regression", "probability", "distribution",
        "confidence", "median", "quartile",
    ],
    "conditional": [
        "if then", "switch", "choose", "ifs", "nested if", "conditional",
        "case when", "multiple conditions", "either or",
    ],
    "web": [
        "import", "web", "html", "xml", "url", "fetch", "importhtml",
        "importdata", "importxml", "scrape", "external data",
    ],
    "database": [
        "dsum", "dcount", "dget", "daverage", "database function",
        "dmax", "dmin", "criteria range",
    ],
    "info": [
        "blank", "empty", "error", "type check", "is number", "is text",
        "validate cell", "isblank", "iserror", "check if",
    ],
}

# ---------------------------------------------------------------------------
# Category Documentation — detailed guidance per category
# ---------------------------------------------------------------------------

CATEGORY_DOCS = {
    "financial": """=== FINANCIAL FORMULAS ===
PMT(rate, nper, pv, [fv], [type]) — periodic payment for a loan/annuity.
  CRITICAL: rate must be per-period! For monthly payments at 6% annual: rate=6%/12, nper=years*12.
  Result is NEGATIVE (cash outflow). Use -PMT(...) or ABS(PMT(...)) for positive display.
FV(rate, nper, pmt, [pv], [type]) — future value of investment/loan.
PV(rate, nper, pmt, [fv], [type]) — present value.
NPV(rate, value1, [value2, ...]) — net present value of cash flows.
  NOTE: NPV assumes cash flows start at END of period 1. For initial investment at time 0: =-investment + NPV(rate, cf1, cf2, ...).
IRR(cashflow_range, [guess]) — internal rate of return. First value should be negative (initial investment).
RATE(nper, pmt, pv, [fv], [type], [guess]) — interest rate per period.
NPER(rate, pmt, pv, [fv], [type]) — number of periods to pay off loan.
SLN(cost, salvage, life) — straight-line depreciation per period.
DDB(cost, salvage, life, period, [factor]) — double-declining balance depreciation.
Common mistakes: forgetting to divide annual rate by 12 for monthly, wrong sign conventions.""",

    "lookup": """=== LOOKUP FORMULAS ===
XLOOKUP(search_key, lookup_range, result_range, [not_found], [match_mode], [search_mode])
  RECOMMENDED over VLOOKUP: searches any column, returns any column, has built-in not_found default.
  Example: =XLOOKUP(A2, Products!A:A, Products!C:C, "Not Found")
VLOOKUP(search_key, range, index, [is_sorted]) — classic vertical lookup.
  LIMITATION: search key must be in first column of range. Always use FALSE for exact match.
INDEX(range, row, [column]) + MATCH(key, range, [type]) — powerful combo.
  Example: =INDEX(B2:B100, MATCH(A2, D2:D100, 0)) — looks up A2 in column D, returns from column B.
HLOOKUP(key, range, index, [is_sorted]) — horizontal lookup (searches first row).
OFFSET(reference, rows, cols, [height], [width]) — returns a reference offset from a cell.
INDIRECT(ref_string, [a1_notation]) — converts text string to cell reference.
  WARNING: INDIRECT is volatile (recalculates on every edit). Avoid in large sheets.""",

    "date": """=== DATE/TIME FORMULAS ===
NETWORKDAYS(start, end, [holidays]) — working days between dates (excludes weekends).
WORKDAY(start, days, [holidays]) — date after N working days.
EDATE(start, months) — date N months before/after start.
EOMONTH(start, months) — last day of month N months from start.
DATEDIF(start, end, unit) — difference between dates. Units: "Y" (years), "M" (months), "D" (days), "YM" (months ignoring years), "MD" (days ignoring months/years).
  NOTE: DATEDIF is undocumented but works. start must be <= end.
WEEKDAY(date, [type]) — day of week (1=Sunday by default). Type 2: 1=Monday.
TEXT(date, format) — format date as text. Example: =TEXT(A2, "MMMM YYYY") for "January 2024".
DAYS(end, start) — simple day count between dates (note: end comes first!).
ISOWEEKNUM(date) — ISO week number of the year.
Common mistakes: wrong date format (use DATE(y,m,d) to construct), DATEDIF argument order.""",

    "text": """=== TEXT/REGEX FORMULAS ===
REGEXMATCH(text, regex) — returns TRUE/FALSE if text matches regex pattern.
REGEXEXTRACT(text, regex) — extracts first match of regex from text.
  Example: =REGEXEXTRACT(A2, "[A-Za-z0-9.]+@[A-Za-z0-9.]+") extracts email.
REGEXREPLACE(text, regex, replacement) — replaces regex matches.
SPLIT(text, delimiter, [split_by_each], [remove_empty]) — splits text into columns.
  split_by_each=FALSE treats delimiter as whole string (default TRUE splits by each character!).
TEXTJOIN(delimiter, ignore_empty, range1, ...) — joins text with delimiter.
  Better than CONCATENATE: handles ranges and has ignore_empty option.
SUBSTITUTE(text, old, new, [instance]) — replaces text. Chain for multiple replacements:
  =SUBSTITUTE(SUBSTITUTE(A2, "old1", "new1"), "old2", "new2")
LEFT(text, n) / RIGHT(text, n) / MID(text, start, n) — extract substrings.
TRIM(text) — removes leading/trailing spaces and extra internal spaces.
CLEAN(text) — removes non-printable characters.
Common mistakes: SPLIT auto-spills — don't use fillDown with it.""",

    "aggregation": """=== AGGREGATION FORMULAS ===
(See detailed patterns via lookup_formula tool for SUMIF, SUMPRODUCT, COUNTIF, etc.)
Key reminders:
- SUMIF sum_range CANNOT contain arithmetic. Use SUMPRODUCT for calculated sums.
- SUMIFS/COUNTIFS/AVERAGEIFS support multiple criteria (AND logic).
- For OR logic across criteria, use: =SUMPRODUCT((crit1+crit2>0)*values)
- MAXIFS/MINIFS — max/min with conditions (like SUMIFS but for max/min).""",

    "array": """=== ARRAY/LAMBDA FORMULAS ===
ARRAYFORMULA(expression) — applies formula to entire column/range at once.
  Example: =ARRAYFORMULA(B2:B*C2:C) multiplies every row in B by C.
  NOTE: only one ARRAYFORMULA needed per column. Auto-spills results.
MAP(array, LAMBDA(item, expression)) — applies function to each element.
  Example: =MAP(A2:A, LAMBDA(x, IF(x>100, "High", "Low")))
LAMBDA(params..., expression) — creates reusable function.
  Example with LET: =LET(data, A2:A100, avg, AVERAGE(data), MAP(data, LAMBDA(x, x-avg)))
REDUCE(initial, array, LAMBDA(acc, item, expression)) — reduces array to single value.
BYROW(array, LAMBDA(row, expression)) — applies function to each row.
BYCOL(array, LAMBDA(col, expression)) — applies function to each column.
MAKEARRAY(rows, cols, LAMBDA(r, c, expression)) — creates array from function.
LET(name1, value1, ..., expression) — defines named variables for cleaner formulas.
  Example: =LET(sales, B2:B100, target, 1000, COUNTIF(sales, ">"&target))
SEQUENCE(rows, [cols], [start], [step]) — generates number sequence.
WARNING: Array formulas auto-spill! Never use fillDown with them.""",

    "statistical": """=== STATISTICAL FORMULAS ===
STDEV(range) / STDEVP(range) — sample / population standard deviation.
VAR(range) / VARP(range) — sample / population variance.
CORREL(range1, range2) — Pearson correlation coefficient (-1 to 1).
PERCENTILE(range, k) — kth percentile (k between 0 and 1). Use 0.5 for median.
PERCENTRANK(range, value, [significance]) — rank of value as percentage.
FORECAST(x, known_y, known_x) — linear regression prediction for x.
TREND(known_y, [known_x], [new_x], [const]) — linear trend values. Auto-spills.
GROWTH(known_y, [known_x], [new_x], [const]) — exponential growth values.
MEDIAN(range) — middle value.
LARGE(range, k) / SMALL(range, k) — kth largest/smallest value.
RANK(value, range, [order]) — rank of value in range (1=highest by default).""",

    "conditional": """=== CONDITIONAL FORMULAS ===
IFS(condition1, value1, condition2, value2, ...) — modern replacement for nested IF.
  Example: =IFS(A2>=90, "A", A2>=80, "B", A2>=70, "C", TRUE, "F")
  NOTE: use TRUE as last condition for default/else case.
SWITCH(expression, case1, value1, case2, value2, ..., [default])
  Example: =SWITCH(A2, "N", "North", "S", "South", "E", "East", "Unknown")
  Cleaner than IFS when comparing one value against multiple options.
IFERROR(value, value_if_error) — returns alternative if formula errors.
  Common: =IFERROR(VLOOKUP(...), "Not Found")
IFNA(value, value_if_na) — like IFERROR but only catches #N/A errors.
  Prefer IFNA over IFERROR when you only expect #N/A (lets other errors surface).
IF(condition, true_val, false_val) — basic conditional.
  Avoid deeply nested IFs — use IFS or SWITCH instead.""",

    "web": """=== WEB/IMPORT FORMULAS ===
IMPORTHTML(url, query, index) — imports table or list from web page.
  query: "table" or "list". index: 1-based (which table/list on the page).
  Example: =IMPORTHTML("https://example.com/data", "table", 1)
IMPORTXML(url, xpath) — imports data using XPath query.
  Example: =IMPORTXML("https://example.com", "//h1")
IMPORTDATA(url) — imports CSV/TSV data from a URL.
  The URL must return plain text CSV/TSV.
IMPORTRANGE(spreadsheet_url, range_string) — imports range from another Google Sheet.
  First use requires permission grant. Example: =IMPORTRANGE("spreadsheet_key", "Sheet1!A1:C10")
IMAGE(url, [mode], [height], [width]) — inserts image from URL into cell.
HYPERLINK(url, [link_label]) — creates clickable link.
WARNING: IMPORT functions have refresh limits (~1-2 hours). They may return stale data.
IMPORTHTML/IMPORTXML may break if the website structure changes.""",

    "database": """=== DATABASE FORMULAS ===
Database functions use a criteria range (separate cells with header + condition rows).
DSUM(database, field, criteria) — sum of field column where criteria match.
DCOUNT(database, field, criteria) — count matching records.
DGET(database, field, criteria) — returns single value (errors if multiple matches).
DAVERAGE(database, field, criteria) — average of matching records.
DMAX(database, field, criteria) / DMIN(database, field, criteria) — max/min of matches.
DPRODUCT(database, field, criteria) — product of matching values.

Criteria range format:
  Row 1: column headers (must match database headers exactly)
  Row 2+: conditions (same row = AND, different rows = OR)
  Example criteria in H1:I2: | Status | Amount | then H2:I2: | Active | >100 |

NOTE: SUMIFS/COUNTIFS are usually simpler. Use D-functions when you need
complex OR criteria or criteria stored in cells.""",

    "info": """=== INFO/ERROR-HANDLING FORMULAS ===
IFERROR(value, value_if_error) — catches ANY error, returns alternative.
IFNA(value, value_if_na) — catches only #N/A errors. Preferred for lookups.
ISBLANK(cell) — TRUE if cell is empty.
ISERROR(value) — TRUE if value is any error type.
ISNA(value) — TRUE if value is #N/A.
ISNUMBER(value) — TRUE if value is a number.
ISTEXT(value) — TRUE if value is text.
ISFORMULA(cell) — TRUE if cell contains a formula.
TYPE(value) — returns type code: 1=number, 2=text, 4=boolean, 16=error, 64=array.
ERROR.TYPE(value) — returns error type number (1=#NULL!, 2=#DIV/0!, etc.).
N(value) — converts value to number (text->0, TRUE->1, FALSE->0).
Common pattern: =IF(ISBLANK(A2), "No data", A2) to handle empty cells.""",
}

# ---------------------------------------------------------------------------
# Mini Cheat Sheet — compact reference of ALL Google Sheets functions
# ---------------------------------------------------------------------------

MINI_CHEAT_SHEET = """=== GOOGLE SHEETS FORMULA QUICK REFERENCE ===
MATH: SUM, SUMIF, SUMIFS, SUMPRODUCT, AVERAGE, AVERAGEIF, AVERAGEIFS, COUNT, COUNTA, COUNTBLANK, COUNTIF, COUNTIFS, MAX, MAXIFS, MIN, MINIFS, ABS, ROUND, ROUNDUP, ROUNDDOWN, INT, MOD, POWER, SQRT, PRODUCT, MEDIAN, LARGE, SMALL, RANK, PERCENTILE, RAND, RANDBETWEEN, CEILING, FLOOR, LOG, LOG10, LN, EXP, SIGN, TRUNC
LOOKUP: VLOOKUP, HLOOKUP, XLOOKUP, INDEX, MATCH, OFFSET, INDIRECT, ADDRESS, ROW, COLUMN, ROWS, COLUMNS, CHOOSE
TEXT: LEFT, RIGHT, MID, LEN, TRIM, CLEAN, UPPER, LOWER, PROPER, SUBSTITUTE, REPLACE, FIND, SEARCH, CONCATENATE, TEXTJOIN, TEXT, VALUE, SPLIT, JOIN, REPT, EXACT, CHAR, CODE, REGEXMATCH, REGEXEXTRACT, REGEXREPLACE
DATE: TODAY, NOW, DATE, YEAR, MONTH, DAY, HOUR, MINUTE, SECOND, DATEVALUE, DATEDIF, EDATE, EOMONTH, WEEKDAY, WEEKNUM, ISOWEEKNUM, NETWORKDAYS, WORKDAY, DAYS, TIME, TIMEVALUE
LOGICAL: IF, IFS, AND, OR, NOT, XOR, IFERROR, IFNA, SWITCH, TRUE, FALSE
ARRAY: UNIQUE, FILTER, SORT, SORTN, SEQUENCE, ARRAYFORMULA, FLATTEN, TRANSPOSE, MAP, LAMBDA, REDUCE, BYROW, BYCOL, MAKEARRAY, LET, SCAN, HSTACK, VSTACK, TOROW, TOCOL, WRAPCOLS, WRAPROWS, CHOOSEROWS, CHOOSECOLS
FINANCIAL: PMT, FV, PV, NPV, IRR, RATE, NPER, SLN, DDB, DB
STATISTICAL: STDEV, STDEVP, VAR, VARP, CORREL, FORECAST, TREND, GROWTH, PERCENTRANK, RANK, MEDIAN, LARGE, SMALL
WEB/IMPORT: IMPORTHTML, IMPORTXML, IMPORTDATA, IMPORTRANGE, IMAGE, HYPERLINK
DATABASE: DSUM, DCOUNT, DCOUNTA, DGET, DAVERAGE, DMAX, DMIN, DPRODUCT, DSTDEV, DVAR
INFO: ISBLANK, ISERROR, ISNA, ISNUMBER, ISTEXT, ISFORMULA, TYPE, CELL, N, ERROR.TYPE
OTHER: QUERY, SPARKLINE, REGEXMATCH
Use lookup_formula for detailed patterns. For categories not in patterns, apply formulas using the syntax above."""


# ---------------------------------------------------------------------------
# Helper Functions
# ---------------------------------------------------------------------------

def classify_formula_intent(message: str) -> List[str]:
    """
    Classify a user message into formula categories based on keyword matching.

    Args:
        message: The user's chat message

    Returns:
        List of matching category names (may be empty)
    """
    message_lower = message.lower()
    matched = []

    for category, keywords in CATEGORY_KEYWORDS.items():
        for keyword in keywords:
            if keyword in message_lower:
                matched.append(category)
                break  # One match per category is enough

    return matched


def get_category_docs(categories: List[str]) -> str:
    """
    Get combined documentation for the given categories.

    Args:
        categories: List of category names from classify_formula_intent()

    Returns:
        Combined documentation string, or empty string if no categories
    """
    if not categories:
        return ""

    docs_parts = []
    for cat in categories:
        doc = CATEGORY_DOCS.get(cat)
        if doc:
            docs_parts.append(doc)

    if not docs_parts:
        return ""

    return "RELEVANT FORMULA GUIDANCE FOR THIS QUERY:\n" + "\n\n".join(docs_parts)


def get_mini_cheat_sheet() -> str:
    """Return the mini cheat sheet string."""
    return MINI_CHEAT_SHEET
