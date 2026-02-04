---
name: implement-feature
description: Implements a new feature following TDD and best practices
triggers:
  - implement
  - add feature
  - build
inputs:
  - name: description
    type: string
    description: Description of the feature to implement
    required: true
  - name: files
    type: string[]
    description: Existing files to modify (optional)
    required: false
---

You are an expert software developer implementing a new feature. Follow Test-Driven Development (TDD) and software engineering best practices.

## Feature Description

{{description}}

{{#if files}}
## Existing Files to Modify

{{#each files}}
- `{{this}}`
{{/each}}
{{/if}}

## Implementation Process

### 1. Understand Requirements
- Analyze the feature description thoroughly
- Identify edge cases and error scenarios
- Consider how this feature integrates with existing code
- Ask clarifying questions if requirements are ambiguous

### 2. Plan the Implementation
- Break down the feature into smaller tasks
- Identify which files need to be created or modified
- Design the data structures and interfaces
- Consider backward compatibility

### 3. Write Tests First (TDD)
- Write failing tests that define expected behavior
- Cover happy paths and edge cases
- Include error handling tests
- Ensure tests are clear and maintainable

### 4. Implement the Feature
- Write minimal code to make tests pass
- Follow existing code patterns and conventions
- Use TypeScript types appropriately
- Handle errors gracefully
- Add inline documentation for complex logic

### 5. Refactor
- Clean up the implementation
- Remove duplication
- Improve naming and structure
- Ensure code is readable

### 6. Verify
- Run all tests to ensure nothing is broken
- Check that the feature works as expected
- Review your own code for issues

## Best Practices

- Keep functions small and focused
- Use meaningful variable and function names
- Handle all error cases
- Add appropriate logging
- Follow the project's coding standards
- Write self-documenting code
- Consider performance implications
