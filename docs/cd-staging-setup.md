# Staging CI/CD setup

Repository workflows enforce CI before deployment, scan the container image, and enable ECS circuit-breaker rollback. The following one-time GitHub and AWS settings complete the setup.

The staging Trivy vulnerability scan reports all `HIGH` and `CRITICAL` findings
without blocking deployment. Findings produce an Actions warning, a job
summary, and a best-effort JSON artifact retained for 30 days. Artifact upload
failures do not block deployment. Artifact names follow
`trivy-staging-<sha>-<run-id>-<run-attempt>` so reruns remain distinct. A
separate `HIGH`/`CRITICAL` secret scan remains blocking. Failures to execute
Trivy or parse the vulnerability JSON still stop the workflow, and migration,
ECS rollout, and smoke-test failures remain deployment gates. Vulnerability
findings do not affect the staging approval marker or production eligibility.

## 1. GitHub Actions variables and staging environment

Under `Settings` -> `Secrets and variables` -> `Actions` -> `Variables`, add
these repository variables once. Both staging and production inherit them:

| Variable         | Value                                                     |
| ---------------- | --------------------------------------------------------- |
| `AWS_REGION`     | `ap-northeast-2`                                          |
| `ECR_REGISTRY`   | `413790913159.dkr.ecr.ap-northeast-2.amazonaws.com`       |
| `ECR_REPOSITORY` | ECR repository shared by both environments: `eum-backend` |

Create an environment named `staging` and add these environment variables:

| Variable          | Value                                              |
| ----------------- | -------------------------------------------------- |
| `ECS_CLUSTER`     | Staging ECS cluster name                           |
| `ECS_SERVICE`     | Staging ECS service name                           |
| `ECS_TASK_FAMILY` | Task-definition family used by the staging service |
| `CONTAINER_NAME`  | Application container name in that task definition |
| `HEALTH_URL`      | Staging `/api/v1/health` URL                       |
| `WS_URL`          | Staging origin used by the Socket.IO smoke test    |

Add these staging environment secrets:

- `AWS_ROLE_ARN`: ARN of the OIDC role created below.
- `STAGING_WS_ACCESS_TOKEN` (optional): access token for a stable staging smoke-test user. Without it, the workflow still verifies that unauthenticated WebSocket connections are rejected.

Do not add required reviewers to staging. The workflow requires OIDC and does
not support long-lived AWS access-key credentials.

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

- ECR authorization, push, `ecr:DescribeImages`, `ecr:BatchGetImage`, and
  `ecr:PutImage` access only to `eum-backend`. The last three permissions let
  the workflow add the immutable `staging-approved-<commit-sha>` tag only after
  deployment and smoke tests pass.
- `ecs:DescribeTaskDefinition`, `ecs:RegisterTaskDefinition`, `ecs:RunTask`, `ecs:DescribeTasks`, `ecs:ListTasks`, `ecs:DescribeServices`, and `ecs:UpdateService` for the staging task/service/cluster.
- `iam:PassRole` only for the execution role and task role referenced by the `eum-backend` task definition.

## 3. Branch protection

Under `Settings` -> `Security` -> `Advanced Security`, verify that Dependency
graph, Dependabot alerts, and Dependabot security updates are enabled before
using `Dependency Review`.

Protect `dev`, require pull requests, and require these checks before merge:

- `Quality, Unit Tests & Build`
- `Database Migration & E2E`
- `Validate branch name`

`Dependency Review` is intentionally informational. Do not add it as a required
status check; a failed security review should remain visible without blocking
the merge.

Restrict direct pushes to `dev`. Keep the staging environment without manual approval; production should use a separate protected environment when its pipeline is introduced.

## 4. Migration rule

Database migrations run before the new ECS revision. They cannot be automatically rolled back safely, so migrations must support both the old and new application revision. Additive changes deploy first; destructive cleanup happens only in a later deployment after all application code has stopped using the old schema.

## 5. Manual staging seed

The staging runtime image keeps npm, npx, Prisma CLI, and tsx so an operator can run the existing seed through ECS Exec:

```bash
ALLOW_PRODUCTION_SEED=true npm run prisma:seed
```

This is intentionally blocked without `ALLOW_PRODUCTION_SEED=true` because `prisma/seed.ts` calls `resetDatabase()` before inserting data. It replaces the staging database contents; it is not an incremental seed command. Do not set `ALLOW_PRODUCTION_SEED` permanently in the ECS task definition.

## 6. Staging approval marker

The final successful CD step adds `staging-approved-<commit-sha>` to the exact
ECR manifest deployed to staging after migration, rollout, and smoke tests pass,
regardless of Trivy findings. Production CD requires both the original
`<commit-sha>` tag and this approval tag to resolve to the same digest. Do not
create approval tags manually.

Enable immutable tags on the `eum-backend` ECR repository before production CD
is enabled. Existing unique SHA and approval tags continue to work; attempts to
move a tag to another image fail. If the same staging run is retried, CD reuses
and rescans the existing immutable SHA image instead of pushing that tag again.
