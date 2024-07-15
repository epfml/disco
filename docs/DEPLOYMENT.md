# Releases

This automation happens via [a workflow of our CI](../.github/workflows/publish-deploy.yml).

## Normal development

Every merge to the default branch (`develop`) releases
a patch version of the NPM packages (`discojs`, `discojs-node` & `discojs-web`).

It will also create a
[container image](<https://en.wikipedia.org/wiki/Containerization_(computing)>)
using the repo's [Dockerfile](https://docs.docker.com/reference/dockerfile/)
which gets pushed to [GitHub Packages](https://docs.github.com/en/packages)
under the [`edge`](https://github.com/epfml/disco/pkgs/container/disco/edge) tag.

The webapp is first built using a classic `npm -ws run build`
which gets deployed to GitHub Pages, with a
[custom domain](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site).

## Release

When tagging a commit with a "v" prefix, more is happening.

- NPM packages get released without a patch postfix
- a container is built for that version and gets released under that tag,
  minus the "v" prefix

When you want to do a release, be sure that the commit that you're tagging
is the one changing version number in the various "package.json".

If you want to add release notes, take a look in
[the dedicated GitHub page](https://github.com/epfml/disco/releases)
after pushing the tag.

# Deployment

We are maintaining two services, the [webapp](https://discolab.ai/)
and the [server](https://disco-zbkj3i466a-oa.a.run.app/).

The server is using the previously built container deployed on
[Google Cloud via Cloud Run](https://cloud.google.com/run).

## Google Cloud specifics

The GitHub Action runner is authenticated via a
[Direct Workload Identity Federation](https://github.com/google-github-actions/auth?tab=readme-ov-file#preferred-direct-workload-identity-federation)
to give it the rights of a [service account](https://cloud.google.com/iam/docs/service-account-overview)
which can administrate the deployment of the images.

The image itself is proxied via a [remote Artifact Registry](https://cloud.google.com/artifact-registry/docs/repositories/remote-overview)
as Google doesn't allow to directly get it from GitHub Packages.
