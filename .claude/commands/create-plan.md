---
description: Create a detailed plan before executing multi-step work
argument-hint: [description of work]
---

# Create Plan

Create a plan, don't execute. Save to `plans/YYYY-MM-DD--{descriptive-name}.md`.

## Before planning:
1. Read `CLAUDE.md` and `memory/CONTEXT.md`
2. Read `memory/active-tasks.md` — don't conflict with in-progress work
3. Read relevant source code

## Plan format:

```
# Plan: <title>

**Created:** <date>
**Status:** Draft

## Goal
<What this accomplishes and why>

## Current State
<What exists now that's relevant>

## Steps

### Step 1: <title>
- **What:** <description>
- **Files:** <which files to create/modify>
- **Depends on:** <previous steps if any>

### Step 2: <title>
...

## Risks
<What could go wrong>

## Success Criteria
1. <Specific, measurable>
```

After creating, tell the user to run `/implement plans/{filename}` to execute.
