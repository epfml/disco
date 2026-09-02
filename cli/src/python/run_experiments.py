import json
import sys
import subprocess
from pathlib import Path

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
    if "clippingRadius" in cfg:
        cmd += ["--clippingRadius", str(cfg["clippingRadius"])]
    if "maxIterations" in cfg:
        cmd += ["--maxIterations", str(cfg["maxIterations"])]
    if "beta" in cfg:
        cmd += ["--beta", str(cfg["beta"])]
    if "maxShareValue" in cfg:
        cmd += ["--maxShareValue", str(cfg["maxShareValue"])]
    
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
