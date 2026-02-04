# Skills Documentation

## Overview

Skills are the building blocks of Forge's AI capabilities. Each skill defines a specific task the AI can perform, with triggers, inputs, and a prompt template that guides the AI's behavior.

## Skill Format

Skills are Markdown files with YAML frontmatter:

```yaml
---
name: my-skill
description: What this skill does
triggers:
  - keyword1
  - keyword2
inputs:
  - name: files
    type: string[]
    description: Files to process
    required: true
  - name: option
    type: string
    description: Optional setting
    required: false
---

Your prompt template here.

Use {{inputName}} for placeholders.
Use {{#each files}}{{this}}{{/each}} for arrays.
```

### Frontmatter Fields

- **name** (required): Unique identifier for the skill (lowercase, hyphenated)
- **description** (required): Brief description of what the skill does
- **triggers** (optional): Array of keywords that activate this skill
- **inputs** (optional): Array of input definitions

### Input Definitions

Each input has:
- **name**: Variable name used in the template
- **type**: Data type (`string`, `string[]`, `number`, `boolean`)
- **description**: What this input represents
- **required**: Whether the input is mandatory

## Built-in Skills

### code-review

Analyzes code for quality, security, and best practices.

**Triggers**: `review`, `code review`, `analyze`

**Inputs**:
- `files` (string[]): Files to review

**What it does**:
- Checks code quality and style
- Identifies security vulnerabilities
- Suggests improvements
- Flags potential bugs
- Reviews test coverage

### implement-feature

Implements new features following TDD methodology.

**Triggers**: `implement`, `feature`, `build`

**Inputs**:
- `description` (string): Feature description
- `files` (string[]): Related files

**What it does**:
- Writes tests first
- Implements functionality
- Ensures tests pass
- Follows project conventions
- Documents new code

### fix-bug

Diagnoses and fixes bugs systematically.

**Triggers**: `fix`, `bug`, `debug`

**Inputs**:
- `description` (string): Bug description
- `files` (string[]): Affected files

**What it does**:
- Analyzes the bug
- Identifies root cause
- Implements fix
- Adds regression tests
- Verifies the fix

### write-tests

Generates comprehensive test coverage.

**Triggers**: `test`, `tests`, `coverage`

**Inputs**:
- `files` (string[]): Files to test

**What it does**:
- Analyzes code to test
- Writes unit tests
- Writes integration tests
- Tests edge cases
- Achieves high coverage

### document

Creates documentation in various formats.

**Triggers**: `document`, `docs`, `readme`

**Inputs**:
- `type` (string): Documentation type (readme, api, guide)
- `files` (string[]): Files to document

**What it does**:
- Generates README files
- Creates API documentation
- Writes user guides
- Adds code comments
- Creates examples

### refactor

Improves code structure while preserving behavior.

**Triggers**: `refactor`, `improve`, `cleanup`

**Inputs**:
- `files` (string[]): Files to refactor

**What it does**:
- Identifies code smells
- Improves naming
- Reduces complexity
- Extracts reusable code
- Preserves all tests

## Creating Custom Skills

### Global Skills

Create skills that work across all projects:

1. Create directory: `~/.forge/skills/`
2. Add skill file: `~/.forge/skills/my-skill.md`

### Project Skills

Create skills specific to a project:

1. Create directory: `.forge/skills/` in your project
2. Add skill file: `.forge/skills/my-skill.md`

### Skill Priority

Skills are loaded with priority:
1. Project skills (`.forge/skills/`) - highest priority
2. Global skills (`~/.forge/skills/`)
3. Built-in skills - lowest priority

Higher priority skills override lower ones with the same name.

## Skill Examples

### Example 1: Custom Lint Skill

```yaml
---
name: lint-fix
description: Fix linting issues automatically
triggers:
  - lint
  - fix lint
  - eslint
inputs:
  - name: files
    type: string[]
    description: Files to lint
    required: true
---

Fix all ESLint errors in the following files:

{{#each files}}
- {{this}}
{{/each}}

Rules to follow:
1. Apply automated fixes first
2. Fix remaining errors manually
3. Don't change code behavior
4. Follow project's ESLint config
5. Preserve code formatting

Run eslint after fixing to verify all errors are resolved.
```

### Example 2: API Endpoint Skill

```yaml
---
name: create-api-endpoint
description: Create a new REST API endpoint
triggers:
  - api
  - endpoint
  - route
inputs:
  - name: method
    type: string
    description: HTTP method (GET, POST, PUT, DELETE)
    required: true
  - name: path
    type: string
    description: Endpoint path (e.g., /api/users/:id)
    required: true
  - name: description
    type: string
    description: What the endpoint does
    required: true
---

Create a new {{method}} endpoint at {{path}}.

Purpose: {{description}}

Requirements:
1. Create route handler
2. Add input validation
3. Add error handling
4. Add authentication if needed
5. Add tests (unit + integration)
6. Add OpenAPI documentation
7. Follow RESTful conventions

File structure:
- Route: src/routes/{{path}}.ts
- Handler: src/handlers/{{path}}.ts
- Tests: src/routes/__tests__/{{path}}.test.ts
- Schema: src/schemas/{{path}}.ts
```

### Example 3: Database Migration Skill

```yaml
---
name: create-migration
description: Create a database migration
triggers:
  - migration
  - database
  - schema
inputs:
  - name: description
    type: string
    description: What the migration does
    required: true
  - name: type
    type: string
    description: Migration type (add-table, add-column, modify, etc.)
    required: false
---

Create a database migration: {{description}}

{{#if type}}
Type: {{type}}
{{/if}}

Requirements:
1. Create migration file with timestamp
2. Write up migration
3. Write down migration (rollback)
4. Add indexes for foreign keys
5. Include sample data if needed
6. Test migration up and down
7. Update database schema docs

Follow these conventions:
- Use proper column types
- Add NOT NULL constraints where appropriate
- Set default values when sensible
- Add foreign key constraints
- Create indexes for query performance
```

## Template Syntax

Skills use Handlebars-like template syntax:

### Variables

```
{{variableName}}
```

### Conditionals

```
{{#if condition}}
  Content when true
{{else}}
  Content when false
{{/if}}
```

### Loops

```
{{#each arrayName}}
  {{this}}
{{/each}}
```

### Accessing Object Properties

```
{{#each users}}
  Name: {{this.name}}
  Email: {{this.email}}
{{/each}}
```

## Best Practices

### Writing Effective Skills

1. **Be Specific**: Clear, detailed prompts get better results
2. **Provide Context**: Explain the why, not just the what
3. **Set Constraints**: Define what should and shouldn't be done
4. **Include Examples**: Show expected output format
5. **Test Thoroughly**: Try the skill with various inputs

### Trigger Keywords

- Use common terms developers would naturally use
- Include variations (singular/plural, abbreviations)
- Add domain-specific terms for specialized skills
- Avoid overly generic triggers that might match unintentionally

### Input Design

- Only require inputs that are essential
- Provide sensible defaults when possible
- Use arrays for multiple items of the same type
- Use descriptive names that match the domain
- Add detailed descriptions for complex inputs

### Prompt Templates

- Start with a clear statement of the task
- Break down complex tasks into steps
- Specify output format and structure
- Include quality criteria
- Mention testing requirements
- Reference relevant conventions or standards

## Testing Skills

### Manual Testing

1. Use the skill from Forge UI
2. Try with minimal inputs
3. Try with all inputs
4. Test edge cases
5. Verify output quality

### Iteration

1. Review AI output
2. Identify issues or gaps
3. Update skill prompt
4. Test again
5. Repeat until satisfied

## Common Patterns

### Code Generation

```yaml
inputs:
  - name: componentName
    type: string
  - name: props
    type: string[]
---

Create a React component named {{componentName}}.

Props:
{{#each props}}
- {{this}}
{{/each}}

Requirements:
- Use TypeScript
- Use functional component
- Include PropTypes
- Add JSDoc comments
- Export as default
```

### Code Analysis

```yaml
inputs:
  - name: files
    type: string[]
  - name: criteria
    type: string
---

Analyze the following files:
{{#each files}}
- {{this}}
{{/each}}

Focus on: {{criteria}}

Provide:
1. Summary of findings
2. Issues by severity
3. Recommendations
4. Code examples
```

### Automated Tasks

```yaml
inputs:
  - name: action
    type: string
  - name: target
    type: string[]
---

Perform automated task: {{action}}

Targets:
{{#each target}}
- {{this}}
{{/each}}

Steps:
1. Verify prerequisites
2. Execute action
3. Validate results
4. Report outcome
```

## Troubleshooting

### Skill Not Triggering

- Check trigger keywords match your input
- Verify skill file is in correct location
- Check for YAML syntax errors in frontmatter
- Restart Forge to reload skills

### Incorrect Output

- Review and refine prompt template
- Add more specific instructions
- Include examples of expected output
- Specify constraints and edge cases

### Missing Inputs

- Check input names match template variables
- Verify required inputs are provided
- Review input type definitions
- Check for typos in variable names

## Advanced Topics

### Nested Inputs

```yaml
inputs:
  - name: config
    type: object
    properties:
      name: string
      options: string[]
---

Config name: {{config.name}}
Options:
{{#each config.options}}
- {{this}}
{{/each}}
```

### Conditional Logic

```yaml
---
Use different approaches based on project type:

{{#if projectType === 'react'}}
  Use React Testing Library
{{else if projectType === 'vue'}}
  Use Vue Test Utils
{{else}}
  Use standard testing approach
{{/if}}
```

### Dynamic File Paths

```yaml
---
Create files:
- src/components/{{componentName}}.tsx
- src/components/__tests__/{{componentName}}.test.tsx
- src/components/{{componentName}}.css
```

## Contributing Skills

To share your custom skills with the community:

1. Test thoroughly
2. Document inputs and usage
3. Add examples
4. Submit as pull request to the skills repository
5. Include description and use cases

See [CONTRIBUTING.md](../CONTRIBUTING.md) for contribution guidelines.
