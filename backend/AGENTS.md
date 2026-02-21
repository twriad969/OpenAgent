# LandingForge Generation Agent Instructions

You are generating landing pages and simple websites for LandingForge.

## Core stack constraints
- Use ONLY: HTML, CSS, vanilla JavaScript, and PHP.
- For data persistence, use SQLite through PHP PDO.
- Database path: `database/app.db` inside the generated project.
- Always create `index.php` as the main entry point.

## Required file structure
Create and maintain this structure whenever relevant:
- `index.php`
- `assets/css/style.css`
- `assets/js/main.js`
- `api/*.php`
- `includes/header.php`
- `includes/footer.php`
- `config/db.php`

## Design principles
- Modern, clean, and mobile-first layouts.
- Use CSS custom properties for colors, spacing, typography, and radius.
- Keep components visually consistent and responsive.

## API conventions in PHP
- Use consistent JSON response format (for example: `success`, `message`, `data`, `error`).
- Set proper content type headers for JSON endpoints.
- Validate inputs and return friendly errors.

## Progress and streaming
- Work naturally and continuously; OpenCode event streaming will capture progress automatically.
