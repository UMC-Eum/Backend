# Staging CI/CD setup

Repository workflows enforce CI before deployment, scan the container image, and enable ECS circuit-breaker rollback. The following one-time GitHub and AWS settings complete the setup.

## 1. GitHub staging environment

Create an environment named `staging` and add:

- `AWS_ROLE_ARN`: ARN of the OIDC role created below.
- `STAGING_WS_ACCESS_TOKEN` (optional): access token for a stable staging smoke-test user. Without it, the workflow still verifies that unauthenticated WebSocket connections are rejected.

Do not add required reviewers to staging. After one successful OIDC deployment, remove the repository secrets `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY`; the workflow contains an access-key fallback only for the transition.

## 2. AWS GitHub OIDC role

Add the GitHub provider `token.actions.githubusercontent.com` with audience `sts.amazonaws.com`, then create a role using this trust policy:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Federated": "arn:aws:iam::413790913159:oidc-provider/token.actions.githubusercontent.com"
      },
      "Action": "sts:AssumeRoleWithWebIdentity",
      "Condition": {
        "StringEquals": {
          "token.actions.githubusercontent.com:aud": "sts.amazonaws.com",
          "token.actions.githubusercontent.com:sub": "repo:UMC-Eum/Backend:environment:staging"
        }
      }
    }
  ]
}
```

Attach a least-privilege policy allowing:

- ECR authorization and push access only to `eum-backend`.
- `ecs:DescribeTaskDefinition`, `ecs:RegisterTaskDefinition`, `ecs:RunTask`, `ecs:DescribeTasks`, `ecs:ListTasks`, `ecs:DescribeServices`, and `ecs:UpdateService` for the staging task/service/cluster.
- `iam:PassRole` only for the execution role and task role referenced by the `eum-backend` task definition.

## 3. Branch protection

Protect `dev`, require pull requests, and require these checks before merge:

- `Quality, Unit Tests & Build`
- `Database Migration & E2E`
- `Validate branch name`

Restrict direct pushes to `dev`. Keep the staging environment without manual approval; production should use a separate protected environment when its pipeline is introduced.

## 4. Migration rule

Database migrations run before the new ECS revision. They cannot be automatically rolled back safely, so migrations must support both the old and new application revision. Additive changes deploy first; destructive cleanup happens only in a later deployment after all application code has stopped using the old schema.

## 5. Manual staging seed

The staging runtime image keeps npm, npx, Prisma CLI, and tsx so an operator can run the existing seed through ECS Exec:

```bash
ALLOW_PRODUCTION_SEED=true npm run prisma:seed
```

This is intentionally blocked without `ALLOW_PRODUCTION_SEED=true` because `prisma/seed.ts` calls `resetDatabase()` before inserting data. It replaces the staging database contents; it is not an incremental seed command. Do not set `ALLOW_PRODUCTION_SEED` permanently in the ECS task definition.
