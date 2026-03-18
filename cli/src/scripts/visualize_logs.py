import argparse
import json
from pathlib import Path
from typing import Iterable

import pandas as pd
import matplotlib.pyplot as plt

# Load a user log file and convert it to pandas DataFrame
def load_user_log(path: Path) -> pd.DataFrame:
    with path.open("r", encoding="utf-8") as f:
        data = json.load(f)

    logs = data.get("logs", [])
    if not logs:
        return pd.DataFrame()

    df = pd.DataFrame(logs)

    user_info = data.get("user", {})
    run_info = data.get("run", {})
    task_info = data.get("task", {})

    df["user_index"] = user_info.get("index")
    df["client_id"] = user_info.get("clientId")
    df["test_id"] = run_info.get("testID")
    df["task_id"] = run_info.get("taskID", task_info.get("id"))
    df["step"] = range(len(df))

    return df

# Merge logs from all clients into a single pd.DataFrame
def load_all_user_logs(log_dir: Path) -> pd.DataFrame:
    files = sorted(log_dir.glob("*_local_log.json"))

    dfs = [load_user_log(f) for f in files]
    dfs = [df for df in dfs if not df.empty]

    return pd.concat(dfs, ignore_index=True)

# Ensure that the specified columns are converted into numeric values
def ensure_numeric(df: pd.DataFrame, columns):
    for col in columns:
        if col in df.columns:
            df[col] = pd.to_numeric(df[col], errors="coerce")
    
    return df

# plotting functions
# Draw a line plot for one metric across all users
def plot_metric_per_user(df, metric, output_path, title, ylabel):
    plt.figure(figsize=(10, 6))
    for user, g in df.groupby("user_index"):
        plt.plot(g["step"], g[metric], label=f"user {user}")

    plt.xlabel("Step")
    plt.ylabel(ylabel)
    plt.title(title)
    plt.legend()
    plt.tight_layout()
    plt.savefig(output_path)
    plt.close()

# Plot mean value of a metric with std
def plot_mean_std(df, metric, output_path, title, ylabel):
    summary = df.groupby("step")[metric].agg(["mean", "std"]).reset_index() 

    summary["std"] = summary["std"].fillna(0)

    plt.figure(figsize=(10, 6))
    plt.plot(summary["step"], summary["mean"])
    plt.fill_between(summary["step"], summary["mean"]-summary["std"], summary["mean"]+summary["std"], alpha=0.2)

    plt.xlabel("Step")
    plt.ylabel(ylabel)
    plt.title(title)
    plt.tight_layout()
    plt.savefig(output_path)
    plt.close()
    print(f"Plot saved: {output_path}")


# Display multiple plots in a single figure
def plot_dashboard(df, output_path):
    metrics = [
        ("trainingLoss", "Training Loss"), # metric and title for each subplot
        ("validationLoss", "Validation Loss"),
        ("trainingAccuracy", "Training Accuracy"),
        ("validationAccuracy", "Validation Accuracy")
    ]

    fig, axes = plt.subplots(2, 2, figsize=(12, 8))

    for ax, (metric, title) in zip(axes.flatten(), metrics):
        for user, g in df.groupby("user_index"):
            ax.plot(g["step"], g[metric])

        ax.set_title(title)
        ax.set_xlabel("Step")
    
    plt.tight_layout()
    plt.savefig(output_path)
    plt.close()

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("log_dir", type=str, help="Path to log directory for visualization")

    args = parser.parse_args()

    log_dir = Path(args.log_dir)

    df = load_all_user_logs(log_dir)

    # Ensure numeric values for columns used in visualization
    df = ensure_numeric(df, ["trainingLoss", "validationLoss", "trainingAccuracy", "validationAccuracy", "epochTime", "peakMemory"])

    # Per-client plots
    plot_metric_per_user(df, "trainingLoss", log_dir / "training_loss.png", "Training Loss", "Loss")
    plot_metric_per_user(df, "trainingAccuracy", log_dir / "training_acc.png", "Training Accuracy", "Accuracy")
    plot_metric_per_user(df, "validationLoss", log_dir / "validation_loss.png", "Validation Loss", "Loss")
    plot_metric_per_user(df, "validationAccuracy", log_dir / "validation_acc.png", "Validation Accuracy", "Accuracy")

    # Mean loss and accuracy plots
    plot_mean_std(df, "validationLoss", log_dir / "mean_validation_loss.png", "Mean Validation Loss", "Loss")
    plot_mean_std(df, "validationAccuracy", log_dir / "mean_validation_acc.png", "Mean Validation Accuracy", "Accuracy")

    plot_dashboard(df, log_dir / "dashboard.png")


if __name__ == "__main__":
    main()
    
