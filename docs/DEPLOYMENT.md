# Deployment

We are maintaining two services, the [webapp](https://discolab.ai/) and the [server](https://disco-zbkj3i466a-oa.a.run.app/).
Both are automatically deployed when pushing to the default branch (`develop`) via [a workflow of our CI](../.github/workflows/publish-deploy.yml).

## webapp

It is first built using a classic `npm -ws run build`.
Then is gets deployed to GitHub Pages,
with a [custom domain](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site).

## server

First, a [container image](<https://en.wikipedia.org/wiki/Containerization_(computing)>) is built
using the repo's [Dockerfile](https://docs.docker.com/reference/dockerfile/).
It gets pushed to [GitHub Packages](https://docs.github.com/en/packages).

It is then deployed to [Google Cloud via Cloud Run](https://cloud.google.com/run).

### Google Cloud specifics

The GitHub Action runner is authenticated via a
[Direct Workload Identity Federation](https://github.com/google-github-actions/auth?tab=readme-ov-file#preferred-direct-workload-identity-federation)
to give it the rights of a [service account](https://cloud.google.com/iam/docs/service-account-overview)
which can administrate the deployment of the images.

The image itself is proxied via a [remote Artifact Registry](https://cloud.google.com/artifact-registry/docs/repositories/remote-overview)
as Google doesn't allow to directly get it from GitHub Packages.
