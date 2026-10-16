# AWS EventBridge Emitter

Grafana app plugin for configuring and verifying AWS authentication used by an EventBridge integration. Event publishing is not implemented yet.

## Configuration fields

| Field | Storage | Specify it when |
| --- | --- | --- |
| Authentication Provider | `jsonData.authType` | Choose the credential source. Omitting it uses AWS SDK Default. |
| Credentials Profile Name | `jsonData.profile` | Authentication Provider is Credentials file. Leave it blank for the default profile. |
| Access Key ID | `secureJsonData.accessKey` | Authentication Provider is Access & secret key. It must be provided together with Secret Access Key. |
| Secret Access Key | `secureJsonData.secretKey` | Authentication Provider is Access & secret key. It must be provided together with Access Key ID. |
| Assume Role ARN | `jsonData.assumeRoleArn` | The base credentials should assume a specific role, such as for cross-account access. |
| External ID | `jsonData.externalId` | The Assume Role trust policy requires an external ID. It has no effect without an Assume Role ARN. |
| Default Region | `jsonData.defaultRegion` | The selected credential source does not provide a region, or requests should be pinned to a specific region. |

The `Workspace IAM Role` option is intentionally not offered. The current backend treats it the same as AWS SDK Default and does not force EC2 metadata credentials; use AWS SDK Default for the standard AWS credential chain.

## Service-level authentication guide

The plugin connects to AWS from the Grafana backend service. Configure the identity and files on the Grafana server (or its workload environment), not on an operator's browser or workstation. The **Save and test** action calls AWS STS `GetCallerIdentity` to verify the selected configuration.

### Common setup

1. Ensure the Grafana service can reach AWS STS and the configured AWS region.
2. Prepare one of the credential sources below for the Grafana service account.
3. Open the plugin's **Configuration** page and select the matching **Authentication Provider**.
4. Set **Default Region** when the selected source does not provide a region, or when requests must be pinned to a specific region.
5. Click **Save and test** and confirm that the returned AWS account and ARN match the intended service identity.

### AWS SDK Default

Use this when Grafana already runs with the standard AWS SDK credential chain. Typical service deployments provide credentials through environment variables, the default shared profile, or a workload identity such as an EC2, ECS, or EKS IAM role.

Service-side procedure:

1. Attach or provide the intended AWS identity to the Grafana service.
2. Select **AWS SDK Default**.
3. Set **Default Region** if the service environment does not provide one.
4. Save and test.

This is the recommended mode for workload-managed credentials because no access key is entered into the plugin configuration. For an IAM role attached to the Grafana workload, use this mode; there is no separate Workspace IAM Role mode.

### Credentials file

Use this when the Grafana service must use a named profile from an AWS shared credentials/configuration file.

Service-side procedure:

1. Make the AWS credentials/configuration files available to the Grafana process and ensure the Grafana service account can read them. For containers, mount the files into the container and preserve the required file permissions.
2. Select **Credentials file**.
3. Enter the profile name in **Credentials Profile Name**. Leave it blank to use the default profile.
4. Set **Default Region** if the profile does not define one.
5. Save and test.

The profile must exist in the Grafana service environment; a profile configured only on the operator's workstation is not used by the backend.

### Access & secret key

Use this when the service is given an explicit IAM access key pair instead of obtaining credentials from its environment or a shared profile.

Service-side procedure:

1. Select **Access & secret key**.
2. Enter both **Access Key ID** and **Secret Access Key**.
3. Set **Default Region**.
4. If the key pair should first assume another role, configure **Assume Role ARN** as described below.
5. Save and test.

The key pair is stored in Grafana's secure plugin settings. Use a least-privilege identity, rotate the keys regularly, and do not commit them to provisioning files or source control.

### Assume Role

**Assume Role ARN** and **External ID** are additional settings, not a separate authentication provider. Configure the base provider first, then use them when the base identity must operate as another IAM role—for example, for cross-account access or to isolate the permissions used by the plugin.

Service-side prerequisites and procedure:

1. Grant the base identity `sts:AssumeRole` permission for the target role.
2. Configure the target role's trust policy to trust the base identity.
3. Select the base provider and enter the target role in **Assume Role ARN**.
4. Enter **External ID** only when the target role's trust policy requires it.
5. Save and test, then verify that the returned ARN is the assumed role rather than the base identity.

### Choosing a mode

| Service situation | Recommended mode |
| --- | --- |
| Grafana runs with an EC2/ECS/EKS workload role or another standard AWS SDK source | AWS SDK Default |
| Grafana must select a named profile from files mounted on the server | Credentials file |
| Grafana receives a dedicated access key pair from a secret-management process | Access & secret key |
| Any of the above must access a role in another account or a restricted target role | Add Assume Role ARN, and External ID when required |

Existing `ec2_iam_role` configuration values remain readable for compatibility, but new configurations should use **AWS SDK Default**.

## AWS authentication

Open the plugin's **Configuration** page to select an authentication provider, set a default AWS region, and optionally configure an IAM role to assume. The plugin checks the saved credentials with AWS STS and displays the authenticated account and ARN.

Access keys are stored in Grafana's secure plugin settings. Other AWS credential providers use the Grafana server's AWS configuration.

## Development

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
