from pathlib import Path
import joblib
import pandas as pd
import streamlit as st

ROOT = Path(__file__).resolve().parents[1]
MODEL_PATH = ROOT / "models" / "best_churn_model.joblib"

st.set_page_config(
    page_title="Telco Churn Predictor",
    page_icon="📊",
    layout="wide"
)

st.title("📊 Telco Customer Churn Predictor")
st.caption("Portfolio ML application for customer retention analysis")

if not MODEL_PATH.exists():
    st.error("Model not found. Run these commands first:")
    st.code("python src/download_data.py\npython src/train_model.py")
    st.stop()

model = joblib.load(MODEL_PATH)

st.subheader("Enter customer information")

c1, c2, c3 = st.columns(3)

with c1:
    gender = st.selectbox("Gender", ["Male", "Female"])
    senior = st.selectbox("Senior Citizen", [0, 1])
    partner = st.selectbox("Partner", ["Yes", "No"])
    dependents = st.selectbox("Dependents", ["Yes", "No"])
    tenure = st.slider("Tenure (months)", 0, 72, 12)

with c2:
    phone = st.selectbox("Phone Service", ["Yes", "No"])
    multiple_lines = st.selectbox("Multiple Lines", ["Yes", "No", "No phone service"])
    internet = st.selectbox("Internet Service", ["DSL", "Fiber optic", "No"])
    online_security = st.selectbox("Online Security", ["Yes", "No", "No internet service"])
    online_backup = st.selectbox("Online Backup", ["Yes", "No", "No internet service"])

with c3:
    device = st.selectbox("Device Protection", ["Yes", "No", "No internet service"])
    tech = st.selectbox("Tech Support", ["Yes", "No", "No internet service"])
    streaming_tv = st.selectbox("Streaming TV", ["Yes", "No", "No internet service"])
    streaming_movies = st.selectbox("Streaming Movies", ["Yes", "No", "No internet service"])
    contract = st.selectbox("Contract", ["Month-to-month", "One year", "Two year"])
    payment = st.selectbox(
        "Payment Method",
        ["Electronic check", "Mailed check", "Bank transfer (automatic)",
         "Credit card (automatic)"]
    )

monthly = st.number_input("Monthly Charges", min_value=0.0, max_value=200.0, value=70.0)
total = st.number_input("Total Charges", min_value=0.0, max_value=10000.0, value=monthly * max(tenure, 1))

row = pd.DataFrame([{
    "gender": gender,
    "SeniorCitizen": senior,
    "Partner": partner,
    "Dependents": dependents,
    "tenure": tenure,
    "PhoneService": phone,
    "MultipleLines": multiple_lines,
    "InternetService": internet,
    "OnlineSecurity": online_security,
    "OnlineBackup": online_backup,
    "DeviceProtection": device,
    "TechSupport": tech,
    "StreamingTV": streaming_tv,
    "StreamingMovies": streaming_movies,
    "Contract": contract,
    "PaperlessBilling": "Yes",
    "PaymentMethod": payment,
    "MonthlyCharges": monthly,
    "TotalCharges": total
}])

if st.button("Predict Churn Risk", type="primary"):
    probability = float(model.predict_proba(row)[0, 1])
    prediction = "High churn risk" if probability >= 0.50 else "Lower churn risk"

    a, b = st.columns(2)
    a.metric("Churn Probability", f"{probability:.1%}")
    b.metric("Prediction", prediction)

    st.progress(probability)

    if probability >= 0.70:
        st.warning("This customer falls into a high-risk segment. Consider proactive retention outreach.")
    elif probability >= 0.50:
        st.info("This customer shows elevated churn risk. Review contract, tenure and service factors.")
    else:
        st.success("The model currently estimates a lower churn probability.")
