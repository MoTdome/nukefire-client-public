# Git and VS Code Setup

## Start a new repository

From Terminal in this project folder:

```bash
git init
git add .
git commit -m "checkpoint: preserve milestone 1 base connection"
git branch -M main
git tag milestone-1-base-connection
```

Create an empty remote repository, then connect and push it:

```bash
git remote add origin YOUR_REPOSITORY_URL
git push -u origin main
git push origin milestone-1-base-connection
```

## Put it into an existing empty repository

Clone the repository, copy this project's contents into the cloned folder, then run:

```bash
git add .
git commit -m "checkpoint: preserve milestone 1 base connection"
git tag milestone-1-base-connection
git push
git push origin milestone-1-base-connection
```

## Begin Milestone 1.1 safely

```bash
git switch -c milestone-1.1-terminal-foundation
```

After a verified change:

```bash
npm run verify
git add .
git commit -m "fix: send blank enter for pagination"
```

## Open in VS Code

```bash
code .
```

Use **Terminal > Run Task** for the included start, test, verify, and DMG tasks.
