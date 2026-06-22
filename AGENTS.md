# Repository Guidelines

## Project Structure & Module Organization
This repository is currently minimal, so keep the root clean and add only project-level files here (`README.md`, config files, `AGENTS.md`). When code is introduced, use a simple layout:
- `src/` for application or library code
- `tests/` for automated tests
- `assets/` for static files such as images or sample data
- `docs/` for longer reference material

Prefer small, focused modules over large mixed-purpose files. Use descriptive names like `reading-log.js`, `book-parser.py`, or `tests/test_parser.py`.

## Build, Test, and Development Commands
No build system is defined yet. If you add one, document the exact commands in `README.md` and keep them consistent:
- `npm test` or `pytest` to run the test suite
- `npm run build` or `make build` to generate production artifacts
- `npm run dev` or `make dev` for local development

Avoid adding ad hoc scripts without a clear entry point. Prefer package scripts or a `Makefile` so commands stay discoverable.

## Coding Style & Naming Conventions
Use the style rules native to the language in the file being edited. Keep indentation consistent with surrounding code, and avoid mixing tabs and spaces. Default to:
- `camelCase` for variables and functions
- `PascalCase` for classes and components
- `snake_case` for Python files and test functions when applicable

If a formatter or linter is added, run it before committing and do not hand-format around it.

## Testing Guidelines
Place tests close to the code they cover or under `tests/`. Name tests after behavior, not implementation, for example `test_parse_title` or `shouldIgnoreEmptyEntries`. Add regression tests for every bug fix.

## Commit & Pull Request Guidelines
Write commits in a short, imperative style, such as `Add book import helper` or `Fix parsing of blank lines`. For pull requests, include:
- a concise summary of the change
- linked issue or task, if available
- screenshots or sample output for visible changes
- notes on validation, especially commands you ran

## Agent-Specific Instructions
Before editing, check for existing configs or scripts so new work matches the project's direction. Keep changes scoped, avoid unrelated refactors, and update this guide if the repository gains a formal workflow.

For this repository, treat `LESSON.MD` as the living project memory and `agents/` as the place for role-specific operating instructions. Before starting any new session, read `LESSON.MD` first, then the relevant agent file, then the source.
