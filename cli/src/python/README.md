# Experiment Runner & Log Visualization

This folder contains two Python scripts for running experiments with different configurations and visualizing their results.

## Environment Setup

We recommend using Python virtual environment to manage dependencies.

1. Create a virtual environment

```bash
python3 -m venv .venv
```

2. Activate the virtual environment

```bash
# Linux / macOS
source .venv/bin/activate
```

3. Install the required libraries from requirements.txt

```bash
pip install -r requirements.txt
```

Once completed, you are ready to run the scripts.

## Key Components

### `run_experiments.py`

This script executes experiments based on a JSON configuration file.

- Reads experiment setting from a JSON file
- Runs cli test commands for each experiment configuration
- Default configuration file: `./experiments/basic_tests.json`

**Usage:**

```bash
python3 run_experiments.py <json_directory>
```

### `visualize_logs.py`

This script visualizes experiment logs using `pandas` and `matplotlib`.

**Input:**

- A directory containing log files from a single experiment (typically contains multiple JSON files from different clients)

**Generated Outputs:**
The script produces the following plots in the same directory

1. Training loss (all clients)
2. Training accuracy (all clients)
3. Validation loss (all clients)
4. Validation accuracy (all clients)
5. Combined dashboard (plots 1--4)
6. Average validation loss across clients
7. Average validation accuracy across clients

**Usage:**

```bash
python3 visualize_logs.py <logs_directory>
```

### `experiment/` Directory

This directory contains JSON files defining experiment configurations

```
{
    "name": "Optional description of the test suite",
    "defaults": {
        "batchSize": 32
    },
    "experiments": [
        {
            "testID": "mnist_dec_byz_cnn3_p3_d600_e50_r2",
            "task": "mnist",
            "numberOfUsers": 3,
            "batchSize": 32,
            "aggregator": "byzantine",
            "clippingRadius": 1,
            "maxIterations": 1,
            "beta": 0.9
        }
    ]
}
```

Field Descriptions

- `name` (optional): Description of the test suite
- `defaults` (optional): Default parameters applied to all experiments
- `experiments`: List of experiment configurations
  - `testID` (required): Unique identifier for the experiment
  - `task` (required): Task name to run
  - Other fields: Training parameters

**Important Notes**

1. **Training scheme (federated, decentralized)** cannot be adjusted in this JSON file. Since training schemes are bound to task objects, we must create the task separately, import it in `args.ts`, and specify the task name in test suite JSON to run the experiments with the intended training scheme.
2. `minNbOfParticipants` cannot be adjusted in test suite JSON file. Similar to training scheme, this must be specified during task creation.
