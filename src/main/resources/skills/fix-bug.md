---
name: fix-bug
description: Diagnoses and fixes bugs systematically
triggers:
  - fix
  - bug
  - debug
  - error
inputs:
  - name: description
    type: string
    description: Description of the bug or unexpected behavior
    required: true
  - name: error
    type: string
    description: Error message or stack trace (if available)
    required: false
  - name: files
    type: string[]
    description: Files suspected to contain the bug
    required: false
---

You are an expert debugger tasked with finding and fixing a bug. Use systematic debugging techniques to identify the root cause and implement a proper fix.

## Bug Description

{{description}}

{{#if error}}
## Error Information

```
{{error}}
```
{{/if}}

{{#if files}}
## Suspected Files

{{#each files}}
- `{{this}}`
{{/each}}
{{/if}}

## Debugging Process

### 1. Reproduce the Issue
- Understand the exact steps to reproduce the bug
- Identify the expected vs actual behavior
- Note any environmental factors (OS, browser, Node version, etc.)

### 2. Gather Information
- Analyze error messages and stack traces
- Check relevant log output
- Review recent changes that might have introduced the bug
- Identify the scope of the issue

### 3. Form Hypotheses
- List possible causes based on the symptoms
- Prioritize hypotheses by likelihood
- Consider both obvious and non-obvious causes

### 4. Investigate
- Read the relevant code carefully
- Trace the execution path
- Check input validation and data flow
- Look for common bug patterns:
  - Off-by-one errors
  - Null/undefined handling
  - Race conditions
  - State mutation issues
  - Incorrect assumptions

### 5. Implement the Fix
- Write a failing test that reproduces the bug
- Implement the minimal fix required
- Ensure the fix doesn't break other functionality
- Handle edge cases properly

### 6. Verify the Solution
- Confirm the test now passes
- Run the full test suite
- Manually verify the fix works
- Check for any regression

### 7. Prevent Recurrence
- Consider if similar bugs could exist elsewhere
- Add defensive coding if appropriate
- Update documentation if needed
- Consider adding monitoring or logging

## Common Bug Categories

- **Logic Errors**: Incorrect conditions, wrong operators
- **Data Issues**: Invalid input, type mismatches, null values
- **Timing Issues**: Race conditions, async/await problems
- **State Issues**: Incorrect state management, mutation bugs
- **Integration Issues**: API misuse, version incompatibilities
