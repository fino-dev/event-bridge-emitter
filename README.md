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
