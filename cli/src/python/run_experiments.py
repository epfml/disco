import json
import sys
import subprocess
from pathlib import Path

def format_aggregator_params(params):
    items = []
    for k, v in params.items():
        if v is None:
            continue
        if isinstance(v, (dict, list)):
            raise ValueError(f"Unsupported nested value for aggregator parameter '{k}'")
        val = str(v).lower() if isinstance(v, bool) else str(v)
        items.append(f"{k}={val}")
    return ",".join(items)

def build_test_command(cfg):
    # Mandatory arguments
    cmd = [
        "pnpm", "-w", "cli", "start", "--",
        "--testID", cfg["testID"],
        "--task", cfg["task"],
        "--numberOfUsers", str(cfg["numberOfUsers"]),
        "--epochs", str(cfg["epochs"]),
        "--roundDuration", str(cfg["roundDuration"]),
        "--batchSize", str(cfg["batchSize"]),
        "--validationSplit", str(cfg["validationSplit"]),
        "--aggregator", cfg["aggregator"],
        "--host", cfg["host"],
    ]

    if cfg.get("save", False): # If no "save" argument, default is False
        cmd += ["--save"]
    if "epsilon" in cfg:
        cmd += ["--epsilon", str(cfg["epsilon"])]
    if "delta" in cfg:
        cmd += ["--delta", str(cfg["delta"])]
    if "dpDefaultClippingRadius" in cfg:
        cmd += ["--dpDefaultClippingRadius", str(cfg["dpDefaultClippingRadius"])]
    if "aggregatorParams" in cfg and cfg["aggregatorParams"] is not None:
        params = cfg["aggregatorParams"]
        if isinstance(params, dict):
            formatted = format_aggregator_params(params)
            if formatted:
                cmd += ["--aggregatorParams", formatted]
        else:
            cmd += ["--aggregatorParams", str(params)]
    
    return cmd

def main():
    # path of configuration file for experiments
    # default path is "./experiments/basic_tests.json"
    default_path = Path("./experiments/basic_tests.json")
    if len(sys.argv) > 1 and Path(sys.argv[1]).exists():
        config_path = Path(sys.argv[1])
    else:
        config_path = default_path

    with config_path.open("r", encoding="utf-8") as f:
        test_suite = json.load(f)
    
    defaults = test_suite.get("defaults", {})
    experiments = test_suite["experiments"]

    for exp in experiments:
        cfg = {**defaults, **exp}
        cmd = build_test_command(cfg)

        print(f"Running {cfg['testID']}...")
        print(" ".join(cmd))

        subprocess.run(cmd, text=True)

if __name__ == "__main__":
    main()
