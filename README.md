# Network Planning Calculator: Frontend

The frontend of the Network Planning Calculator, a tool that generates network recommendations from user-provided requirements. This repository contains the single-page application (React, TypeScript, shadcn/ui) that collects requirements, shows the cross-vendor comparison, renders the network topology and Bill of Materials (BOM), and exports reports.

The backend (engine, pricing, database, infrastructure) lives in the separate `nwp-backend` repository.

## Local Development Setup
### Prerequisites
- Git
- Node.js
- npm

Verify the installations:

- `git --version`
- `node --version`
- `npm --version`

### 1. Clone the Repository
- `git clone <repository-url>`
- `cd <project-folder>`

### 2. Switch to the Development Branch
- `git checkout development`
- `git pull origin development`

### 3. Install Dependencies
- `npm ci`

Use `npm install` only when you are adding or updating a dependency.

### 4. Configure Environment Variables
Create a local `.env` file using the provided example:

- `cp .env.example .env` (PowerShell: `Copy-Item .env.example .env`)

| Variable | Description |
| --- | --- |
| `VITE_API_URL` | Base URL of the engine API. Use `http://localhost:8000` for a local backend, or the deployed API Gateway URL. |

**Important:** Do not commit `.env`. Every `VITE_` variable is embedded in the built JavaScript and is visible to anyone who loads the site, so never put secrets in it.

### 5. Run the Application
- `npm run dev`

To see all available `npm` scripts:

- `npm run`

### 6. Build
- `npm run build`

The production build is written to `dist/`. Type-check without building with `npx tsc --noEmit`.

## API Contract
The backend owns the contract between the two repositories. This repository keeps copies of it in `src/types/`:

- `network-config.ts`: the request shape (`NetworkConfiguration`).
- `api-types.ts`: the response shape (`EngineResult`, `Plan`, `Bom`, and related types) and `CONTRACT_VERSION`.

**Do not edit these files here.** They are copied from `nwp-backend`. When the contract changes:

1. The backend changes the source files and bumps `CONTRACT_VERSION`.
2. Copy the updated files into `src/types/` through a Pull Request in this repository.
3. Merge the backend change first.

The app compares `CONTRACT_VERSION` against the `contractVersion` in each response and shows an error if they differ.

## Deployment
The frontend is deployed separately from the backend through AWS Amplify Hosting, connected to this repository.

- A push to `main` triggers a build using `amplify.yml`.
- `VITE_API_URL` is set in the Amplify console under Environment variables.
- Single-page routing relies on a rewrite rule to `/index.html` configured in Amplify.

A frontend change never requires a backend deployment.

## Git Workflow
Do not commit directly to `main` or `development`. All changes must be made on a separate branch and submitted through a Pull Request targeting `development`.

### Branch Naming Convention
Every branch must follow this format:

- `<type>/[<story-id>-]<short-description>`

The NWP Story ID should identify the specific story or task being worked on.

| Type       | Purpose                   | Example                                   |
| ---------- | ------------------------- | ----------------------------------------- |
| `feature/` | New functionality         | `feature/UI-12-comparison-page`           |
| `fix/`     | Bug fixes                 | `fix/UI-01-form-validation`               |
| `style/`   | UI/design changes         | `style/UI-03-results-page`                |
| `docs/`    | Documentation             | `docs/OTHER-26-update-readme`             |
| `chore/`   | Maintenance/configuration | `chore/INFRA-04-update-dependencies`      |

### Branch Naming Rules
- Always include the applicable NWP Story ID (see the Notion board for the appropriate prefix). Remove the NWP prefix.
- If there is no associated story for the branch, do not make your own. Just write the short description instead.
- Use lowercase for the description.
- Use hyphens (-) to separate words.
- Keep the description short and descriptive.
- Do not use spaces.

## Pull Request (PR) Process
All completed work must go through a Pull Request before being merged.

### 1. Start from development
- `git checkout development`
- `git pull origin development`

### 2. Create a Branch
- `git checkout -b feature/XXX-short-description`

### 3. Make and Check Your Changes
Complete the assigned task and check it locally.
- `npx tsc --noEmit`
- `npm run build`

### 4. Commit Your Changes
Use a clear and descriptive commit message.
- `git add .`
- `git commit -m "Describe your changes"`

### 5. Push Your Branch
- `git push origin feature/XXX-short-description`

### 6. Open a PR
- Target the development branch.
- Reference the appropriate NWP Story ID.
- Clearly describe the changes made.
- Explain how the changes address the assigned story/task.

#### PR Title Format:

`[NWP-TYPE-Story-ID]` Short description of changes

##### Example:

`[NWP-UI-123]` Add comparison page vendor switcher

### 7. Request Review
- The PR requires approval from the assigned member for QA and testing.

### 8. Wait for Approval
- Do not merge the PR yourself.
- Wait for the required reviewers to review and approve the PR.
