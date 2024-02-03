# =================================

### MOVE THE LLM-EXAMPLE/ FOLDER TO THE ROOT PROJECT FOLDER IN ORDER FOR THIS TO WORK

# =================================

# Prerequisites

-   nvm: https://github.com/nvm-sh/nvm#installing-and-updating
-   Bun: https://github.com/oven-sh/bun

# Installation

### Required

The following is always needed

```sh
# install dependencies in discojs-core
cd discojs/discojs-core/
bun install

# install dependencies in discojs-node
cd ../discojs-node/
bun install

# install dependencies in server
cd ../../server/
bun install

# install dependencies in experiment and download + preprocess dataset
cd ../experiment
bun install

# Dataset installation, feel free to install only one dataset or both, you can later choose which one to preprocess / train on
./install-wikitext.sh # Installs wikitext-103 dataset
./install-shakespeare.sh # Installs tiny-shakespeare dataset
bun preprocess.ts [wikitext-103 | tiny-shakespeare]
```

### Running on Node

```sh
cd experiment/
bun main.ts [wikitext-103 | tiny-shakespeare]
```

### Running on a browser

```sh
# install dependencies in discojs-web
cd ../discojs/discojs-web/
bun install

# install dependencies for the browser server and run it
cd ../../browser/server
bun install
bun run dev

# [in a separate terminal] install dependencies for the browser server and run it
cd ../client
nvm use 18    # Node version 18.x or later is required for NextJS
bun install
bun run dev

# Navigate to http://localhost:3000 on your browser of choice and click on "train"
# If you would like to use WebGPU then firefox won't work, please run the following command to run chrome with WebGPU enabled
# (I advise to run this command in a separate terminal tab as well because you will have logs even in detach mode)
google-chrome --enable-unsafe-webgpu --enable-features=Vulkan,UseSkiaRenderer &
# Or from the browser/client/ directory
./chrome-webgpu.sh # equivalent to command above
```

# Running tests

To run tests, you first need to follow the "Required" section of the Installation instructions.

### Testing on Node

```sh
# Follow the instructions "# Running on node" before proceeding
cd discojs/discojs-node/
bun --bun test text-loader.spec.ts
```

### Testing on a "simulated" browser

```sh
# Since the following will test the web version,
# the websocket server needs to be running.
# Follow the 2 first steps of the installation instructions "# Running on a browser"
# before proceeding
cd browser/server/
bun --bun socket.ts

# In a new terminal tab
cd discojs/discojs-web/
bun --bun test text_loader.spec.ts
```

# Benchmarks

## Text Loader

Benchmarking of the text loader is done via iterating 1000 times over the dataset and taking the average time is ms. The vocabulary size is set to 50257. We vary the batch and block sizes and report the results here.
Tests run on an AMD Ryzen 6 7600 CPU.

### Node

```py
# (batch, block) = time / iter
- (4,  64)  = 1.481 ms
- (4,  128) = 2.564 ms
- (4,  256) = 2.213 ms
- (4,  512) = 3.284 ms
- (16, 64)  = 1.912 ms
- (16, 128) = 3.323 ms
- (16, 256) = 6.499 ms
- (16, 512) = 12.131 ms
- (32, 64)  = 3.299 ms
- (32, 128) = 6.579 ms
- (32, 256) = 12.325 ms
- (32, 512) = 23.752 ms
```

### Web (simulated)

```py
# (batch, block) = time / iter
- (4,  64)  = 1.617 ms
- (4,  128) = 2.725 ms
- (4,  256) = 2.162 ms
- (4,  512) = 3.603 ms
- (16, 64)  = 2.120 ms
- (16, 128) = 3.751 ms
- (16, 256) = 6.796 ms
- (16, 512) = 12.837 ms
- (32, 64)  = 3.598 ms
- (32, 128) = 6.883 ms
- (32, 256) = 12.718 ms
- (32, 512) = 25.475 ms
```

### Web (actual browser)

## Training on GPT

TODO: put wandb url

### Node

### Web (actual browser)

# TODO

1. Benchmark all
2. Try new dataset
3. Try new model
4. Investigate if node v18 is required everywhere now

# Future work

1. Disco support for various backends (for WebGPU especially) using `tf.setBackend`, and benchmark on them
2. Support for dedicated tfjs model, which allows custom training loop, e.g. `GPTModel extends Model`. This is partially implemented but not fully (issues in Trainer / TrainerBuilder?)
3. Refactor Task, add generic types
4. QloRA in disco core or at least for GPT
