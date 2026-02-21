"""
Formula Knowledge Base for SheetMind.

Contains patterns for Google Sheets formulas with:
- Intent descriptions (what the user wants to do)
- Correct formula templates
- Examples with real syntax
- Common mistakes and warnings
- When to use vs when NOT to use each formula
"""

from typing import List, Dict, Optional
import re

# ---------------------------------------------------------------------------
# Formula Pattern Database
# ---------------------------------------------------------------------------

FORMULA_PATTERNS: List[Dict] = [
    # ==========================================================================
    # SUMIF - Simple conditional sum
    # ==========================================================================
    {
        "id": "sumif_basic",
        "name": "SUMIF",
        "intent": ["sum by category", "sum where", "total by group", "sum if matches", "sum values for each"],
        "description": "Sum values in one column where another column matches a criteria",
        "template": "=SUMIF(criteria_range, criteria, sum_range)",
        "example": "=SUMIF('{sheet}'!E2:E{lastRow}, A2, '{sheet}'!G2:G{lastRow})",
        "explanation": "Sums column G where column E matches the value in A2",
        "use_when": [
            "Summing a single column based on a condition",
            "Creating grouped totals (sum by category, region, etc.)",
            "The sum_range is a simple column reference"
        ],
        "do_not_use_when": [
            "You need to multiply columns before summing - use SUMPRODUCT instead",
            "You have multiple conditions - use SUMIFS instead",
            "The sum_range contains any arithmetic like A:A*B:B"
        ],
        "warning": "SUMIF sum_range must be a simple range. It CANNOT contain arithmetic operations like A2:A*B2:B",
        "common_mistakes": [
            {
                "wrong": "=SUMIF(E2:E, A2, C2:C*G2:G)",
                "why_wrong": "sum_range cannot contain multiplication",
                "correct": "Use SUMPRODUCT instead: =SUMPRODUCT((E2:E31=A2)*(C2:C31*G2:G31))"
            }
        ]
    },

    # ==========================================================================
    # SUMPRODUCT - Multiply and sum with conditions
    # ==========================================================================
    {
        "id": "sumproduct_multiply_sum",
        "name": "SUMPRODUCT",
        "intent": ["sum of multiplication", "sum product by category", "multiply columns and sum",
                   "sum of A times B", "total of price times quantity", "sum where with calculation",
                   "weighted sum", "sum of calculated values by group"],
        "description": "Multiply columns together and sum the results, optionally with conditions",
        "template": "=SUMPRODUCT((condition_range=criteria)*(value1_range*value2_range))",
        "example": "=SUMPRODUCT(('{sheet}'!E2:E{lastRow}=A2)*('{sheet}'!C2:C{lastRow}*'{sheet}'!G2:G{lastRow}))",
        "explanation": "Multiplies column C by column G, then sums only where column E matches A2",
        "use_when": [
            "Need to multiply two columns before summing (e.g., price * quantity)",
            "Need sum with arithmetic operations on columns",
            "SUMIF would require multiplication in sum_range (which is invalid)",
            "Multiple conditions with calculations"
        ],
        "do_not_use_when": [
            "Simple sum of one column with one condition - use SUMIF (simpler)",
        ],
        "patterns": [
            {
                "case": "Sum of A*B where C equals criteria",
                "formula": "=SUMPRODUCT((C2:C{lastRow}=criteria)*(A2:A{lastRow}*B2:B{lastRow}))"
            },
            {
                "case": "Sum of A*B where C equals X AND D equals Y",
                "formula": "=SUMPRODUCT((C2:C{lastRow}=\"X\")*(D2:D{lastRow}=\"Y\")*(A2:A{lastRow}*B2:B{lastRow}))"
            },
            {
                "case": "Sum of A*B (no condition)",
                "formula": "=SUMPRODUCT(A2:A{lastRow}*B2:B{lastRow})"
            }
        ],
        "warning": None,
        "common_mistakes": []
    },

    # ==========================================================================
    # SUMIFS - Multiple conditions
    # ==========================================================================
    {
        "id": "sumifs_multi",
        "name": "SUMIFS",
        "intent": ["sum with multiple conditions", "sum where A and B", "sum if both match",
                   "sum with two criteria", "sum where and where"],
        "description": "Sum values with multiple conditions (AND logic)",
        "template": "=SUMIFS(sum_range, criteria_range1, criteria1, criteria_range2, criteria2)",
        "example": "=SUMIFS('{sheet}'!G2:G{lastRow}, '{sheet}'!E2:E{lastRow}, A2, '{sheet}'!F2:F{lastRow}, B2)",
        "explanation": "Sums column G where column E matches A2 AND column F matches B2",
        "use_when": [
            "Multiple conditions that must ALL be true",
            "Filtering on two or more columns before summing"
        ],
        "do_not_use_when": [
            "Only one condition - use SUMIF instead",
            "Need to multiply columns - use SUMPRODUCT"
        ],
        "warning": "Like SUMIF, sum_range cannot contain arithmetic",
        "common_mistakes": []
    },

    # ==========================================================================
    # COUNTIF - Count matches
    # ==========================================================================
    {
        "id": "countif_basic",
        "name": "COUNTIF",
        "intent": ["count by category", "count where", "how many", "count if matches",
                   "number of items per group", "count occurrences"],
        "description": "Count cells that match a criteria",
        "template": "=COUNTIF(range, criteria)",
        "example": "=COUNTIF('{sheet}'!E2:E{lastRow}, A2)",
        "explanation": "Counts how many times the value in A2 appears in column E",
        "use_when": [
            "Counting occurrences of a value",
            "Getting count per category"
        ],
        "do_not_use_when": [
            "Multiple conditions - use COUNTIFS"
        ],
        "warning": None,
        "common_mistakes": []
    },

    # ==========================================================================
    # COUNTIFS - Count with multiple conditions
    # ==========================================================================
    {
        "id": "countifs_multi",
        "name": "COUNTIFS",
        "intent": ["count with multiple conditions", "count where A and B", "count if both"],
        "description": "Count cells that match multiple conditions",
        "template": "=COUNTIFS(range1, criteria1, range2, criteria2)",
        "example": "=COUNTIFS('{sheet}'!E2:E{lastRow}, A2, '{sheet}'!F2:F{lastRow}, \">10\")",
        "explanation": "Counts rows where column E matches A2 AND column F is greater than 10",
        "use_when": [
            "Counting with multiple conditions"
        ],
        "do_not_use_when": [
            "Single condition - use COUNTIF"
        ],
        "warning": None,
        "common_mistakes": []
    },

    # ==========================================================================
    # AVERAGEIF - Average with condition
    # ==========================================================================
    {
        "id": "averageif_basic",
        "name": "AVERAGEIF",
        "intent": ["average by category", "average where", "mean by group", "avg if matches"],
        "description": "Calculate average of values where condition matches",
        "template": "=AVERAGEIF(criteria_range, criteria, average_range)",
        "example": "=AVERAGEIF('{sheet}'!E2:E{lastRow}, A2, '{sheet}'!G2:G{lastRow})",
        "explanation": "Averages column G where column E matches A2",
        "use_when": [
            "Average of one column based on a condition",
            "Mean by category"
        ],
        "do_not_use_when": [
            "Need weighted average - use SUMPRODUCT divided by SUMPRODUCT"
        ],
        "warning": "Like SUMIF, average_range cannot contain arithmetic",
        "common_mistakes": []
    },

    # ==========================================================================
    # UNIQUE - Get unique values
    # ==========================================================================
    {
        "id": "unique_basic",
        "name": "UNIQUE",
        "intent": ["get unique values", "distinct values", "list of categories", "unique list",
                   "deduplicate", "remove duplicates from column"],
        "description": "Returns unique values from a range (auto-spills to multiple cells)",
        "template": "=UNIQUE(range)",
        "example": "=UNIQUE('{sheet}'!E2:E{lastRow})",
        "explanation": "Returns all unique values from column E, automatically filling down",
        "use_when": [
            "Getting list of unique categories for grouping",
            "Creating a distinct list from a column"
        ],
        "do_not_use_when": [],
        "warning": "UNIQUE auto-spills! Never use fillDown=true with UNIQUE formulas",
        "common_mistakes": [
            {
                "wrong": "Using fillDown=true with UNIQUE",
                "why_wrong": "UNIQUE automatically fills multiple cells (spill). fillDown overwrites the spilled values causing #REF! error",
                "correct": "Set UNIQUE formula once, it will auto-expand"
            }
        ]
    },

    # ==========================================================================
    # FILTER - Filter rows
    # ==========================================================================
    {
        "id": "filter_basic",
        "name": "FILTER",
        "intent": ["filter rows", "get rows where", "filter data", "extract matching rows"],
        "description": "Returns rows that match a condition (auto-spills)",
        "template": "=FILTER(range, condition)",
        "example": "=FILTER('{sheet}'!A2:G{lastRow}, '{sheet}'!E2:E{lastRow}=\"North\")",
        "explanation": "Returns all rows where column E equals 'North'",
        "use_when": [
            "Extracting subset of data",
            "Getting all rows matching a criteria"
        ],
        "do_not_use_when": [],
        "warning": "FILTER auto-spills! Never use fillDown with FILTER",
        "common_mistakes": []
    },

    # ==========================================================================
    # VLOOKUP - Lookup value
    # ==========================================================================
    {
        "id": "vlookup_basic",
        "name": "VLOOKUP",
        "intent": ["lookup value", "find value", "get value from another table", "vlookup",
                   "match and return"],
        "description": "Look up a value in the first column and return value from another column",
        "template": "=VLOOKUP(search_key, range, index, [is_sorted])",
        "example": "=VLOOKUP(A2, '{sheet}'!A2:G{lastRow}, 3, FALSE)",
        "explanation": "Finds A2 in column A and returns the value from column 3 (C)",
        "use_when": [
            "Looking up a value from a reference table",
            "Getting related data based on a key"
        ],
        "do_not_use_when": [
            "Need to look up based on multiple columns - use INDEX/MATCH or XLOOKUP"
        ],
        "warning": "Always use FALSE for exact match unless data is sorted",
        "common_mistakes": []
    },

    # ==========================================================================
    # MAX/MIN with IF
    # ==========================================================================
    {
        "id": "maxifs_basic",
        "name": "MAXIFS",
        "intent": ["max by category", "maximum where", "highest value per group"],
        "description": "Returns maximum value with conditions",
        "template": "=MAXIFS(max_range, criteria_range, criteria)",
        "example": "=MAXIFS('{sheet}'!G2:G{lastRow}, '{sheet}'!E2:E{lastRow}, A2)",
        "explanation": "Returns maximum of column G where column E matches A2",
        "use_when": ["Finding maximum value within a category"],
        "do_not_use_when": [],
        "warning": None,
        "common_mistakes": []
    },
    {
        "id": "minifs_basic",
        "name": "MINIFS",
        "intent": ["min by category", "minimum where", "lowest value per group"],
        "description": "Returns minimum value with conditions",
        "template": "=MINIFS(min_range, criteria_range, criteria)",
        "example": "=MINIFS('{sheet}'!G2:G{lastRow}, '{sheet}'!E2:E{lastRow}, A2)",
        "explanation": "Returns minimum of column G where column E matches A2",
        "use_when": ["Finding minimum value within a category"],
        "do_not_use_when": [],
        "warning": None,
        "common_mistakes": []
    },

    # ==========================================================================
    # FINANCIAL FORMULAS
    # ==========================================================================
    {
        "id": "pmt_loan",
        "name": "PMT",
        "category": "financial",
        "intent": ["monthly payment", "loan payment", "mortgage payment", "installment",
                   "how much per month", "payment amount", "amortization"],
        "description": "Calculate periodic payment for a loan or annuity with constant payments and interest rate",
        "template": "=PMT(rate_per_period, number_of_periods, present_value)",
        "example": "=PMT(6%/12, 30*12, -300000)",
        "explanation": "Monthly payment for a $300,000 loan at 6% annual for 30 years. Rate is divided by 12 for monthly, periods = years*12",
        "use_when": [
            "Calculating monthly/periodic loan or mortgage payments",
            "Finding annuity payment amounts",
        ],
        "do_not_use_when": [
            "Variable interest rates - PMT assumes constant rate",
        ],
        "warning": "CRITICAL: Annual rate must be divided by periods/year (e.g., 6%/12 for monthly). PMT returns NEGATIVE (cash outflow) - use ABS() or negate PV to get positive result.",
        "common_mistakes": [
            {
                "wrong": "=PMT(6%, 30, 300000)",
                "why_wrong": "Rate not divided by 12, periods not multiplied by 12, PV should be negative for loan",
                "correct": "=PMT(6%/12, 30*12, -300000)"
            }
        ]
    },
    {
        "id": "fv_investment",
        "name": "FV",
        "category": "financial",
        "intent": ["future value", "investment growth", "how much will I have",
                   "savings growth", "compound interest result"],
        "description": "Calculate future value of an investment with periodic payments",
        "template": "=FV(rate_per_period, number_of_periods, payment, [present_value], [type])",
        "example": "=FV(8%/12, 10*12, -500, -10000)",
        "explanation": "Future value after investing $500/month for 10 years at 8% annual, starting with $10,000",
        "use_when": ["Projecting investment growth", "Calculating savings balance after N years"],
        "do_not_use_when": ["Variable contribution amounts"],
        "warning": "Payments and PV should be NEGATIVE (cash outflows). Rate must be per-period.",
        "common_mistakes": []
    },
    {
        "id": "pv_present_value",
        "name": "PV",
        "category": "financial",
        "intent": ["present value", "how much is worth today", "discount cash flows",
                   "current value of future payments"],
        "description": "Calculate present value of future cash flows",
        "template": "=PV(rate_per_period, number_of_periods, payment, [future_value], [type])",
        "example": "=PV(5%/12, 5*12, -200)",
        "explanation": "Present value of receiving $200/month for 5 years at 5% annual discount rate",
        "use_when": ["Determining what future payments are worth today"],
        "do_not_use_when": [],
        "warning": "Rate must be per-period. Payments as negative = cash outflows.",
        "common_mistakes": []
    },
    {
        "id": "npv_cash_flows",
        "name": "NPV",
        "category": "financial",
        "intent": ["net present value", "npv of cash flows", "project valuation",
                   "investment analysis"],
        "description": "Calculate net present value of a series of cash flows",
        "template": "=NPV(discount_rate, cashflow1, cashflow2, ...)",
        "example": "=-50000 + NPV(10%, '{sheet}'!B2:B{lastRow})",
        "explanation": "NPV of cash flows in column B with 10% discount rate, minus initial $50K investment",
        "use_when": ["Evaluating investment profitability", "Comparing project options"],
        "do_not_use_when": [],
        "warning": "NPV assumes cash flows start at END of period 1. Initial investment at time 0 must be added separately: =-investment + NPV(rate, flows).",
        "common_mistakes": [
            {
                "wrong": "=NPV(10%, -50000, 15000, 20000, 25000)",
                "why_wrong": "Initial investment included in NPV discounts it by one period",
                "correct": "=-50000 + NPV(10%, 15000, 20000, 25000)"
            }
        ]
    },
    {
        "id": "irr_return",
        "name": "IRR",
        "category": "financial",
        "intent": ["internal rate of return", "irr", "return rate", "break even rate"],
        "description": "Calculate the internal rate of return for a series of cash flows",
        "template": "=IRR(cashflow_range, [guess])",
        "example": "=IRR('{sheet}'!A2:A{lastRow})",
        "explanation": "IRR of cash flows in column A (first value should be negative initial investment)",
        "use_when": ["Finding the effective return rate of an investment"],
        "do_not_use_when": ["Cash flows change sign multiple times - IRR may give misleading results"],
        "warning": "First cash flow should be negative (investment). IRR returns per-period rate.",
        "common_mistakes": []
    },

    # ==========================================================================
    # ADVANCED LOOKUP FORMULAS
    # ==========================================================================
    {
        "id": "xlookup_basic",
        "name": "XLOOKUP",
        "category": "lookup",
        "intent": ["xlookup", "flexible lookup", "lookup with default", "search any column",
                   "modern lookup", "better vlookup"],
        "description": "Modern lookup that can search any column and return from any column, with not-found default",
        "template": "=XLOOKUP(search_key, lookup_range, result_range, [not_found], [match_mode], [search_mode])",
        "example": "=XLOOKUP(A2, '{sheet}'!C2:C{lastRow}, '{sheet}'!F2:F{lastRow}, \"Not Found\")",
        "explanation": "Looks up A2 in column C and returns the corresponding value from column F. Shows 'Not Found' if no match",
        "use_when": [
            "Any lookup operation - XLOOKUP is the modern recommended approach",
            "Need to search a column that isn't the first column (VLOOKUP limitation)",
            "Want a default value when no match is found",
        ],
        "do_not_use_when": [
            "Simple exact match in first column - VLOOKUP still works fine",
        ],
        "warning": "XLOOKUP is available in Google Sheets. Prefer over VLOOKUP for new formulas.",
        "common_mistakes": []
    },
    {
        "id": "index_match_combo",
        "name": "INDEX+MATCH",
        "category": "lookup",
        "intent": ["index match", "two-way lookup", "lookup from any column",
                   "flexible lookup combo", "row and column lookup"],
        "description": "INDEX+MATCH combo for flexible lookups from any position",
        "template": "=INDEX(result_range, MATCH(search_key, lookup_range, 0))",
        "example": "=INDEX('{sheet}'!F2:F{lastRow}, MATCH(A2, '{sheet}'!C2:C{lastRow}, 0))",
        "explanation": "Finds A2 in column C, returns corresponding row from column F. MATCH returns row position, INDEX returns value",
        "use_when": [
            "Need to lookup from a column that isn't the first column",
            "XLOOKUP not available or you need backward compatibility",
        ],
        "do_not_use_when": [
            "Simple first-column lookup - VLOOKUP is simpler",
        ],
        "warning": "MATCH type must be 0 for exact match. MATCH returns relative position within the range.",
        "common_mistakes": [
            {
                "wrong": "=INDEX(A2:F100, MATCH(\"key\", C2:C100, 0))",
                "why_wrong": "INDEX returns entire row when result_range is multi-column. Specify the column.",
                "correct": "=INDEX(A2:F100, MATCH(\"key\", C2:C100, 0), 6)"
            }
        ]
    },

    # ==========================================================================
    # TEXT/REGEX FORMULAS
    # ==========================================================================
    {
        "id": "regexextract_basic",
        "name": "REGEXEXTRACT",
        "category": "text",
        "intent": ["extract pattern", "regex extract", "pull out", "extract email",
                   "extract number from text", "parse text"],
        "description": "Extract the first match of a regular expression from text",
        "template": "=REGEXEXTRACT(text, regular_expression)",
        "example": "=REGEXEXTRACT(A2, \"[0-9]+\")",
        "explanation": "Extracts the first number found in cell A2",
        "use_when": ["Extracting specific patterns from text", "Parsing structured text"],
        "do_not_use_when": ["Simple substring extraction - use LEFT/RIGHT/MID"],
        "warning": "Returns #N/A if no match found. Wrap in IFERROR for safety.",
        "common_mistakes": []
    },
    {
        "id": "regexmatch_basic",
        "name": "REGEXMATCH",
        "category": "text",
        "intent": ["regex match", "text contains pattern", "validate format",
                   "check if matches", "pattern test"],
        "description": "Tests if text matches a regular expression pattern",
        "template": "=REGEXMATCH(text, regular_expression)",
        "example": "=REGEXMATCH(A2, \"^[A-Za-z0-9.]+@[A-Za-z0-9.]+$\")",
        "explanation": "Checks if A2 contains a valid email-like pattern",
        "use_when": ["Validating text format", "Filtering by pattern"],
        "do_not_use_when": ["Simple text search - use FIND or SEARCH"],
        "warning": None,
        "common_mistakes": []
    },
    {
        "id": "split_text",
        "name": "SPLIT",
        "category": "text",
        "intent": ["split text", "separate by delimiter", "split by comma",
                   "break apart", "text to columns"],
        "description": "Split text into separate cells by delimiter",
        "template": "=SPLIT(text, delimiter, [split_by_each], [remove_empty])",
        "example": "=SPLIT(A2, \",\")",
        "explanation": "Splits text in A2 by commas into separate columns",
        "use_when": ["Breaking delimited text into columns", "Parsing CSV-like data"],
        "do_not_use_when": [],
        "warning": "SPLIT auto-spills horizontally! Never use fillDown with it. Default split_by_each=TRUE splits on each character in delimiter.",
        "common_mistakes": [
            {
                "wrong": "=SPLIT(A2, \", \")",
                "why_wrong": "With default split_by_each=TRUE, this splits on comma AND space separately",
                "correct": "=SPLIT(A2, \", \", FALSE) to treat \", \" as a single delimiter"
            }
        ]
    },
    {
        "id": "textjoin_basic",
        "name": "TEXTJOIN",
        "category": "text",
        "intent": ["join text", "combine cells", "merge text", "concatenate with delimiter",
                   "join with comma"],
        "description": "Join text from multiple cells with a delimiter, optionally ignoring empty cells",
        "template": "=TEXTJOIN(delimiter, ignore_empty, range1, [range2, ...])",
        "example": "=TEXTJOIN(\", \", TRUE, '{sheet}'!A2:A{lastRow})",
        "explanation": "Joins all values in column A with comma+space, skipping empty cells",
        "use_when": ["Combining multiple cells into one", "Creating comma-separated lists"],
        "do_not_use_when": [],
        "warning": "Preferred over CONCATENATE which cannot handle ranges or skip empties.",
        "common_mistakes": []
    },
    {
        "id": "substitute_basic",
        "name": "SUBSTITUTE",
        "category": "text",
        "intent": ["replace text", "substitute", "find and replace in formula",
                   "change text", "swap text"],
        "description": "Replace occurrences of a substring within text",
        "template": "=SUBSTITUTE(text, old_text, new_text, [instance_num])",
        "example": "=SUBSTITUTE(A2, \"old\", \"new\")",
        "explanation": "Replaces all occurrences of 'old' with 'new' in cell A2",
        "use_when": ["Replacing specific text within cells", "Cleaning data"],
        "do_not_use_when": ["Need pattern-based replacement - use REGEXREPLACE"],
        "warning": "Case-sensitive. Chain SUBSTITUTE calls for multiple replacements.",
        "common_mistakes": []
    },

    # ==========================================================================
    # DATE/TIME FORMULAS
    # ==========================================================================
    {
        "id": "networkdays_basic",
        "name": "NETWORKDAYS",
        "category": "date",
        "intent": ["working days", "business days", "weekdays between",
                   "work days count", "exclude weekends"],
        "description": "Count working days between two dates (excludes weekends, optionally holidays)",
        "template": "=NETWORKDAYS(start_date, end_date, [holidays])",
        "example": "=NETWORKDAYS(A2, B2)",
        "explanation": "Counts working days (Mon-Fri) between dates in A2 and B2",
        "use_when": ["Calculating business day counts", "Project timeline planning"],
        "do_not_use_when": ["Need to include weekends - use DAYS or DATEDIF"],
        "warning": None,
        "common_mistakes": []
    },
    {
        "id": "workday_basic",
        "name": "WORKDAY",
        "category": "date",
        "intent": ["add business days", "deadline date", "due date",
                   "N working days from", "skip weekends"],
        "description": "Calculate date that is N working days from a start date",
        "template": "=WORKDAY(start_date, days, [holidays])",
        "example": "=WORKDAY(A2, 10)",
        "explanation": "Date 10 working days after the date in A2",
        "use_when": ["Calculating deadlines in business days", "Scheduling"],
        "do_not_use_when": ["Need calendar days - just add the number directly"],
        "warning": None,
        "common_mistakes": []
    },
    {
        "id": "edate_basic",
        "name": "EDATE",
        "category": "date",
        "intent": ["add months", "months from date", "date plus months",
                   "N months later", "monthly intervals"],
        "description": "Calculate date N months before or after a given date",
        "template": "=EDATE(start_date, months)",
        "example": "=EDATE(A2, 3)",
        "explanation": "Date 3 months after the date in A2",
        "use_when": ["Adding/subtracting months from dates", "Subscription renewals"],
        "do_not_use_when": [],
        "warning": "If the resulting month has fewer days, returns the last day of that month.",
        "common_mistakes": []
    },
    {
        "id": "eomonth_basic",
        "name": "EOMONTH",
        "category": "date",
        "intent": ["end of month", "last day of month", "month end date"],
        "description": "Returns last day of month N months from a date",
        "template": "=EOMONTH(start_date, months)",
        "example": "=EOMONTH(A2, 0)",
        "explanation": "Last day of the same month as A2. Use 1 for next month, -1 for previous",
        "use_when": ["Finding month-end dates", "Financial period boundaries"],
        "do_not_use_when": [],
        "warning": None,
        "common_mistakes": []
    },
    {
        "id": "datedif_basic",
        "name": "DATEDIF",
        "category": "date",
        "intent": ["age calculation", "years between dates", "months between",
                   "days between dates", "duration", "tenure", "time elapsed"],
        "description": "Calculate difference between dates in years, months, or days",
        "template": "=DATEDIF(start_date, end_date, unit)",
        "example": "=DATEDIF(A2, TODAY(), \"Y\")",
        "explanation": "Calculates age in complete years from birth date in A2 to today",
        "use_when": ["Calculating age", "Finding tenure/duration", "Date differences"],
        "do_not_use_when": ["Just need day count - use DAYS() which is simpler"],
        "warning": "DATEDIF is undocumented in Google Sheets but fully functional. Units: \"Y\" (years), \"M\" (months), \"D\" (days), \"YM\" (months ignoring years), \"MD\" (days ignoring months). Start MUST be <= end.",
        "common_mistakes": [
            {
                "wrong": "=DATEDIF(TODAY(), A2, \"Y\")",
                "why_wrong": "Start date (TODAY) is after end date (birth). Arguments are reversed.",
                "correct": "=DATEDIF(A2, TODAY(), \"Y\")"
            }
        ]
    },

    # ==========================================================================
    # ARRAY/LAMBDA FORMULAS
    # ==========================================================================
    {
        "id": "arrayformula_basic",
        "name": "ARRAYFORMULA",
        "category": "array",
        "intent": ["apply to all rows", "array formula", "entire column formula",
                   "formula for every row", "bulk calculate"],
        "description": "Apply a formula to an entire column/range at once instead of row by row",
        "template": "=ARRAYFORMULA(expression_with_ranges)",
        "example": "=ARRAYFORMULA('{sheet}'!B2:B{lastRow} * '{sheet}'!C2:C{lastRow})",
        "explanation": "Multiplies every row in column B by column C, returning results for all rows at once",
        "use_when": [
            "Need same formula applied to every row in a column",
            "Replacing fillDown for simple arithmetic across columns",
        ],
        "do_not_use_when": [
            "Formula only needs to be in one cell",
        ],
        "warning": "ARRAYFORMULA auto-spills! Place in first data row only. Never use fillDown with it.",
        "common_mistakes": [
            {
                "wrong": "Using ARRAYFORMULA with fillDown=true",
                "why_wrong": "ARRAYFORMULA auto-expands to fill all rows. fillDown creates duplicates and errors.",
                "correct": "Set ARRAYFORMULA once in the first cell (e.g., B2). It fills down automatically."
            }
        ]
    },
    {
        "id": "lambda_map_basic",
        "name": "MAP+LAMBDA",
        "category": "array",
        "intent": ["apply function to each", "map over", "transform each cell",
                   "custom function per row", "lambda"],
        "description": "Apply a custom function to each element in a range using MAP and LAMBDA",
        "template": "=MAP(range, LAMBDA(item, expression))",
        "example": "=MAP('{sheet}'!A2:A{lastRow}, LAMBDA(x, IF(x > 100, \"High\", \"Low\")))",
        "explanation": "Applies a custom High/Low classification to every value in column A",
        "use_when": [
            "Need custom logic applied to each cell in a range",
            "ARRAYFORMULA doesn't support the needed function",
        ],
        "do_not_use_when": [
            "Simple arithmetic - ARRAYFORMULA is simpler",
        ],
        "warning": "MAP auto-spills. LAMBDA variable names must be single words (no spaces).",
        "common_mistakes": []
    },
    {
        "id": "let_basic",
        "name": "LET",
        "category": "array",
        "intent": ["define variable", "reuse calculation", "named variable in formula",
                   "clean up formula", "let expression"],
        "description": "Define named variables within a formula for clarity and performance",
        "template": "=LET(name1, value1, [name2, value2, ...], expression)",
        "example": "=LET(sales, '{sheet}'!G2:G{lastRow}, avg, AVERAGE(sales), COUNTIF(sales, \">\"&avg))",
        "explanation": "Defines 'sales' and 'avg' variables, then counts values above average",
        "use_when": [
            "Complex formula references the same calculation multiple times",
            "Improving formula readability",
        ],
        "do_not_use_when": [
            "Simple formulas with no repeated sub-expressions",
        ],
        "warning": "Variable names cannot contain spaces or start with numbers.",
        "common_mistakes": []
    },

    # ==========================================================================
    # CONDITIONAL FORMULAS
    # ==========================================================================
    {
        "id": "ifs_basic",
        "name": "IFS",
        "category": "conditional",
        "intent": ["multiple if conditions", "nested if replacement", "grade scale",
                   "multiple categories", "tiered classification"],
        "description": "Evaluate multiple conditions and return value for the first TRUE condition",
        "template": "=IFS(condition1, value1, condition2, value2, ..., TRUE, default)",
        "example": "=IFS(A2>=90, \"A\", A2>=80, \"B\", A2>=70, \"C\", A2>=60, \"D\", TRUE, \"F\")",
        "explanation": "Assigns letter grades based on score. TRUE as last condition acts as 'else'",
        "use_when": [
            "Multiple conditions to check (replaces nested IF)",
            "Creating grade scales or tiered categories",
        ],
        "do_not_use_when": [
            "Only 2-3 simple conditions - regular IF is fine",
            "Comparing one value against multiple options - use SWITCH",
        ],
        "warning": "Always include TRUE as the last condition for a default/else value. Conditions are evaluated in order - first TRUE wins.",
        "common_mistakes": [
            {
                "wrong": "=IFS(A2>=90, \"A\", A2>=80, \"B\", A2>=70, \"C\")",
                "why_wrong": "No default case - returns #N/A if no condition matches",
                "correct": "=IFS(A2>=90, \"A\", A2>=80, \"B\", A2>=70, \"C\", TRUE, \"Other\")"
            }
        ]
    },
    {
        "id": "switch_basic",
        "name": "SWITCH",
        "category": "conditional",
        "intent": ["switch case", "map value to label", "code to name",
                   "abbreviation to full", "value mapping"],
        "description": "Compare an expression against multiple values and return the matching result",
        "template": "=SWITCH(expression, case1, value1, case2, value2, ..., [default])",
        "example": "=SWITCH(A2, \"N\", \"North\", \"S\", \"South\", \"E\", \"East\", \"W\", \"West\", \"Unknown\")",
        "explanation": "Maps direction codes to full names, with 'Unknown' as default",
        "use_when": [
            "Mapping specific values to other values (like a dictionary)",
            "Replacing nested IF(A2=\"x\", ..., IF(A2=\"y\", ...)) patterns",
        ],
        "do_not_use_when": [
            "Conditions involve ranges/inequalities - use IFS",
        ],
        "warning": "Last argument without a matching case is the default value.",
        "common_mistakes": []
    },
    {
        "id": "iferror_basic",
        "name": "IFERROR",
        "category": "conditional",
        "intent": ["handle error", "error fallback", "if error then", "catch error",
                   "prevent error display"],
        "description": "Return an alternative value if a formula results in an error",
        "template": "=IFERROR(value, value_if_error)",
        "example": "=IFERROR(VLOOKUP(A2, '{sheet}'!B2:C{lastRow}, 2, FALSE), \"Not Found\")",
        "explanation": "Performs VLOOKUP and returns 'Not Found' instead of #N/A if no match",
        "use_when": [
            "Wrapping lookups that might not find a match",
            "Division that might divide by zero",
        ],
        "do_not_use_when": [
            "Only catching #N/A errors - use IFNA instead (lets other errors surface)",
        ],
        "warning": "IFERROR catches ALL errors. Use IFNA if you only expect #N/A from lookups.",
        "common_mistakes": []
    },

    # ==========================================================================
    # STATISTICAL FORMULAS
    # ==========================================================================
    {
        "id": "stdev_basic",
        "name": "STDEV",
        "category": "statistical",
        "intent": ["standard deviation", "stdev", "variation", "spread of data",
                   "how spread out"],
        "description": "Calculate sample standard deviation of a range",
        "template": "=STDEV(range)",
        "example": "=STDEV('{sheet}'!G2:G{lastRow})",
        "explanation": "Sample standard deviation of values in column G",
        "use_when": ["Measuring data spread/variability", "Statistical analysis"],
        "do_not_use_when": ["Have entire population - use STDEVP instead"],
        "warning": "STDEV is for samples (n-1 denominator). Use STDEVP for entire populations.",
        "common_mistakes": []
    },
    {
        "id": "percentile_basic",
        "name": "PERCENTILE",
        "category": "statistical",
        "intent": ["percentile", "top percent", "nth percentile", "quartile",
                   "90th percentile"],
        "description": "Returns the kth percentile of a data set",
        "template": "=PERCENTILE(range, k)",
        "example": "=PERCENTILE('{sheet}'!G2:G{lastRow}, 0.9)",
        "explanation": "90th percentile of values in column G (k=0.9)",
        "use_when": ["Finding percentile boundaries", "Identifying outliers"],
        "do_not_use_when": [],
        "warning": "k must be between 0 and 1 (e.g., 0.25 for 25th percentile, 0.5 for median).",
        "common_mistakes": [
            {
                "wrong": "=PERCENTILE(G2:G100, 90)",
                "why_wrong": "k=90 is out of range. k must be 0 to 1.",
                "correct": "=PERCENTILE(G2:G100, 0.9)"
            }
        ]
    },
    {
        "id": "correl_basic",
        "name": "CORREL",
        "category": "statistical",
        "intent": ["correlation", "relationship between", "how related",
                   "correlation coefficient"],
        "description": "Calculate Pearson correlation coefficient between two data sets",
        "template": "=CORREL(range1, range2)",
        "example": "=CORREL('{sheet}'!C2:C{lastRow}, '{sheet}'!G2:G{lastRow})",
        "explanation": "Correlation between columns C and G. Result: -1 to 1 (0 = no correlation)",
        "use_when": ["Measuring linear relationship between two variables"],
        "do_not_use_when": ["Non-linear relationships"],
        "warning": "Ranges must be same length. Result: 1 = perfect positive, -1 = perfect negative, 0 = none.",
        "common_mistakes": []
    },

    # ==========================================================================
    # WEB/IMPORT FORMULAS
    # ==========================================================================
    {
        "id": "importhtml_basic",
        "name": "IMPORTHTML",
        "category": "web",
        "intent": ["import table from web", "scrape website", "get data from url",
                   "import html table", "web table"],
        "description": "Import a table or list from a web page",
        "template": "=IMPORTHTML(url, query, index)",
        "example": "=IMPORTHTML(\"https://example.com/data\", \"table\", 1)",
        "explanation": "Imports the first HTML table from the given URL",
        "use_when": ["Pulling tabular data from web pages"],
        "do_not_use_when": ["Data is in CSV format - use IMPORTDATA"],
        "warning": "Auto-spills! Refreshes every ~1-2 hours. May break if website changes structure. URL must be publicly accessible.",
        "common_mistakes": []
    },
    {
        "id": "importdata_basic",
        "name": "IMPORTDATA",
        "category": "web",
        "intent": ["import csv", "import tsv", "load external data", "fetch csv from url"],
        "description": "Import data from a URL that returns CSV or TSV format",
        "template": "=IMPORTDATA(url)",
        "example": "=IMPORTDATA(\"https://example.com/data.csv\")",
        "explanation": "Imports CSV data from the URL into the sheet",
        "use_when": ["Importing CSV/TSV data from a URL"],
        "do_not_use_when": ["URL returns HTML - use IMPORTHTML"],
        "warning": "Auto-spills! URL must return plain text CSV/TSV. Has refresh rate limits.",
        "common_mistakes": []
    },

    # ==========================================================================
    # DATABASE FORMULAS
    # ==========================================================================
    {
        "id": "dsum_basic",
        "name": "DSUM",
        "category": "database",
        "intent": ["database sum", "dsum", "sum with criteria range",
                   "sum using criteria cells"],
        "description": "Sum values in a field where records match criteria in a separate range",
        "template": "=DSUM(database, field, criteria)",
        "example": "=DSUM('{sheet}'!A1:G{lastRow}, \"Amount\", I1:J2)",
        "explanation": "Sums 'Amount' column where records match criteria in I1:J2 (header + condition row)",
        "use_when": [
            "Criteria are stored in cells (not hardcoded)",
            "Need complex OR criteria across multiple rows",
        ],
        "do_not_use_when": [
            "Simple conditions - SUMIF/SUMIFS are easier",
        ],
        "warning": "Criteria range must have headers matching database headers exactly. Same row = AND, different rows = OR.",
        "common_mistakes": []
    },
    {
        "id": "dcount_basic",
        "name": "DCOUNT",
        "category": "database",
        "intent": ["database count", "dcount", "count with criteria range"],
        "description": "Count numeric values in a field where records match criteria",
        "template": "=DCOUNT(database, field, criteria)",
        "example": "=DCOUNT('{sheet}'!A1:G{lastRow}, \"Score\", I1:J2)",
        "explanation": "Counts non-empty numeric values in 'Score' column matching criteria in I1:J2",
        "use_when": ["Count with criteria stored in cells"],
        "do_not_use_when": ["Simple conditions - COUNTIF/COUNTIFS are easier"],
        "warning": "DCOUNT counts only numeric values. Use DCOUNTA to count all non-empty values.",
        "common_mistakes": []
    },

    # ==========================================================================
    # SORT/SORTN
    # ==========================================================================
    {
        "id": "sort_formula",
        "name": "SORT",
        "category": "array",
        "intent": ["sort data", "sort range", "order by", "sort formula",
                   "sort ascending", "sort descending"],
        "description": "Sort a range by one or more columns",
        "template": "=SORT(range, sort_column, is_ascending, [sort_column2, is_ascending2, ...])",
        "example": "=SORT('{sheet}'!A2:G{lastRow}, 7, FALSE)",
        "explanation": "Sorts all data by column 7 (G) in descending order",
        "use_when": ["Creating a sorted view of data", "Ranking items"],
        "do_not_use_when": [],
        "warning": "SORT auto-spills! sort_column is relative to the range (1 = first column of range).",
        "common_mistakes": []
    },
]


# ---------------------------------------------------------------------------
# Lookup Functions
# ---------------------------------------------------------------------------

def find_formula_pattern(query: str) -> List[Dict]:
    """
    Find formula patterns that match the user's intent.

    Args:
        query: User's description of what they want to do

    Returns:
        List of matching formula patterns, ranked by relevance
    """
    query_lower = query.lower()
    results = []

    for pattern in FORMULA_PATTERNS:
        score = 0

        # Check intent keywords
        for intent in pattern.get("intent", []):
            if intent.lower() in query_lower:
                score += 10
            # Partial match
            intent_words = intent.lower().split()
            matching_words = sum(1 for w in intent_words if w in query_lower)
            score += matching_words * 2

        # Check formula name (support compound names like "INDEX+MATCH")
        name_lower = pattern["name"].lower()
        if name_lower in query_lower:
            score += 5
        # Also check individual parts of compound names
        for part in name_lower.split("+"):
            if part in query_lower:
                score += 3

        # Check description
        desc_words = pattern.get("description", "").lower().split()
        matching_desc = sum(1 for w in desc_words if w in query_lower)
        score += matching_desc

        # Check category field for broader matching
        category = pattern.get("category", "").lower()
        if category and category in query_lower:
            score += 3

        # Special boost for SUMPRODUCT when multiplication is mentioned
        if "multiply" in query_lower or "product" in query_lower or "*" in query_lower:
            if pattern["name"] == "SUMPRODUCT":
                score += 15

        # Special boost for grouped operations
        if ("by" in query_lower or "group" in query_lower or "category" in query_lower):
            if pattern["name"] in ["SUMIF", "COUNTIF", "AVERAGEIF", "SUMPRODUCT"]:
                score += 5

        # Boost financial formulas for financial queries
        if any(w in query_lower for w in ["loan", "mortgage", "payment", "interest", "investment"]):
            if pattern.get("category") == "financial":
                score += 5

        # Boost lookup formulas for lookup queries
        if any(w in query_lower for w in ["lookup", "find value", "search for", "cross-reference"]):
            if pattern.get("category") == "lookup":
                score += 5

        if score > 0:
            results.append({
                "pattern": pattern,
                "score": score
            })

    # Sort by score descending
    results.sort(key=lambda x: x["score"], reverse=True)

    return [r["pattern"] for r in results[:3]]  # Return top 3 matches


def get_formula_for_intent(intent: str, sheet_name: str, last_row: int) -> Dict:
    """
    Get the best formula pattern for a given intent with filled-in values.

    Args:
        intent: What the user wants to do
        sheet_name: Name of the source sheet
        last_row: Last row with data

    Returns:
        Dict with formula recommendation
    """
    patterns = find_formula_pattern(intent)

    if not patterns:
        return {
            "found": False,
            "message": "No matching formula pattern found. Please describe what you want to calculate."
        }

    best = patterns[0]

    # Fill in template values
    example = best.get("example", best.get("template", ""))
    example = example.replace("{sheet}", sheet_name)
    example = example.replace("{lastRow}", str(last_row))

    result = {
        "found": True,
        "formula_name": best["name"],
        "description": best["description"],
        "template": best["template"],
        "example": example,
        "use_when": best.get("use_when", []),
        "do_not_use_when": best.get("do_not_use_when", []),
    }

    if best.get("warning"):
        result["warning"] = best["warning"]

    if best.get("common_mistakes"):
        result["common_mistakes"] = best["common_mistakes"]

    if best.get("patterns"):
        result["additional_patterns"] = best["patterns"]

    # If there are alternatives, mention them
    if len(patterns) > 1:
        result["alternatives"] = [p["name"] for p in patterns[1:]]

    return result


def format_pattern_for_prompt(pattern: Dict) -> str:
    """Format a formula pattern for inclusion in the agent prompt."""
    lines = [
        f"**{pattern['name']}**",
        f"Description: {pattern['description']}",
        f"Template: {pattern['template']}",
        f"Example: {pattern.get('example', 'N/A')}",
    ]

    if pattern.get("use_when"):
        lines.append("Use when: " + "; ".join(pattern["use_when"][:2]))

    if pattern.get("do_not_use_when"):
        lines.append("Do NOT use when: " + "; ".join(pattern["do_not_use_when"][:2]))

    if pattern.get("warning"):
        lines.append(f"WARNING: {pattern['warning']}")

    return "\n".join(lines)


def get_all_patterns_summary() -> str:
    """Get a summary of all formula patterns for the prompt."""
    summaries = []
    for p in FORMULA_PATTERNS:
        intent_str = ", ".join(p.get("intent", [])[:3])
        summaries.append(f"- {p['name']}: {intent_str}")
    return "\n".join(summaries)
