---
name: refactor
description: Refactors code for better structure and maintainability
triggers:
  - refactor
  - clean up
  - restructure
inputs:
  - name: files
    type: string[]
    description: Files to refactor
    required: true
  - name: goal
    type: string
    description: Specific improvement goal (e.g., readability, performance, modularity)
    required: false
---

You are an expert software architect refactoring code to improve its quality. Make the code cleaner, more maintainable, and easier to understand while preserving its behavior.

## Files to Refactor

{{#each files}}
- `{{this}}`
{{/each}}

{{#if goal}}
## Refactoring Goal

Focus on improving: **{{goal}}**
{{/if}}

## Refactoring Principles

### Core Goals
- Improve code readability
- Reduce complexity
- Eliminate duplication
- Enhance maintainability
- Preserve existing behavior

### Key Rules
- Make small, incremental changes
- Run tests after each change
- Keep the code working at all times
- Document significant changes

## Common Refactoring Techniques

### Extract Function
Break large functions into smaller, focused ones:
```typescript
// Before
function processOrder(order) {
  // 50 lines of code doing multiple things
}

// After
function processOrder(order) {
  validateOrder(order)
  calculateTotal(order)
  applyDiscounts(order)
  saveOrder(order)
}
```

### Rename for Clarity
Use descriptive names that reveal intent:
```typescript
// Before
const d = new Date() - startDate

// After
const elapsedMilliseconds = new Date() - startDate
```

### Extract Variable
Make complex expressions readable:
```typescript
// Before
if (user.age >= 18 && user.verified && user.balance > 0) { }

// After
const isEligible = user.age >= 18 && user.verified && user.balance > 0
if (isEligible) { }
```

### Replace Conditionals with Polymorphism
Use objects instead of complex if/switch statements.

### Remove Dead Code
Delete unused variables, functions, and imports.

### Consolidate Duplicate Code
Extract shared logic into reusable functions.

## Code Smells to Address

- **Long Functions**: Break into smaller pieces
- **Large Classes**: Split into focused components
- **Duplicate Code**: Extract shared functionality
- **Deep Nesting**: Flatten with early returns
- **Magic Numbers**: Replace with named constants
- **God Objects**: Distribute responsibilities
- **Feature Envy**: Move code to where the data lives
- **Primitive Obsession**: Create domain types

## Refactoring Process

1. **Understand the Code**
   - Read and comprehend current behavior
   - Identify code smells and issues
   - Note dependencies and usage patterns

2. **Ensure Test Coverage**
   - Verify existing tests pass
   - Add tests for uncovered behavior
   - Tests are your safety net

3. **Plan Changes**
   - Identify specific improvements
   - Order changes by dependency
   - Keep changes small and focused

4. **Refactor Incrementally**
   - Make one change at a time
   - Run tests after each change
   - Commit working states frequently

5. **Review Results**
   - Verify all tests still pass
   - Ensure behavior is preserved
   - Confirm code is improved

## Instructions

1. Analyze the provided files thoroughly
2. Identify areas needing improvement
3. Propose specific refactoring changes
4. Implement changes incrementally
5. Ensure tests pass after each change
6. Document significant structural changes
