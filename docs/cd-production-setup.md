# Production CD setup

Production releases promote the exact container digest that passed staging.
Pushing an annotated stable SemVer tag such as `v1.2.3` starts validation. The
AWS deployment job starts only after one reviewer approves the protected
`production` GitHub Environment.

## 1. GitHub production environment

Create an environment named `production` with one required reviewer. Enable
`Prevent self-review` when the team has at least two release operators, disable
administrator bypass, and restrict deployment tags to `v*.*.*`.

Add these environment variables:

| Variable                | Value                                                       |
| ----------------------- | ----------------------------------------------------------- |
| `AWS_REGION`            | `ap-northeast-2`                                            |
| `ECR_REGISTRY`          | `<aws-account-id>.dkr.ecr.ap-northeast-2.amazonaws.com`     |
| `ECR_REPOSITORY`        | ECR repository shared with staging, currently `eum-backend` |
| `ECS_CLUSTER`           | Production ECS cluster name                                 |
| `ECS_SERVICE`           | Production ECS service name                                 |
| `ECS_TASK_FAMILY`       | Task-definition family used by the production service       |
| `CONTAINER_NAME`        | Application container name in that task definition          |
| `ECS_DEPLOYMENT_ALARMS` | Comma-separated CloudWatch alarm names, without spaces      |
| `HEALTH_URL`            | Production `/api/v1/health` URL                             |
| `WS_URL`                | Production origin used by the Socket.IO smoke test          |

Add these environment secrets:

- `AWS_ROLE_ARN`: production GitHub OIDC role ARN.
- `PRODUCTION_WS_ACCESS_TOKEN` (optional): token for a stable production smoke
  user. Without it, the workflow still checks that unauthenticated WebSocket
  access is rejected.

The workflow intentionally has no access-key fallback. Environment approval
happens before GitHub releases the OIDC token and environment secrets.

## 2. GitHub tag and main protection

Protect `main`, require pull requests, and require the CI checks already used by
`dev`:

- `Quality, Unit Tests & Build`
- `Database Migration & E2E`
- `Validate branch name`

Create an active tag ruleset targeting `v*.*.*`. Restrict tag creation to the
release operators and prevent updates, deletions, and force pushes. Production
workflow validation additionally rejects lightweight tags, prerelease strings,
leading-zero versions, and commits not contained in `main`.

`main` is currently far behind and has its own merge commits. Reconcile it with
one reviewed `dev` to `main` release PR before the first tag. Do not force-push
or reset `main`.

## 3. ECR immutable tags

In the `eum-backend` ECR repository, set tag mutability to `Immutable`. Staging
adds a unique `staging-approved-<commit-sha>` tag after all staging checks pass;
production adds a unique `vX.Y.Z` alias to the same manifest. The production
task definition uses `repository@sha256:<digest>`, not a mutable image tag.

The first automated production candidate must complete staging after the
approval-marker workflow change is deployed. Older images without an approval
tag are intentionally ineligible.

## 4. Production OIDC role

Use the existing GitHub OIDC provider and create a separate production role
with this trust relationship:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Federated": "arn:aws:iam::<aws-account-id>:oidc-provider/token.actions.githubusercontent.com"
      },
      "Action": "sts:AssumeRoleWithWebIdentity",
      "Condition": {
        "StringEquals": {
          "token.actions.githubusercontent.com:aud": "sts.amazonaws.com",
          "token.actions.githubusercontent.com:sub": "repo:UMC-Eum/Backend:environment:production"
        }
      }
    }
  ]
}
```

Grant only the following workflow capabilities:

- `ecr:DescribeImages`, `ecr:BatchGetImage`, and `ecr:PutImage` on the shared
  `eum-backend` repository. Production does not build or push image layers.
- `ecs:DescribeServices` and `ecs:UpdateService` on the production service;
  `ecs:RunTask` for the production task family and cluster; and
  `ecs:DescribeTaskDefinition`, `ecs:RegisterTaskDefinition`,
  `ecs:DescribeTasks`, and `ecs:ListTasks` as required for deployment and
  diagnostics.
- `cloudwatch:DescribeAlarms` so deployment alarm names can be validated.
- `iam:PassRole` only for the execution role and task role already referenced by
  the production task definition, with `iam:PassedToService` restricted to
  `ecs-tasks.amazonaws.com`.

The ECS service-linked role must be able to observe the configured CloudWatch
alarms. The workflow preserves the current rolling minimum/maximum healthy
percentages and enables both the deployment circuit breaker and alarm rollback.

## 5. CloudWatch deployment alarms

Create alarms that indicate a bad application rollout, then add their exact
names to `ECS_DEPLOYMENT_ALARMS`. At minimum use an ALB target 5xx alarm. Add
CPU, memory, or latency alarms only when their thresholds are based on normal
production behavior; an overly sensitive alarm will roll back healthy releases.

All listed alarms are deployment gates: any alarm entering `ALARM` while ECS is
evaluating the rollout causes the deployment to fail and roll back. Keep the
alarm list short and deployment-specific.

## 6. Release procedure

1. Choose the exact `dev` commit that completed staging CD. Confirm ECR contains
   both `<commit-sha>` and `staging-approved-<commit-sha>` with the same digest.
2. Open and merge a `dev` to `main` release PR after required checks pass, then
   wait for the post-merge `main` CI run to succeed. If `dev` moved while the PR
   was open, use the exact `dev` commit that was actually merged and verify its
   staging approval before tagging.
3. Fetch `main`, verify that it contains the staging commit, create an annotated
   tag on that staging commit, and push only the tag:

   ```bash
   git fetch origin main --tags
   git merge-base --is-ancestor <staging-commit-sha> origin/main
   git tag -a v1.0.0 <staging-commit-sha> -m "Release v1.0.0"
   git push origin v1.0.0
   ```

4. In GitHub Actions, inspect the `Validate production release` job. A required
   reviewer then checks the tag, commit, and release PR before approving the
   `production` Environment.
5. Confirm the job summary records the release, commit, image digest, migration
   task, previous task definition, deployed task definition, and both smoke
   tests.

Never create the release tag on the new `main` merge commit unless that exact
commit itself completed staging and has a staging approval marker. The normal
release tag points to the staged `dev` commit now contained in `main`.

## 7. Failure and rollback behavior

- Image, tag, environment, service, or alarm validation failure: no task
  definition is registered and production is unchanged.
- Prisma migration failure: the new revision is not assigned to the service.
- ECS rollout or CloudWatch alarm failure: ECS requests automatic rollback.
- REST or WebSocket smoke failure after rollout: the workflow deploys the saved
  previous task definition, temporarily disabling deployment alarms during the
  recovery and restoring them afterward.

Database migrations are not reversed. Every production migration must use the
expand/contract pattern so the previous and new application revisions both work
against the migrated schema.

To redeploy an earlier automated release, run `CD - Deploy to Production (ECS)`
manually from the `main` branch and enter its existing release tag. The same
production approval and staging-digest validation run again. A manually deployed
legacy revision without a staging approval marker must be restored directly in
ECS using its saved task definition.
