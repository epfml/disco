# Models

This folder contains everything related to models.

## Abstract model classes

Defined in the root. `Model` is the most basic class, which then gets extended by `TFJS`, `ONNXModel`, `GPT` and others in the future.

## Model cards

This is where models are wrapped so they can be exposed as available, and linked to tasks.

## Model implementations

Concrete model implementations (e.g. Keras code converted model JSON definition) go here
