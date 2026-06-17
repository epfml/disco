# DISCO Command Line Interface

The CLI lets one use DISCO in standalone manner (i.e. without running a server or browser backend manually). The CLI allows to conveniently simulate multiple clients and log metrics such as the training and validation accuracy of each client. Integration of DISCO into other apps can follow the same principles (no browser needed). Currently, the CLI only support running federated tasks. Since the CLI relies on Node.js, it uses DISCO through `discojs-node`.

For example, the following command trains a model on CIFAR10, using 4 federated clients for 15 epochs with a round duration of 5 epochs (see [DISCOJS.md](../docs/DISCOJS.md#rounds) for more information on rounds)

> [!NOTE]
> Make sure you first ran `./datasets/populate` (from the root folder) to download training data.

```
# From the root folder
npm -w cli start -- --testID test1 --task cifar10 --numberOfUsers 4 --epochs 15 --roundDuration 5
# Or from the cli folder directly
npm start -- --testID test1 --task cifar10 --numberOfUsers 4 --epochs 15 --roundDuration 5
```

or using the shorter alias notation:

```
npm -w cli start -- -i test1 -t cifar10 -u 4 -e 15 -r 5
```

You can find all the command arguments with:

```
npm -w cli start -- --help # or -h
```

## Command arguments

Based on the task specification, we can adjust the command arguments. Available arguments are listed below.
Non-mandatory fields will automatically use values from the task specification.

### Test specification arguments

- `testID`: (mandatory) arbitrary test ID defined by the user for the test run
- `task`: (mandatory) pre-defined task (adding a new task is described in the next section)
- `numberOfUsers`: number of users participating in the learning round
- `save`: whether to save the logs of the test run

### Learning hyperparameters

- `epochs`: total number of training epochs
- `roundDuration`: number of epochs per round
- `batchSize`: batch size
- `validationSplit`: ratio of the validation set used for evaluation

### Aggregator parameters

- `aggregator`: aggregator specification
- `clippingRadius`, `maxIterations`, `beta`: (optional, for byzantine aggregator settings) byzantine aggregator hyperparameters
- `maxShareValue`: (optional, for secure aggregator settings) secure aggregator hyperparameter

### Differential Privacy parameters

- `epsilon`, `delta`, `dpDefaultClippingRadius`: (optional, for testing with differential privacy) differential privacy hyperparameters

## Adding new tasks

The CLI can be used on several pre-defined tasks: titanic, simple-face and CIFAR10. In order
to understand how to add a new task have a look at [TASK.md](../docs/TASK.md).

Once a new task has been defined in `discojs`, it can be loaded in [data.ts](./src/data.ts) as it is already implemented for current tasks. There are currently [multiple classes](../discojs-node/src/loaders) you can use to load data using Node.js and preprocess data: loadImagesInDir, loadCSV and loadText.
Once a function to load data has been added, make sure to extend `getTaskData` in `data.ts`, which matches each task with it respective with data loading function.

The last thing to add is to add the task as a CLI argument in [args.ts](./src/args.ts) to the `supportedTasks` Map.
You should now be able to run your task as follows:

```
npm -w cli start -- --task your_task --numberOfUsers 4 --epochs 15 --roundDuration 5
```

## Benchmarking GPT-TF.js

The CLI also allows benchmarking the time and memory requirements of the gpt-tfjs implementation in DISCO. The last benchmark has been reported in [this PR](https://github.com/epfml/disco/pull/659).

In a few words, gpt-tfjs is 3 times slower than python during training; the memory requirements are the bottleneck: training gpt2 with batch size 8 and context length 256 requires 12GB, while gpt-nano (2.5M parameters) with batch size 8 and a context length of 2048 already requires 10GB. Choosing a batch size of 8 and context length of 512 on gpt-nano are sensible values. See the [PR description](https://github.com/epfml/disco/pull/659) for more details.

CLI options can be listed with `npm -w cli run benchmark_gpt -- -h`.

To benchmark model training, you can run `npm -w cli run benchmark_gpt -- --modelType gpt-nano --contextLength 128 --batchSize 8`.

For inference run `npm -w cli run benchmark_gpt -- --inference --modelPath <path to trained model json file>`. You can use the `docs/example/wikitext` example script to train a model. The model needs to be trained on the wikitext default task to ensure that model parameters such as vocab size, tokenizer, max sequence length are the same between training and inference.

## Evaluating GPT Models on HellaSwag

The CLI includes a script to evaluate GPT models on the [HellaSwag](https://rowanzellers.com/hellaswag/) dataset, a common benchmark for evaluating commonsense reasoning in language models.

To run the evaluation: `npm -w cli run hellaswag_gpt`

The script benchmarks the following models:

- A TensorFlow.js implementation of GPT (`gpt-tfjs`)
- A pre-trained ONNX model (`Xenova/gpt2`)

Both models are evaluated using a shared tokenizer (`Xenova/gpt2`), and the script reports:

- Accuracy (proportion of correct multiple-choice predictions)
- Total evaluation time (in seconds)

### Output

Results are printed to the console and saved to a log file: `../datasets/logFile_hellaswag.txt`

This allows for a direct comparison between the inference performance and accuracy of the two architectures.

The TFJS implementation is generally slower and more memory-intensive than ONNX, but offers compatibility with browser-based environments and custom training workflows. See the [Benchmarking GPT-TF.js](#benchmarking-gpt-tfjs) section for more details on performance tradeoffs.
