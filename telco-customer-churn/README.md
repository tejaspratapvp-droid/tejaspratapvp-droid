# Telco Customer Churn Analysis & Prediction

An end-to-end customer churn analytics and machine learning project built as a modern portfolio version of the classic Telco Customer Churn problem.

## What this project does

- Cleans and validates telecom customer data
- Performs exploratory data analysis
- Identifies customer segments with elevated churn risk
- Trains Logistic Regression, Decision Tree, and Random Forest models
- Compares models using Accuracy, Precision, Recall, F1-score and ROC-AUC
- Saves the best model for reuse
- Provides a Streamlit prediction dashboard
- Keeps the original IBM dataset attribution instead of copying the original IBM Cloud Pak for Data workflow

## Business questions

1. Which customer groups churn the most?
2. Does contract type affect churn?
3. How do tenure and monthly charges relate to churn?
4. Which services are associated with higher churn?
5. Can a machine learning model identify customers who are likely to churn?

## Project structure

```text
telco-customer-churn/
├── app/
│   └── app.py
├── data/
│   └── README.md
├── models/
├── notebooks/
│   └── churn_analysis.ipynb
├── reports/
├── src/
│   ├── download_data.py
│   ├── analyze.py
│   └── train_model.py
├── .gitignore
├── LICENSE-ATTRIBUTION.md
├── requirements.txt
└── README.md
```

## Quick start

### 1. Create an environment

```bash
python -m venv .venv
```

Windows:

```bash
.venv\Scripts\activate
```

macOS/Linux:

```bash
source .venv/bin/activate
```

### 2. Install dependencies

```bash
pip install -r requirements.txt
```

### 3. Download the dataset

```bash
python src/download_data.py
```

The project downloads the public Telco Customer Churn dataset from the IBM repository and stores it locally as `data/Telco-Customer-Churn.csv`.

### 4. Run the analysis

```bash
python src/analyze.py
```

Charts and summary outputs are written to `reports/`.

### 5. Train the models

```bash
python src/train_model.py
```

The script compares three classification models and saves the best-performing pipeline to `models/best_churn_model.joblib`.

### 6. Launch the app

```bash
streamlit run app/app.py
```

## Skills demonstrated

**Data Analytics:** Python, Pandas, data cleaning, exploratory analysis, segmentation

**Visualization:** Matplotlib, Seaborn

**Machine Learning:** preprocessing pipelines, one-hot encoding, Logistic Regression, Decision Tree, Random Forest, model evaluation

**Deployment:** Streamlit

**Portfolio practice:** reproducible scripts, clear project structure, documentation, attribution

## Dataset attribution

The dataset is the public Telco Customer Churn dataset hosted in IBM's archived `telco-customer-churn-on-icp4d` repository.

Original repository:
https://github.com/IBM/telco-customer-churn-on-icp4d

The original IBM repository is archived and was licensed under Apache-2.0. This portfolio project does not copy the original IBM notebooks, Cloud Pak for Data deployment workflow, or Flask application; it implements a new, simplified modern workflow for learning and portfolio demonstration.

## Important

This is a portfolio/learning project. Model predictions are demonstrations and should not be used as production customer-retention decisions without proper validation, monitoring, fairness checks, and business review.
