# AWS EventBridge Emitter

Grafana app plugin for configuring and verifying AWS authentication used by an EventBridge integration. Event publishing is not implemented yet.

## 🎭 AWS Authentication

This plugin supports multipleAWS authorization methods to publish events to Amazon EventBridge. Choose the authentication provider that best fits your Grafana deployment environment.

Open the plugin's **Configuration** page to select an authentication provider, set a default AWS region, and optionally configure an IAM role to assume. The plugin checks the saved credentials with AWS STS and displays the authenticated account and ARN.

### Auhentication Methods

The plugin supports multiple methods for obtaining AWS credentials, depending on the Grafana deployment environment.

- **AWS SDK Default**: Uses the standard AWS credential provider chain, including environment variables and IAM roles. Recommended for Grafana running on AWS infrastructure such as EC2, ECS, or EKS, where credentials can be managed automatically.

- **Credentials File**: Loads credentials from an AWS shared credentials file using a specified profile. Suitable for local development or self-hosted Grafana environments with existing AWS profiles.

- **Access & Secret Key**: Uses an explicitly configured AWS access key ID and secret access key. Suitable for environments without an existing AWS credential provider, where credentials are managed externally.

- **Assume Role**: Assumes another IAM role using credentials obtained through one of the methods above. Useful for cross-account access or when the plugin requires a dedicated set of IAM permissions.

The AWS identity used by the plugin must have the events:PutEvents permission for the target EventBridge event bus.

### Usecases

| Usecases | Authentication methods |
| --- | --- |
| Grafana runs with an EC2/ECS/EKS workload role or another standard AWS SDK source | AWS SDK Default |
| Grafana must select a named profile from files mounted on the server | Credentials file |
| Grafana receives a dedicated access key pair from a secret-management process | Access & secret key |
| Any of the above must access a role in another account or a restricted target role | Add Assume Role ARN, and External ID when required |

## Configure authentication

Prepare the identity on the Grafana server, or in its workload environment. A profile or key that exists only on an operator's workstation is not used. The Grafana service must be able to reach AWS STS and the region you configure.

Open the plugin's **Configuration** page, complete one provider below, then click **Save and test**. That action calls AWS STS `GetCallerIdentity`. Confirm that the returned account and ARN match the intended identity.

**Default Region** (`jsonData.defaultRegion`) applies to every provider. Set it when the credential source does not provide a region, or when requests must use a specific region.

### AWS SDK Default

This is the mode for an IAM role attached to the Grafana workload. Workspace IAM Role is not offered. The backend treats that option the same as AWS SDK Default and does not force EC2 metadata credentials.

1. Attach or provide the intended AWS identity to the Grafana service.
2. Set **Authentication Provider** to **AWS SDK Default**.
3. Set **Default Region** when the Grafana environment does not provide `AWS_REGION` and need to set the region.
4. Click **Save and test** and confirm the account and ARN.

### Credentials file

Use this when the Grafana service must read a named profile from an AWS shared credentials file on that server.

1. Make the credentials and configuration files readable by the Grafana service account. For containers, mount the files into the container and keep the required file permissions.
2. Set **Authentication Provider** to **Credentials file** (`jsonData.authType`).
3. Enter **Credentials Profile Name** (`jsonData.profile`). Leave it blank to use the default profile. The profile must exist in the Grafana service environment.
4. Set **Default Region** when the profile does not define one.
5. Click **Save and test** and confirm the account and ARN.

### Access & secret key

Use this when the Grafana service is given an IAM access key pair instead of an environment credential chain or a shared profile.

1. Set **Authentication Provider** to **Access & secret key** (`jsonData.authType`).
2. Enter both **Access Key ID** (`secureJsonData.accessKey`) and **Secret Access Key** (`secureJsonData.secretKey`). Grafana stores the pair in secure plugin settings. Use a least-privilege identity, rotate the keys, and do not commit them to provisioning files or source control.
3. Set **Default Region**.
4. When this key pair must assume another role, continue with [Assume Role](#assume-role) before saving.
5. Click **Save and test** and confirm the account and ARN.

### Assume Role

**Assume Role ARN** and **External ID** are additional fields on the provider you selected above. They are not a separate authentication provider. Use them when that base identity must operate as another IAM role, such as for cross-account access or a dedicated permission set.

1. Grant the base identity `sts:AssumeRole` for the target role.
2. Configure the target role's trust policy to trust the base identity.
3. Enter the target role in **Assume Role ARN** (`jsonData.assumeRoleArn`).
4. Enter **External ID** (`jsonData.externalId`) only when that trust policy requires it. The value has no effect without an Assume Role ARN.
5. Click **Save and test**. The returned ARN should be the assumed role, not the base identity.

## 🛠️ Contributer Guide

Install frontend dependencies and start the development build:

```bash
npm install
npm run dev
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
