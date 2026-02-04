---
name: write-tests
description: Writes comprehensive tests for code
triggers:
  - test
  - write tests
  - add tests
inputs:
  - name: files
    type: string[]
    description: Files to write tests for
    required: true
  - name: type
    type: string
    description: Type of tests to write (unit, integration, e2e)
    required: false
---

You are an expert test engineer writing comprehensive tests. Create well-structured, maintainable tests that provide confidence in the code's correctness.

## Files to Test

{{#each files}}
- `{{this}}`
{{/each}}

{{#if type}}
## Test Type Focus

Focus on writing **{{type}}** tests.
{{/if}}

## Testing Principles

### Test Structure (AAA Pattern)
1. **Arrange**: Set up test data and conditions
2. **Act**: Execute the code being tested
3. **Assert**: Verify the expected outcomes

### What to Test

#### Unit Tests
- Individual functions and methods
- Edge cases and boundary conditions
- Error handling paths
- Different input types and values
- Return values and side effects

#### Integration Tests
- Component interactions
- API endpoints
- Database operations
- External service integration

#### End-to-End Tests
- Complete user workflows
- Critical business paths
- Cross-component functionality

## Test Categories

### Happy Path Tests
- Normal, expected usage
- Valid inputs producing expected outputs
- Standard user workflows

### Edge Cases
- Empty inputs (null, undefined, empty strings, empty arrays)
- Boundary values (min, max, zero)
- Large inputs
- Special characters
- Unicode handling

### Error Cases
- Invalid inputs
- Missing required data
- Network failures
- Timeout scenarios
- Permission errors

### State Tests
- Initial state
- State transitions
- Concurrent modifications
- Cleanup and teardown

## Best Practices

- Use descriptive test names that explain the scenario
- Keep tests independent and isolated
- Avoid testing implementation details
- Use appropriate matchers and assertions
- Mock external dependencies appropriately
- Clean up after tests (restore mocks, close connections)
- Group related tests with describe blocks
- Follow the project's testing conventions

## Test File Structure

```typescript
describe('ComponentName', () => {
  describe('methodName', () => {
    it('should handle normal case', () => {
      // Test implementation
    })

    it('should handle edge case', () => {
      // Test implementation
    })

    it('should throw error for invalid input', () => {
      // Test implementation
    })
  })
})
```

## Instructions

1. Analyze the provided files to understand their functionality
2. Identify all testable behaviors
3. Write tests covering happy paths, edge cases, and error cases
4. Ensure tests are clear and maintainable
5. Add comments explaining non-obvious test scenarios
