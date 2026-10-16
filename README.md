# AWS EventBridge Emitter

Grafana app plugin for executing provisioned Amazon EventBridge event templates through the Grafana backend.

## 🎭 AWS Authentication

Use the plugin's **Configuration** page to select an authentication provider.

The Grafana service must be able to reach AWS STS and the configured AWS Region. The AWS identity used by the plugin must have `events:PutEvents` permission for the target EventBridge event bus.

### Authentication methods

- **AWS SDK Default**: Uses the standard AWS credential provider chain available to the Grafana service, including environment variables, shared profiles, and IAM roles attached to EC2, ECS, or EKS workloads.
- **Credentials file**: Reads a profile from an AWS shared credentials file available to the Grafana service.
- **Access & secret key**: Uses an explicitly configured AWS access key ID and secret access key. Grafana encrypts these credentials after they are saved.

Choose the method that matches how the Grafana service obtains AWS credentials.

## EventBridge templates

The home page lists templates loaded from Grafana app provisioning. Operators select a template, change its `detailType` when needed, enter the typed dynamic fields defined by that template, review the generated event detail, and execute one event. Template metadata, destinations, fixed detail, and field definitions are not editable in the home page; update them by changing the provisioning JSON and redeploying or reloading Grafana. The browser never receives AWS credentials or calls AWS directly. A successful execution means EventBridge accepted the event; it does not mean downstream Lambda or pipeline processing has completed.

Add templates to the app's `jsonData.templates` provisioning property. The local example is in [`provisioning/plugins/development-apps.yaml`](provisioning/plugins/development-apps.yaml). Each template defines its EventBridge destination, source, default detail type, fixed detail, and dynamic fields with types such as `string`, `number`, `boolean`, `select`, or `json`. The plugin validates the definitions when the Grafana app instance is initialized and rejects duplicate IDs or invalid field definitions.

The Grafana identity also needs the following least-privilege permissions:

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

Viewer users can view templates. Editor and Admin users can execute them. Template definitions are controlled by Grafana provisioning and cannot be created, updated, duplicated, imported, or deleted through the resource API. These permissions are enforced by the backend resource API as well as by the UI.

### Usecases

| Usecases                                                                                           | Authentication methods                                        |
| -------------------------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| Grafana runs with an EC2, ECS, or EKS workload role, or another standard AWS SDK credential source | AWS SDK Default                                               |
| Grafana must select a named profile from files available on the server                             | Credentials file                                              |
| Grafana receives a dedicated access key pair from a secret-management process                      | Access & secret key                                           |
| Optional: The selected identity must access a role in another account or a restricted target role  | Configure Assume Role in addition to one of the methods above |

## Configure authentication

Open the plugin's **Configuration** page, select an authentication provider, and optionally configure [Assume Role](#assume-role).

Set **Default Region** when the Grafana service does not already provide an AWS Region, for example through the `AWS_REGION` environment variable or the selected profile. You can also set it when requests must use a specific Region.

Default region is `ap-northeast-1`.

Click **Save and test** after configuring the provider. The plugin calls AWS STS `GetCallerIdentity`; confirm that the returned account and ARN match the intended identity.

### Method1. AWS SDK Default

Use this when the Grafana service already obtains credentials through the standard AWS SDK credential chain, including an IAM role attached to its workload.

### Method2. Credentials file

Use this when the Grafana service must read a named profile from an AWS shared credentials file.

Make the credentials and configuration files available and readable by the Grafana service. For containers, mount the files into the Grafana container with the required permissions. Then enter the **Credentials Profile Name**; leave it blank to use the default profile.

The profile must exist in the Grafana service environment. A profile configured only on an operator's workstation is not used by the plugin.

### Method3. Access & secret key

Use this when the Grafana service receives an IAM access key pair instead of using an environment credential chain or a shared profile.

Enter both **Access Key ID** and **Secret Access Key**.

Use a least-privilege identity, rotate the keys, and do not commit them to source control or unprotected provisioning files.

### Optional. Assume Role

**Assume Role ARN** and **External ID** are additional settings, not a separate authentication provider. Use them when the selected identity must operate as another IAM role, such as for cross-account access or a dedicated permission set.

1. Grant the selected identity `sts:AssumeRole` permission for the target role.
2. Configure the target role's trust policy to trust the selected identity.
3. Enter the target role in **Assume Role ARN**.
4. Enter **External ID** only when the target role's trust policy requires it. The value has no effect without an Assume Role ARN.

Confirm that the returned ARN is the assumed role, not the base identity.

## 👷 Contributor Guide

The following commands are for plugin development and local verification.

Install dependencies and start the frontend development build:

```bash
npm install
npm run dev
```

Run the frontend tests and type check:

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
