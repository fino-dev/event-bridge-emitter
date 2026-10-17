# AWS EventBridge Emitter

Grafana app plugin for executing provisioned Amazon EventBridge event templates through the Grafana backend.

## Overview

AWS EventBridge Emitter lets Grafana users send repeatable events to Amazon EventBridge without putting AWS credentials in the browser. An administrator provisions event templates and configures AWS authentication; Editors and Admins select a template, enter its dynamic values, review the generated event detail, and send one event.

The request flow is:

1. Grafana loads template definitions from app provisioning.
2. A user opens the **EventBridge Emitter** home page and selects a template.
3. The user fills in the template's typed fields and optionally changes the detail type for that execution.
4. The plugin shows the final `Detail` JSON before sending it.
5. The Grafana backend calls EventBridge `PutEvents` using the configured AWS identity.

The browser does not call AWS directly and never receives AWS credentials. A successful result means that EventBridge accepted the event; it does not mean that a downstream Lambda, rule target, or data pipeline has finished processing it. Template definitions are read-only in the UI and are managed through Grafana provisioning.

## Quick start

1. Install and enable the plugin in Grafana.
2. On the plugin's **Configuration** page, configure AWS authentication and click **Save and test**.
3. Grant the configured AWS identity `events:PutEvents` permission for each target event bus.
4. Add one or more templates to the app's `jsonData.templates` provisioning setting as described below.
5. Restart Grafana or reload the app provisioning according to your Grafana deployment.
6. Open **EventBridge Emitter**, select a template, enter its values, review the preview, and click **Send event**.

Viewers can browse templates. Editors and Admins can execute them. The backend enforces these permissions; hiding the send button is not the only authorization check.

## 🎭 AWS Authentication

Use the plugin's **Configuration** page to select an authentication provider.

The Grafana service must be able to reach AWS STS and the configured AWS Region. The AWS identity used by the plugin must have `events:PutEvents` permission for the target EventBridge event bus.

### Authentication methods

- **AWS SDK Default**: Uses the standard AWS credential provider chain available to the Grafana service, including environment variables, shared profiles, and IAM roles attached to EC2, ECS, or EKS workloads.
- **Credentials file**: Reads a profile from an AWS shared credentials file available to the Grafana service.
- **Access & secret key**: Uses an explicitly configured AWS access key ID and secret access key. Grafana encrypts these credentials after they are saved.

Choose the method that matches how the Grafana service obtains AWS credentials.

### Choose an authentication method

| Use case                                                                                           | Authentication method                                         |
| -------------------------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| Grafana runs with an EC2, ECS, or EKS workload role, or another standard AWS SDK credential source | AWS SDK Default                                               |
| Grafana must select a named profile from files available on the server                             | Credentials file                                              |
| Grafana receives a dedicated access key pair from a secret-management process                      | Access & secret key                                           |
| The selected identity must access a role in another account or a restricted target role            | Configure Assume Role in addition to one of the methods above |

## Configure authentication

Open the plugin's **Configuration** page, select an authentication provider, and optionally configure [Assume Role](#optional-assume-role).

Set **Default Region** when the Grafana service does not already provide an AWS Region, for example through the `AWS_REGION` environment variable or the selected profile. You can also set it when requests must use a specific Region.

Default region is `ap-northeast-1`.

Click **Save and test** after configuring the provider. The plugin calls AWS STS `GetCallerIdentity`; confirm that the returned account and ARN match the intended identity.

### Method 1: AWS SDK Default

Use this when the Grafana service already obtains credentials through the standard AWS SDK credential chain, including an IAM role attached to its workload.

### Method 2: Credentials file

Use this when the Grafana service must read a named profile from an AWS shared credentials file.

Make the credentials and configuration files available and readable by the Grafana service. For containers, mount the files into the Grafana container with the required permissions. Then enter the **Credentials Profile Name**; leave it blank to use the default profile.

The profile must exist in the Grafana service environment. A profile configured only on an operator's workstation is not used by the plugin.

### Method 3: Access & secret key

Use this when the Grafana service receives an IAM access key pair instead of using an environment credential chain or a shared profile.

Enter both **Access Key ID** and **Secret Access Key**.

Use a least-privilege identity, rotate the keys, and do not commit them to source control or unprotected provisioning files.

### Optional. Assume Role

**Assume Role ARN** and **External ID** are additional settings, not a separate authentication provider. Use them when the selected identity must operate as another IAM role, such as for a dedicated permission set or cross-account access.

1. Grant the selected identity `sts:AssumeRole` permission for the target role.
2. Configure the target role's trust policy to trust the selected identity.
3. Enter the target role in **Assume Role ARN**.
4. Enter **External ID** only when the target role's trust policy requires it. The value has no effect without an Assume Role ARN.

Confirm that the returned ARN is the assumed role, not the base identity.

## Create and configure templates

Templates are created in Grafana app provisioning, not from the home page. Add them to the `jsonData.templates` property for the `toshilab-eventbridgeemitter-app` app. The repository's local example is [`provisioning/plugins/development-apps.yaml`](provisioning/plugins/development-apps.yaml); in a Grafana installation, use the provisioning directory mounted into the Grafana server.

The following example shows the complete template shape and the supported field types:

```yaml
apiVersion: 1

apps:
  - type: toshilab-eventbridgeemitter-app
    org_id: 1
    disabled: false
    jsonData:
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

### Template properties

| Property              | Required | Description and constraints                                                                               |
| --------------------- | -------- | --------------------------------------------------------------------------------------------------------- |
| `id`                  | Yes      | Stable unique identifier used by the execution API.                                                       |
| `name`                | Yes      | Display name. 1–128 characters.                                                                           |
| `description`         | No       | Explanation shown in the template list. Up to 1,000 characters.                                           |
| `tags`                | No       | Searchable labels. Up to 20 unique tags; each tag is 1–64 characters.                                     |
| `target.region`       | Yes      | AWS Region used for this template's EventBridge request, for example `ap-northeast-1`.                    |
| `target.eventBusName` | Yes      | EventBridge event bus name or supported bus ARN.                                                          |
| `event.source`        | Yes      | EventBridge `Source` value. 1–256 characters.                                                             |
| `event.detailType`    | Yes      | Default EventBridge `DetailType`. 1–256 characters. The user may override it for an individual execution. |
| `event.fixedDetail`   | Yes      | JSON object merged into every event. Use `{}` when there are no fixed values.                             |
| `event.fields`        | No       | Dynamic fields shown in the execution form. Up to 100 fields.                                             |

The dynamic field keys should not duplicate keys in `fixedDetail`. When they do, the dynamic value takes precedence at execution time. The plugin rejects duplicate field keys, invalid field definitions, duplicate template IDs, and invalid `select` options before execution.

### Dynamic field properties

Each item in `event.fields` supports the following properties:

| Property   | Required          | Description                                                                                                                                           |
| ---------- | ----------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| `key`      | Yes               | Property name written into the event detail. It must start with a letter and may contain letters, numbers, `.`, `-`, and `_`; maximum 128 characters. |
| `label`    | Yes               | Label displayed in the Grafana form. Up to 128 characters.                                                                                            |
| `type`     | Yes               | One of `string`, `number`, `boolean`, `select`, or `json`. See the type table below.                                                                  |
| `required` | Yes               | If `true`, the value must be provided or have a `default`. Optional fields with no value are omitted from the event detail.                           |
| `default`  | No                | Initial value and fallback value used when the user leaves the field unset. It must match the field type.                                             |
| `options`  | Only for `select` | Non-empty, unique list of allowed values. The submitted value must be one of these options.                                                           |

### Supported field types

| Type      | Grafana control       | Event detail value                               | Example                     |
| --------- | --------------------- | ------------------------------------------------ | --------------------------- |
| `string`  | Text input            | JSON string                                      | `"staging"`                 |
| `number`  | Number input          | JSON number                                      | `3`                         |
| `boolean` | Checkbox              | JSON boolean                                     | `true`                      |
| `select`  | Select/combobox       | One string from `options`                        | `"production"`              |
| `json`    | Multiline JSON editor | Any valid JSON value, such as an object or array | `{ "source": "scheduled" }` |

For `json` fields, enter valid JSON. The field can contain an object, array, string, number, boolean, or `null` where the template's required/default rules allow it. The completed event detail is built by merging `fixedDetail` with the provided dynamic values.

### Use a template

From the **EventBridge Emitter** home page:

1. Search for a template by name, tag, event bus, source, or detail type.
2. Click **Use template**.
3. Review the destination and enter values for the dynamic fields.
4. Review the generated **Event preview** JSON. The preview contains the `Detail` payload that will be sent.
5. Optionally change **Detail type** for this execution only.
6. Click **Send event** and review the EventBridge acceptance result.

The region, event bus, source, fixed detail, and field definitions come from the provisioned template and cannot be changed from the execution screen. To change them, edit the provisioning file and reload Grafana's app provisioning.

### IAM permission

The Grafana identity also needs the following least-privilege permission for each target event bus:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": ["events:PutEvents"],
      "Resource": "arn:aws:events:<region>:<account-id>:event-bus/<event-bus-name>"
    }
  ]
}
```

Template definitions are controlled by Grafana provisioning and cannot be created, updated, duplicated, imported, or deleted through the resource API. These permissions are enforced by the backend resource API as well as by the UI.

## 👷 Contributor Guide

The following commands are for plugin development and local verification.

Install dependencies and start the frontend development build:

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

The local Grafana container loads the development app configuration from [`provisioning/plugins/development-apps.yaml`](provisioning/plugins/development-apps.yaml). This file is used for local development and E2E tests; it is not required for normal plugin installation or configuration.

Run the E2E tests against the local Grafana instance:

```bash
npm run e2e
```

Do not commit real AWS credentials. Use environment-specific secret injection for local or CI environments.
