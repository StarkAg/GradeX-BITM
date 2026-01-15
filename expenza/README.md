# Expenza

This folder contains the Expenza project for gradex.bond/Expenza.

## Setup as Git Submodule

If you want to link this to a separate git repository, you can set it up as a git submodule:

```bash
# Remove the current expenza folder
rm -rf expenza

# Add as git submodule
git submodule add <your-expenza-repo-url> expenza

# Or if it's already initialized, clone it
git clone <your-expenza-repo-url> expenza
```

## Direct Git Repository

If you want this folder to be a separate git repository:

```bash
cd expenza
git init
git add .
git commit -m "Initial commit"
git remote add origin <your-expenza-repo-url>
git push -u origin main
```

## Integration

The Expenza component is integrated into the main GradeX app at:
- Component: `src/components/Expenza.jsx`
- Route: `/Expenza` or `/expenza`
- URL: `gradex.bond/Expenza`

