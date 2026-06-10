
# from fastapi import FastAPI, HTTPException
# from pydantic import BaseModel
# import joblib
# import numpy as np
# import pandas as pd
# from fastapi.middleware.cors import CORSMiddleware
# # Load trained model and encoders
# model = joblib.load("stroketron_model.pkl")

# app = FastAPI()

# app.add_middleware(
#     CORSMiddleware,
#     allow_origins=["*"],  # Or ["http://localhost:5173"] for stricter security
#     allow_credentials=True,
#     allow_methods=["*"],
#     allow_headers=["*"],
# )

# # Define input features
# class StrokeInput(BaseModel):
#     gender: str
#     age: float
#     hypertension: int
#     heart_disease: int
#     ever_married: str
#     work_type: str
#     Residence_type: str
#     avg_glucose_level: float
#     bmi: float
#     smoking_status: str

# # Label encoders used during training
# def encode_input(data):
#     le_dict = {
#         'gender': {'Male': 1, 'Female': 0, 'Other': 2},
#         'ever_married': {'Yes': 1, 'No': 0},
#         'work_type': {'Private': 2, 'Self-employed': 3, 'Govt_job': 0, 'children': 1, 'Never_worked': 4},
#         'Residence_type': {'Urban': 1, 'Rural': 0},
#         'smoking_status': {'formerly smoked': 1, 'never smoked': 2, 'smokes': 3, 'Unknown': 0}
#     }

#     for col, mapping in le_dict.items():
#         if data[col] not in mapping:
#             raise HTTPException(status_code=400, detail=f"Invalid categorical input: '{data[col]}' for {col}")
#         data[col] = mapping[data[col]]

#     return data

# @app.post("/predict/")
# def predict_stroke_risk(input_data: StrokeInput):
#     try:
#         # Convert to dict and encode
#         data = encode_input(input_data.dict())
#         df = pd.DataFrame([data])

#         # Predict probability
#         probability = model.predict_proba(df)[0][1]  # index 1 = probability of stroke
#         prediction = int(probability > 0.5)

#         return {
#             "prediction": prediction,
#             "probability": round(probability, 3),
#             "message": f"The probability of having a stroke is {round(probability * 100, 2)}%"
#         }
#     except Exception as e:
#         raise HTTPException(status_code=500, detail=str(e))
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import joblib
import numpy as np
import pandas as pd
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from datetime import datetime
import os
from fpdf import FPDF

# Load trained model
model = joblib.load("stroketron_model.pkl")

# Load and clean dataset for comparative analytics
df_dataset = pd.read_csv("stroke-data.csv")
df_dataset['bmi'] = pd.to_numeric(df_dataset['bmi'], errors='coerce')
bmi_mean = df_dataset['bmi'].mean()
df_dataset['bmi'] = df_dataset['bmi'].fillna(bmi_mean)

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# User registration (temporary in-memory)
users = {}

class RegisterInput(BaseModel):
    username: str
    password: str

class StrokeInput(BaseModel):
    username: str
    gender: str
    age: float
    hypertension: int
    heart_disease: int
    ever_married: str
    work_type: str
    Residence_type: str
    avg_glucose_level: float
    bmi: float
    smoking_status: str

# Label encoding
def encode_input(data):
    le_dict = {
        'gender': {'Male': 1, 'Female': 0, 'Other': 2},
        'ever_married': {'Yes': 1, 'No': 0},
        'work_type': {'Private': 2, 'Self-employed': 3, 'Govt_job': 0, 'children': 1, 'Never_worked': 4},
        'Residence_type': {'Urban': 1, 'Rural': 0},
        'smoking_status': {'formerly smoked': 1, 'never smoked': 2, 'smokes': 3, 'Unknown': 0}
    }

    for col, mapping in le_dict.items():
        if data[col] not in mapping:
            raise HTTPException(status_code=400, detail=f"Invalid input: '{data[col]}' for {col}")
        data[col] = mapping[data[col]]

    return data

# Registration endpoint
@app.post("/api/register/")
def register_user(user: RegisterInput):
    if user.username in users:
        raise HTTPException(status_code=400, detail="Username already exists.")
    users[user.username] = user.password
    return {"message": f"User {user.username} registered successfully."}

# Login endpoint
@app.post("/api/login/")
def login_user(user: RegisterInput):
    if user.username not in users or users[user.username] != user.password:
        raise HTTPException(status_code=401, detail="Invalid username or password.")
    return {"message": "Login successful.", "username": user.username}

# Prediction endpoint
@app.post("/api/predict/")
def predict_stroke_risk(input_data: StrokeInput):
    try:
        if input_data.username not in users:
            raise HTTPException(status_code=401, detail="User not registered.")

        raw_data = input_data.dict()
        username = raw_data.pop('username')
        encoded_data = encode_input(raw_data)
        df = pd.DataFrame([encoded_data])

        probability = model.predict_proba(df)[0][1]
        prediction = int(probability > 0.5)

        # Compute cohort comparative statistics
        user_age = raw_data['age']
        age_min = max(0, user_age - 5)
        age_max = user_age + 5
        cohort = df_dataset[(df_dataset['age'] >= age_min) & (df_dataset['age'] <= age_max)]
        if cohort.empty:
            cohort = df_dataset
        
        avg_bmi_cohort = float(cohort['bmi'].mean())
        avg_glucose_cohort = float(cohort['avg_glucose_level'].mean())
        
        # Stroke rates
        stroke_rate_cohort = float(cohort['stroke'].mean())
        user_smoke = raw_data['smoking_status']
        smoke_cohort = df_dataset[df_dataset['smoking_status'] == user_smoke]
        stroke_rate_smoking = float(smoke_cohort['stroke'].mean()) if not smoke_cohort.empty else float(df_dataset['stroke'].mean())
        
        # Percentiles
        user_glucose = raw_data['avg_glucose_level']
        user_bmi = raw_data['bmi']
        percentile_glucose = float((cohort['avg_glucose_level'] < user_glucose).mean() * 100)
        percentile_bmi = float((cohort['bmi'] < user_bmi).mean() * 100)

        # Decile stroke rates for risk curve
        age_bins = [0, 10, 20, 30, 40, 50, 60, 70, 80, 120]
        age_labels = ['0-10', '10-20', '20-30', '30-40', '40-50', '50-60', '60-70', '70-80', '80+']
        df_temp = df_dataset.copy()
        df_temp['age_group'] = pd.cut(df_temp['age'], bins=age_bins, labels=age_labels)
        age_cohort_rates = df_temp.groupby('age_group')['stroke'].mean().fillna(0).tolist()

        result = {
            "prediction": prediction,
            "probability": round(probability, 3),
            "message": f"The probability of having a stroke is {round(probability * 100, 2)}%",
            "username": username,
            "comparison": {
                "avg_bmi_cohort": round(avg_bmi_cohort, 2),
                "avg_glucose_cohort": round(avg_glucose_cohort, 2),
                "stroke_rate_cohort": round(stroke_rate_cohort * 100, 2),
                "stroke_rate_smoking": round(stroke_rate_smoking * 100, 2),
                "percentile_glucose": round(percentile_glucose, 1),
                "percentile_bmi": round(percentile_bmi, 1),
                "age_cohort_rates": [round(rate * 100, 2) for rate in age_cohort_rates]
            }
        }

        # Save to generate later as PDF
        os.makedirs("reports", exist_ok=True)
        pdf_path = f"reports/{username}_stroke_report.pdf"
        generate_pdf_report(raw_data, result, pdf_path)

        result["pdf_path"] = pdf_path
        return result

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# PDF Generation function
def generate_pdf_report(user_input, result, filename):
    pdf = FPDF()
    pdf.add_page()
    pdf.set_font("Arial", size=12)

    pdf.cell(200, 10, txt="Stroke Prediction Report", ln=True, align="C")
    pdf.cell(200, 10, txt=f"Date: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}", ln=True, align="C")
    pdf.ln(10)

    for key, val in user_input.items():
        pdf.cell(200, 10, txt=f"{key.replace('_',' ').title()}: {val}", ln=True)

    pdf.ln(10)
    pdf.cell(200, 10, txt=result["message"], ln=True)
    pdf.cell(200, 10, txt=f"Prediction: {'Stroke' if result['prediction'] == 1 else 'No Stroke'}", ln=True)

    pdf.output(filename)

# PDF download route
@app.get("/api/download-pdf/{username}")
def download_pdf(username: str):
    pdf_path = f"reports/{username}_stroke_report.pdf"
    if os.path.exists(pdf_path):
        return FileResponse(path=pdf_path, filename=f"{username}_stroke_report.pdf", media_type='application/pdf')
    else:
        raise HTTPException(status_code=404, detail="PDF not found.")
