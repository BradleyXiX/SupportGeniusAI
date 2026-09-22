# Contributing to SupportGeniusAI

First off, thank you for considering contributing to SupportGeniusAI! It's people like you that make SupportGeniusAI such a great tool.

## Where do I go from here?

If you've noticed a bug or have a feature request, make sure to check our [Issues](../../issues) to see if someone else in the community has already created a ticket. If not, go ahead and [make one](../../issues/new)!

## Fork & create a branch

If this is something you think you can fix, then fork SupportGeniusAI and create a branch with a descriptive name.

A good branch name would be (where issue #325 is the ticket you're working on):

```sh
git checkout -b 325-add-pdf-support
```

## Get the test suite running

Make sure you're using a compatible version of Node.js (v16 or higher). Install the dependencies and test that the app works locally:

```sh
npm install
npm run dev
```

## Implement your fix or feature

At this point, you're ready to make your changes! Feel free to ask for help; everyone is a beginner at first. 

## Code Style

We follow standard JavaScript coding conventions. Please ensure your code is clean, well-documented, and properly formatted before submitting a pull request.

## Make a Pull Request

At this point, you should switch back to your master branch and make sure it's up to date with SupportGeniusAI's master branch:

```sh
git remote add upstream git@github.com:BradleyXiX/SupportGeniusAI.git
git checkout main
git pull upstream main
```

Then update your feature branch from your local copy of main, and push it!

```sh
git checkout 325-add-pdf-support
git rebase main
git push --set-upstream origin 325-add-pdf-support
```

Finally, go to GitHub and make a Pull Request.

## Code of Conduct

Please note that this project is released with a Contributor Code of Conduct. By participating in this project you agree to abide by its terms.
