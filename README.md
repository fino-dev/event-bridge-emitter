# AWS EventBridge Emitter

Grafana app plugin for configuring and verifying AWS authentication used by an EventBridge integration. Event publishing is not implemented yet.

## AWS authentication

Open the plugin's **Configuration** page to select an authentication provider, set a default AWS region, and optionally configure an IAM role to assume. The plugin checks the saved credentials with AWS STS and displays the authenticated account and ARN.

Access keys are stored in Grafana's secure plugin settings. Other AWS credential providers use the Grafana server's AWS configuration.

## Development

Install frontend dependencies and start the development build:

```bash
npm install
npm run setup:hooks
npm run dev
```

The `pre-push` hook runs the same frontend checks as CI, followed by the Go
backend lint, build, and test checks. A failed check blocks the push. The hook
requires `mage` and `golangci-lint` to be available in `PATH` when the project
has a backend. If dependencies are already installed, enable the hook with
`npm run setup:hooks`.

Run the checks manually with:

```bash
npm run ci
```

Run the frontend unit tests and type check:

```bash
npm run test:ci
npm run typecheck
```

Run backend tests and build the plugin backend:

```bash
go test ./...
mage -v
```

Start the local Grafana instance with Docker:

```bash
npm run server
```
