-- Business rule: all bills are due immediately on purchase — no credit terms.
-- credit_days now means: highlight an unpaid bill as OVERDUE after this many
-- days (a gentle default of 30; late payment is normal, real overdue stands out).
UPDATE customers SET credit_days = 30;
