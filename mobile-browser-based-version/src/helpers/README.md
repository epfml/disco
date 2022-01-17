# Helpers directory

---

## Introduction

This directory is the core of the backend of the platform. All helper javascript files are located inside it.

- **Communication**: handles all communication with the server.
- **Memory**: handles loading and saving models and weights in memory
- **Testing**: handles all tasks related to the testing of models (prediction, visualisation, etc.)
- **Training**: handles all tasks related to the training of models (report loss values, create the live loss chart, etc.)

## Javascript ES6

This project shall follow as much as possible the guidelines of the [ES6 standard](https://www.w3schools.com/js/js_es6.asp)

For instance, we chose to use `from ... import` styled imports instead of `require` as often as possible.
