from pathlib import Path
import json
import joblib
import pandas as pd

from sklearn.compose import ColumnTransformer
from sklearn.impute import SimpleImputer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import (
    accuracy_score, precision_score, recall_score, f1_score, roc_auc_score
)
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder, StandardScaler
from sklearn.tree import DecisionTreeClassifier
from sklearn.ensemble import RandomForestClassifier

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "data" / "Telco-Customer-Churn.csv"
MODEL_DIR = ROOT / "models"
REPORTS = ROOT / "reports"

DROP_COLUMNS = ["customerID"]

def load_data():
    if not DATA.exists():
        raise FileNotFoundError("Dataset not found. Run: python src/download_data.py")
    df = pd.read_csv(DATA)
    df["TotalCharges"] = pd.to_numeric(df["TotalCharges"], errors="coerce")
    df = df.dropna(subset=["TotalCharges"]).copy()
    y = (df.pop("Churn") == "Yes").astype(int)
    X = df.drop(columns=DROP_COLUMNS, errors="ignore")
    return X, y

def build_preprocessor(X):
    numeric = X.select_dtypes(include=["number"]).columns.tolist()
    categorical = X.select_dtypes(exclude=["number"]).columns.tolist()

    numeric_pipe = Pipeline([
        ("imputer", SimpleImputer(strategy="median")),
        ("scaler", StandardScaler())
    ])
    categorical_pipe = Pipeline([
        ("imputer", SimpleImputer(strategy="most_frequent")),
        ("onehot", OneHotEncoder(handle_unknown="ignore"))
    ])

    return ColumnTransformer([
        ("numeric", numeric_pipe, numeric),
        ("categorical", categorical_pipe, categorical)
    ])

def main():
    X, y = load_data()
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, stratify=y, random_state=42
    )

    models = {
        "Logistic Regression": LogisticRegression(max_iter=1500, class_weight="balanced"),
        "Decision Tree": DecisionTreeClassifier(
            max_depth=6, min_samples_leaf=10, class_weight="balanced", random_state=42
        ),
        "Random Forest": RandomForestClassifier(
            n_estimators=350, max_depth=10, min_samples_leaf=4,
            class_weight="balanced", random_state=42, n_jobs=-1
        )
    }

    results = []
    fitted = {}

    for name, estimator in models.items():
        pipe = Pipeline([
            ("preprocessor", build_preprocessor(X_train)),
            ("model", estimator)
        ])
        pipe.fit(X_train, y_train)
        pred = pipe.predict(X_test)
        proba = pipe.predict_proba(X_test)[:, 1]

        results.append({
            "model": name,
            "accuracy": round(accuracy_score(y_test, pred), 4),
            "precision": round(precision_score(y_test, pred), 4),
            "recall": round(recall_score(y_test, pred), 4),
            "f1": round(f1_score(y_test, pred), 4),
            "roc_auc": round(roc_auc_score(y_test, proba), 4)
        })
        fitted[name] = pipe

    results_df = pd.DataFrame(results).sort_values("roc_auc", ascending=False)
    REPORTS.mkdir(exist_ok=True)
    MODEL_DIR.mkdir(exist_ok=True)

    results_df.to_csv(REPORTS / "model_comparison.csv", index=False)

    best_name = results_df.iloc[0]["model"]
    joblib.dump(fitted[best_name], MODEL_DIR / "best_churn_model.joblib")

    metadata = {
        "best_model": best_name,
        "target": "Churn",
        "positive_class": "Yes",
        "random_state": 42
    }
    (MODEL_DIR / "model_metadata.json").write_text(json.dumps(metadata, indent=2))

    print(results_df.to_string(index=False))
    print(f"\nBest model: {best_name}")
    print(f"Saved to: {MODEL_DIR / 'best_churn_model.joblib'}")

if __name__ == "__main__":
    main()
