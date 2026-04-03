# IRR / APR Calculator

This directory is a GitHub Pages ready package for the IRR / APR calculator.

## Files

- `index.html`: main entry page for GitHub Pages
- `irr-apr-calculator.html`: original main page
- `irr-apr-compare.html`: compare page for backend trial calculation
- `irr-apr-calculator/`: static assets and ES modules

## Publish To GitHub Pages

1. Create a new GitHub repository.
2. Upload all files in this directory to the repository root.
3. In GitHub, open `Settings` -> `Pages`.
4. Set `Source` to `Deploy from a branch`.
5. Select branch `main` and folder `/(root)`.
6. Save.

After GitHub Pages finishes publishing, open:

`https://<your-username>.github.io/<your-repository-name>/`

## Important Notes

- The main calculator works as a static site and can run directly on GitHub Pages.
- The compare page can call a backend API, but GitHub Pages itself cannot host that backend.
- If you want `irr-apr-compare.html` to work online, enter a real API URL in the page.
- If the API is on another domain, that backend must allow CORS requests from your GitHub Pages domain.

## Local Preview

You can also preview these files with any static file server.
