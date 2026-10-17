# AWS EventBridge Emitter

AWS EventBridge Emitter is a Grafana app plugin for sending repeatable Amazon EventBridge events from Grafana. Administrators configure the AWS identity and provision event templates; users select a template, enter its dynamic values, review the resulting event detail, and send one event through the Grafana backend.

## Contents

- [Overview](#overview)
- [Requirements and permissions](#requirements-and-permissions)
- [Quick start](#quick-start)
- [AWS authentication](#aws-authentication)
- [Create and configure templates](#create-and-configure-templates)
- [Use a template](#use-a-template)
- [Security and delivery behavior](#security-and-delivery-behavior)
- [Troubleshooting](#troubleshooting)
- [Contributor guide](#contributor-guide)

## Overview

The plugin separates template administration from event execution:

| Responsibility                                              | Where it happens                  | Who performs it          |
| ----------------------------------------------------------- | --------------------------------- | ------------------------ |
| Configure AWS credentials, region, and optional Assume Role | Plugin **Configuration** page     | Grafana Admin            |
| Define event destinations, fixed values, and form fields    | Grafana app provisioning          | Grafana operator/Admin   |
| Browse and search provisioned templates                     | **EventBridge Emitter** home page | Viewer, Editor, or Admin |
| Enter values, preview the event, and send it                | Template execution screen         | Editor or Admin          |

The browser never calls AWS and never receives AWS credentials. The plugin backend uses the configured AWS identity to call EventBridge `PutEvents`.

### Request flow

1. Grafana loads the app's provisioned `jsonData.templates` for the current organization/app instance.
2. A user selects a template on the home page.
3. The execution screen displays the template's destination and dynamic fields.
4. The user enters values and may override `DetailType` for that execution.
5. The plugin builds and displays the final `Detail` JSON.
6. The Grafana backend validates the values and sends one event to EventBridge.

An accepted result means that EventBridge accepted the event. It does not mean that a rule target, Lambda function, Step Function, or data pipeline has completed successfully.

## Requirements and permissions

Before using the plugin, prepare the following:

- Grafana `13.2.0` or later. The required version is declared in [`src/plugin.json`](src/plugin.json).
- The AWS EventBridge event bus or buses that receive events.
- Network access from the Grafana server to AWS STS and the configured EventBridge Region.
- An AWS identity that can call `events:PutEvents` on each target event bus.
- Grafana app provisioning for the templates. Templates are not created or edited from the home page.

Grafana organization roles are enforced by the backend:

| Grafana role | Browse templates | Execute events | Configure the plugin |
| ------------ | ---------------- | -------------- | -------------------- |
| Viewer       | Yes              | No             | No                   |
| Editor       | Yes              | Yes            | No                   |
| Admin        | Yes              | Yes            | Yes                  |

Use the narrowest IAM policy possible. For a bus named `operations` in `ap-northeast-1`, the relevant permission is:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": "events:PutEvents",
      "Resource": "arn:aws:events:ap-northeast-1:<account-id>:event-bus/operations"
    }
  ]
}
```

If Assume Role is configured, the base identity also needs `sts:AssumeRole` on the target role, and the target role must trust the base identity. See [Assume Role](#assume-role).

## Quick start

1. Install and enable **AWS EventBridge Emitter** in Grafana.
2. Open the plugin's **Configuration** page as a Grafana Admin.
3. Select an AWS authentication method, set **Default Region** when needed, and click **Save and test**.
4. Add a template to the app's `jsonData.templates` provisioning property. Use the example in [Create and configure templates](#create-and-configure-templates).
5. Restart Grafana or reload app provisioning according to your Grafana deployment.
6. Open **EventBridge Emitter**, choose a template, fill in its fields, review **Event preview**, and click **Send event**.

If the template list is empty, start with the [Troubleshooting](#troubleshooting) section and verify the provisioning file, organization ID, and Grafana logs.

## AWS authentication

The plugin creates AWS SDK configuration on the Grafana server. Choose the method that matches how the Grafana service obtains credentials.

| Method                  | Use when                                                                                                                     | Important detail                                                                                                           |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| **AWS SDK Default**     | Grafana runs with an EC2/ECS/EKS workload role, environment credentials, shared profile, or another standard AWS SDK source. | The credential provider chain is resolved by the Grafana service, not by the user's browser.                               |
| **Credentials file**    | Grafana must use a named profile from an AWS shared credentials file.                                                        | The file and profile must exist on the Grafana server. A profile on the operator's workstation is not used.                |
| **Access & secret key** | Grafana receives an explicit access key pair from a secret-management process.                                               | Grafana stores the secret key as encrypted plugin configuration. Rotate keys and do not commit them to provisioning files. |

### Configure authentication

1. Open the plugin's **Configuration** page.
2. Select an **Authentication Provider**.
3. Configure the provider-specific fields.
4. Set **Default Region**, for example `ap-northeast-1`, when the AWS SDK/provider does not already supply a Region.
5. If required, configure [Assume Role](#assume-role).
6. Click **Save and test** and verify the returned AWS account and ARN.

The default Region is `ap-northeast-1`. A template's `target.region` is used for its EventBridge request and takes precedence for that execution.

### AWS SDK Default

Use this when the Grafana server already has access to an IAM role or another standard AWS SDK credential source. This is usually the preferred method for Grafana running on AWS infrastructure.

### Credentials file

Make the AWS credentials/configuration files available and readable by the Grafana service. For containers, mount the files into the Grafana container with the required permissions. Enter **Credentials Profile Name**, or leave it blank to use the default profile.

### Access & secret key

Enter both **Access Key ID** and **Secret Access Key**. Use an identity limited to the required EventBridge buses, rotate the keys, and keep them out of source control and unprotected provisioning files.

### Assume Role

Assume Role is an additional setting, not a fourth authentication provider. Use it when the selected base identity must operate as another role, for example for cross-account access or a dedicated permission set.

1. Grant the base identity `sts:AssumeRole` permission for the target role.
2. Configure the target role's trust policy to trust the base identity.
3. Enter the target role in **Assume Role ARN**.
4. Enter **External ID** only when the target role's trust policy requires it. External ID has no effect without an Assume Role ARN.
5. Save and test again, then confirm that the returned ARN is the assumed role.

## Create and configure templates

Templates are immutable at runtime and are managed through Grafana app provisioning. The home page and resource API do not support template create, edit, duplicate, import, or delete operations.

### Where to define a template

Create or edit a YAML file in the provisioning directory mounted into the Grafana server, commonly `/etc/grafana/provisioning/plugins/`. The repository's local development example is [`provisioning/plugins/development-apps.yaml`](provisioning/plugins/development-apps.yaml).

Add templates under the `jsonData.templates` property of the `toshilab-eventbridgeemitter-app` app. Provision the app for the Grafana organization where the templates should appear:

```yaml
apiVersion: 1

apps:
  - type: toshilab-eventbridgeemitter-app
    org_id: 1
    disabled: false
    jsonData:
      # Keep the authentication settings required by your deployment here.
      authType: default
      defaultRegion: ap-northeast-1
      templates:
        - id: start-daily-pipeline
          name: Start daily pipeline
          description: Start the daily data pipeline for an environment.
          tags:
            - pipeline
            - daily
          target:
            region: ap-northeast-1
            eventBusName: operations
          event:
            source: company.pipeline
            detailType: StartDailyPipeline
            fixedDetail:
              team: data-platform
            fields:
              - key: environment
                label: Environment
                type: select
                required: true
                default: staging
                options:
                  - staging
                  - production
              - key: retryCount
                label: Retry count
                type: number
                required: true
                default: 0
              - key: dryRun
                label: Dry run
                type: boolean
                required: true
                default: false
              - key: runDate
                label: Run date
                type: string
                required: true
              - key: parameters
                label: Parameters
                type: json
                required: false
                default:
                  source: scheduled
```

After changing provisioning, restart Grafana or use the provisioning reload procedure supported by your deployment. If a definition is invalid, the backend rejects it; check the Grafana/plugin logs for the validation error.

### Template properties

| Property              | Required | Description and constraints                                                                                            |
| --------------------- | -------- | ---------------------------------------------------------------------------------------------------------------------- |
| `id`                  | Yes      | Stable unique identifier used by the execution API. IDs must be unique within the provisioned app instance.            |
| `name`                | Yes      | Display name. 1–128 characters.                                                                                        |
| `description`         | No       | Description shown in the template list. Maximum 1,000 characters.                                                      |
| `tags`                | No       | Searchable labels. Maximum 20 unique tags; each tag is 1–64 characters.                                                |
| `target.region`       | Yes      | AWS Region used for this template's EventBridge request, for example `ap-northeast-1`. It must not contain whitespace. |
| `target.eventBusName` | Yes      | EventBridge event bus name or supported event bus ARN. Maximum 256 characters.                                         |
| `event.source`        | Yes      | EventBridge `Source` value. 1–256 characters.                                                                          |
| `event.detailType`    | Yes      | Default EventBridge `DetailType`. 1–256 characters. A user may override it for one execution.                          |
| `event.fixedDetail`   | Yes      | JSON object merged into every event's `Detail`. Use `{}` when there are no fixed values.                               |
| `event.fields`        | No       | Dynamic fields displayed in the execution form. Maximum 100 fields.                                                    |

Use different keys for `fixedDetail` and dynamic fields. If a dynamic field has the same key as a fixed value, the dynamic value replaces the fixed value when the event is built.

### Dynamic field properties

Each item in `event.fields` supports:

| Property   | Required          | Description                                                                                                                                                          |
| ---------- | ----------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `key`      | Yes               | Property name written into `Detail`. It must start with a letter, then contain only letters, numbers, `.`, `-`, or `_`; maximum 128 characters. Keys must be unique. |
| `label`    | Yes               | Human-readable label shown in the Grafana form. 1–128 characters.                                                                                                    |
| `type`     | Yes               | One of `string`, `number`, `boolean`, `select`, or `json`. See [Supported field types](#supported-field-types).                                                      |
| `required` | Yes               | If `true`, the user must provide a value or the field must have a `default`. An unset optional field is omitted from `Detail`.                                       |
| `default`  | No                | Initial form value and fallback when the user leaves the field unset. It must match the declared type.                                                               |
| `options`  | Only for `select` | Non-empty list of unique, non-empty strings. The submitted value must match one of these options.                                                                    |

### Supported field types

| Type      | Grafana control       | Accepted value                                                            | Example                     |
| --------- | --------------------- | ------------------------------------------------------------------------- | --------------------------- |
| `string`  | Text input            | Non-empty string when required                                            | `"staging"`                 |
| `number`  | Number input          | Finite JSON number                                                        | `3`                         |
| `boolean` | Checkbox              | JSON boolean                                                              | `true`                      |
| `select`  | Select/combobox       | One string from `options`                                                 | `"production"`              |
| `json`    | Multiline JSON editor | Any valid, non-null JSON value: object, array, string, number, or boolean | `{ "source": "scheduled" }` |

The `json` type is a JSON value editor, not a JSON Schema editor. Enter syntactically valid JSON. A required string must not be blank, numbers must be finite, and a `select` value must be one of its configured options. These checks are repeated by the backend; frontend validation alone is not trusted.

## Use a template

From the **EventBridge Emitter** home page:

1. Search by template name, description, tag, Region, event bus, source, or detail type.
2. Select **Use template**.
3. Confirm the destination and enter the dynamic field values.
4. Review **Event preview**, which shows the `Detail` payload that will be sent.
5. Optionally change **Detail type** for this execution only.
6. Select **Send event** and read the returned EventBridge status.

The Region, event bus, source, fixed detail, and field definitions come from provisioning and cannot be changed on the execution screen.

### How the event is built

The plugin starts with `event.fixedDetail` and adds the supplied/default dynamic values. For example:

```yaml
fixedDetail:
  environment: staging
  team: data-platform
fields:
  - key: runDate
    type: string
    required: true
```

With `runDate: "2026-10-17"`, the EventBridge request contains:

```json
{
  "EventBusName": "operations",
  "Source": "company.pipeline",
  "DetailType": "StartDailyPipeline",
  "Detail": "{\"environment\":\"staging\",\"team\":\"data-platform\",\"runDate\":\"2026-10-17\"}"
}
```

`EventBusName`, `Source`, and the default `DetailType` come from the template. Only `DetailType` can be overridden in the execution form. The JSON shown in the UI is the decoded `Detail` object; the EventBridge API receives `Detail` as a JSON string.

### Execution results

| Result       | Meaning                                                                                              | Recommended action                                                                 |
| ------------ | ---------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| **Accepted** | EventBridge accepted the event and may return an Event ID.                                           | Treat downstream processing as asynchronous; verify the target separately.         |
| **Failed**   | EventBridge definitively rejected the request or an entry.                                           | Fix the reported validation/IAM/event bus error and submit again.                  |
| **Unknown**  | The connection failed before Grafana confirmed the result. The event may already have been accepted. | Check EventBridge or downstream observability before retrying to avoid duplicates. |

## Security and delivery behavior

- AWS API calls are made by the Grafana backend. AWS credentials are never sent to the browser.
- Access and secret keys are handled through Grafana's encrypted plugin configuration. Do not put credentials in templates, `fixedDetail`, defaults, or source control.
- Template definitions are read-only at runtime. The resource API exposes listing, retrieval, and execution; it does not expose template CRUD.
- The backend validates role, field names, field types, required values, select options, and the final event detail before calling EventBridge.
- Event detail is limited to 256 KiB before the EventBridge request is made. Execution request bodies are limited to 1 MiB.
- The plugin disables AWS SDK retries for `PutEvents`. A network timeout can therefore produce an **Unknown** result even if EventBridge received the event; retry only after checking for duplicates.
- Avoid putting sensitive values in fixed details or defaults. They are included in the execution screen's preview and may be visible to users who can execute the template.

## Troubleshooting

### No templates are displayed

Check all of the following:

1. The provisioning entry uses the exact app type `toshilab-eventbridgeemitter-app`.
2. The provisioning file is mounted in the Grafana server's configured provisioning directory.
3. `org_id` matches the organization where the plugin is being opened.
4. The app is not disabled and the YAML is valid.
5. Grafana has been restarted or provisioning has been reloaded after the change.
6. Grafana/plugin logs do not report duplicate IDs or invalid field definitions.

### Authentication test fails

- Confirm that the Grafana server, not only your workstation, can reach AWS STS.
- Confirm that the configured Region is present and that the credentials/profile are available to the Grafana service account.
- For Access & secret key, verify that both values are present and current.
- For Credentials file, verify the mounted file path, permissions, and profile name.
- For Assume Role, verify both `sts:AssumeRole` permission on the base identity and the trust policy on the target role.

### Execution is forbidden

Only Editors and Admins can execute templates. Ask a Grafana Admin to change the user's organization role if execution is required. The backend enforces this independently of the UI.

### EventBridge rejects the event

Check the returned error code and message, then verify:

- the AWS identity has `events:PutEvents` for the target bus;
- the template Region matches the Region containing the event bus;
- the event bus exists and the configured name/ARN is correct;
- all required fields are provided and all `select` values are in `options`;
- the JSON field is valid JSON and the final detail is within the EventBridge size limit.

### Delivery status is unknown

The request may have reached EventBridge even though Grafana did not receive the response. Check EventBridge metrics, rules, target logs, or another idempotency mechanism before retrying. The plugin intentionally does not automatically retry this request.

## Contributor guide

The repository contains a Grafana app plugin with a React/TypeScript frontend and a Go backend.

### Local development

Install dependencies and start the frontend development build:

```bash
npm install
npm run setup:hooks
npm run dev
```

Start the local Grafana instance with Docker:

```bash
npm run server
```

The local instance loads [`provisioning/plugins/development-apps.yaml`](provisioning/plugins/development-apps.yaml). This file is for local development and E2E tests; it is not required for a normal plugin installation.

### Verification commands

Run the complete project checks:

```bash
npm run ci
```

Run frontend checks individually:

```bash
npm run typecheck
npm run lint
npm run test:ci
npm run build
```

Run backend tests and build the plugin backend:

```bash
go test ./...
mage -v
```

Run the Grafana plugin E2E tests after starting the local Grafana instance:

```bash
npm run e2e
```

The pre-push hook runs the frontend checks followed by backend lint, build, and test checks. It requires `mage` and `golangci-lint` to be available in `PATH` when the project has a backend.

Do not commit real AWS credentials. Use environment-specific secret injection for local and CI environments.
