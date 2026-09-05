from pathlib import Path
from urllib.request import urlretrieve

DATA_URL = (
    "https://raw.githubusercontent.com/IBM/"
    "telco-customer-churn-on-icp4d/master/data/Telco-Customer-Churn.csv"
)
OUTPUT = Path(__file__).resolve().parents[1] / "data" / "Telco-Customer-Churn.csv"

def main():
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    print("Downloading Telco Customer Churn dataset...")
    urlretrieve(DATA_URL, OUTPUT)
    print(f"Saved dataset to: {OUTPUT}")

if __name__ == "__main__":
    main()
