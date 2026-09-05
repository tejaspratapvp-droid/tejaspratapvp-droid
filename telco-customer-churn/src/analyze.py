from pathlib import Path
import pandas as pd
import matplotlib.pyplot as plt
import seaborn as sns

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "data" / "Telco-Customer-Churn.csv"
REPORTS = ROOT / "reports"

def load_data():
    if not DATA.exists():
        raise FileNotFoundError("Dataset not found. Run: python src/download_data.py")
    df = pd.read_csv(DATA)
    df["TotalCharges"] = pd.to_numeric(df["TotalCharges"], errors="coerce")
    df = df.dropna(subset=["TotalCharges"]).copy()
    df["SeniorCitizenLabel"] = df["SeniorCitizen"].map({0: "No", 1: "Yes"})
    return df

def main():
    REPORTS.mkdir(exist_ok=True)
    sns.set_theme(style="whitegrid")
    df = load_data()

    summary = pd.DataFrame({
        "metric": [
            "customers", "churn_rate", "avg_monthly_charges",
            "avg_tenure_months", "monthly_revenue_at_risk"
        ],
        "value": [
            len(df),
            round((df["Churn"] == "Yes").mean() * 100, 2),
            round(df["MonthlyCharges"].mean(), 2),
            round(df["tenure"].mean(), 2),
            round(df.loc[df["Churn"] == "Yes", "MonthlyCharges"].sum(), 2)
        ]
    })
    summary.to_csv(REPORTS / "business_summary.csv", index=False)

    plt.figure(figsize=(8, 5))
    sns.countplot(data=df, x="Churn")
    plt.title("Customer Churn Distribution")
    plt.tight_layout()
    plt.savefig(REPORTS / "churn_distribution.png", dpi=160)
    plt.close()

    plt.figure(figsize=(9, 5))
    sns.countplot(data=df, x="Contract", hue="Churn")
    plt.title("Churn by Contract Type")
    plt.xticks(rotation=10)
    plt.tight_layout()
    plt.savefig(REPORTS / "churn_by_contract.png", dpi=160)
    plt.close()

    plt.figure(figsize=(9, 5))
    sns.boxplot(data=df, x="Churn", y="tenure")
    plt.title("Tenure by Churn Status")
    plt.tight_layout()
    plt.savefig(REPORTS / "tenure_by_churn.png", dpi=160)
    plt.close()

    plt.figure(figsize=(9, 5))
    sns.boxplot(data=df, x="Churn", y="MonthlyCharges")
    plt.title("Monthly Charges by Churn Status")
    plt.tight_layout()
    plt.savefig(REPORTS / "charges_by_churn.png", dpi=160)
    plt.close()

    print(summary.to_string(index=False))
    print(f"\nReports saved to {REPORTS}")

if __name__ == "__main__":
    main()
