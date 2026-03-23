# Code Standards

- Read existing code before modifying it. Understand the pattern, then follow it.
- Don't over-engineer. Only add what's directly needed for the current task.
- Don't add features, refactor code, or make "improvements" beyond what was asked.
- Only add comments where the logic isn't self-evident.
- Validate at system boundaries (user input, external APIs). Trust internal code.
- Don't create abstractions for one-time operations. Three similar lines > premature abstraction.
- When removing code, remove it completely. No backwards-compatibility hacks.
- Test the critical path. Don't test implementation details.
