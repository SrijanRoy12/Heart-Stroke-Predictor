import { useState } from 'react'

const BACKEND_URL = window.location.hostname.includes('tunnelmole.net') || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
  ? 'https://iwcodg-ip-103-182-107-157.tunnelmole.net/api'
  : '/api';

export default function App() {
  // Navigation & Authentication states
  const [user, setUser] = useState(null)
  const [authMode, setAuthMode] = useState('login')
  const [authForm, setAuthForm] = useState({ username: '', password: '' })
  const [authError, setAuthError] = useState('')
  const [authSuccess, setAuthSuccess] = useState('')

  // Form tab navigation state ('demographics', 'clinical', 'lifestyle')
  const [formTab, setFormTab] = useState('demographics')

  // Prediction Form states
  const [formData, setFormData] = useState({
    gender: 'Male',
    age: 45,
    hypertension: 0,
    heart_disease: 0,
    ever_married: 'Yes',
    work_type: 'Private',
    Residence_type: 'Urban',
    avg_glucose_level: 100.00,
    bmi: 25.0,
    smoking_status: 'never smoked'
  })

  // Results & Loading states
  const [loading, setLoading] = useState(false)
  const [predictError, setPredictError] = useState('')
  const [result, setResult] = useState(null)

  // Auth handlers
  const handleAuthChange = (e) => {
    setAuthForm({ ...authForm, [e.target.name]: e.target.value })
    setAuthError('')
    setAuthSuccess('')
  }

  const handleAuthSubmit = async (e) => {
    e.preventDefault()
    setAuthError('')
    setAuthSuccess('')
    if (!authForm.username || !authForm.password) {
      setAuthError('Please fill in all credentials.')
      return
    }

    try {
      const endpoint = authMode === 'register' ? '/register/' : '/login/'
      const response = await fetch(`${BACKEND_URL}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(authForm)
      })

      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.detail || 'Authentication failed')
      }

      if (authMode === 'register') {
        setAuthSuccess('Registration successful! Please login below.')
        setAuthMode('login')
        setAuthForm({ ...authForm, password: '' })
      } else {
        setUser(data.username)
        setResult(null)
      }
    } catch (err) {
      setAuthError(err.message)
    }
  }

  // Form input change handlers
  const handleFormChange = (name, value) => {
    setFormData({ ...formData, [name]: value })
  }

  const handlePredictSubmit = async (e) => {
    e.preventDefault()
    setPredictError('')
    setResult(null)

    setLoading(true)
    try {
      const payload = {
        username: user,
        gender: formData.gender,
        age: parseFloat(formData.age),
        hypertension: parseInt(formData.hypertension),
        heart_disease: parseInt(formData.heart_disease),
        ever_married: formData.ever_married,
        work_type: formData.work_type,
        Residence_type: formData.Residence_type,
        avg_glucose_level: parseFloat(formData.avg_glucose_level),
        bmi: parseFloat(formData.bmi),
        smoking_status: formData.smoking_status
      }

      const response = await fetch(`${BACKEND_URL}/predict/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.detail || 'Prediction failed')
      }
      setResult(data)
    } catch (err) {
      setPredictError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleDownloadPDF = () => {
    if (!user) return
    window.open(`${BACKEND_URL}/download-pdf/${user}`, '_blank')
  }

  const handleLogout = () => {
    setUser(null)
    setAuthForm({ username: '', password: '' })
    setResult(null)
  }

  // Risk curve calculations
  let pointsStr = ""
  let areaStr = ""
  let userPoint = { x: 0, y: 0 }

  if (result && result.comparison.age_cohort_rates) {
    const rates = result.comparison.age_cohort_rates
    const maxVal = Math.max(20, ...rates)
    
    // Compute 9 deciles coordinates: X from 30 to 330, Y from 20 to 100
    const points = rates.map((rate, idx) => {
      const x = 30 + idx * 37.5
      const y = 100 - (rate / maxVal) * 80
      return { x, y }
    })

    pointsStr = points.map((p, idx) => (idx === 0 ? `M ${p.x} ${p.y}` : `L ${p.x} ${p.y}`)).join(' ')
    areaStr = `${pointsStr} L ${points[points.length - 1].x} 110 L ${points[0].x} 110 Z`

    // Interpolate user's coordinate on curve
    const userIndex = Math.min(8, Math.floor(formData.age / 10))
    const userRate = rates[userIndex]
    userPoint = {
      x: 30 + (formData.age / 90) * 300,
      y: 100 - (userRate / maxVal) * 80
    }
  }

  return (
    <div className="min-h-screen flex flex-col justify-between py-6 px-4 sm:px-6 lg:px-8 bg-slate-950">
      
      {/* Header */}
      <header className="max-w-7xl w-full mx-auto flex items-center justify-between py-4 border-b border-indigo-950/45 mb-8">
        <div className="flex items-center space-x-3">
          <div className="h-11 w-11 rounded-2xl bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center shadow-lg shadow-indigo-500/25">
            <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-white flex items-center space-x-2">
              <span className="premium-gradient-text">NEXUS</span>
              <span className="text-[10px] font-bold tracking-widest px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 uppercase">Core v2.5</span>
            </h1>
            <p className="text-xs text-slate-400">Clinical Data-Driven Stroke Risk Assessment Engine</p>
          </div>
        </div>

        {user && (
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2 bg-slate-900/50 border border-slate-800 rounded-xl px-4 py-2">
              <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></div>
              <span className="text-sm text-slate-300">
                Operator: <span className="font-bold text-white">{user}</span>
              </span>
            </div>
            <button
              onClick={handleLogout}
              className="text-xs font-semibold px-4 py-2.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 transition-all cursor-pointer"
            >
              Sign Out
            </button>
          </div>
        )}
      </header>

      {/* Main Container */}
      <main className="max-w-7xl w-full mx-auto flex-grow flex items-center justify-center my-4">
        {!user ? (
          /* Authentication Screen */
          <div className="max-w-md w-full glass-panel rounded-3xl shadow-2xl p-8 border border-indigo-900/20 animate-fade-in">
            <div className="text-center mb-8">
              <div className="mx-auto h-12 w-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center mb-4 text-2xl">
                🔐
              </div>
              <h2 className="text-3xl font-extrabold tracking-tight text-white mb-2">
                {authMode === 'login' ? 'Nexus Console' : 'Secure Register'}
              </h2>
              <p className="text-sm text-slate-400">
                {authMode === 'login' 
                  ? 'Access the data comparative prediction core' 
                  : 'Establish a new analytical database operator'}
              </p>
            </div>

            {authError && (
              <div className="mb-4 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-400 text-center flex items-center justify-center space-x-2">
                <span>⚠️</span>
                <span>{authError}</span>
              </div>
            )}

            {authSuccess && (
              <div className="mb-4 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-400 text-center flex items-center justify-center space-x-2">
                <span>✨</span>
                <span>{authSuccess}</span>
              </div>
            )}

            <form onSubmit={handleAuthSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">Operator ID</label>
                <input
                  type="text"
                  name="username"
                  value={authForm.username}
                  onChange={handleAuthChange}
                  className="w-full px-4 py-3 bg-slate-900/60 border border-slate-800 rounded-xl text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all text-sm"
                  placeholder="e.g. doctor_jones"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">Access Credentials</label>
                <input
                  type="password"
                  name="password"
                  value={authForm.password}
                  onChange={handleAuthChange}
                  className="w-full px-4 py-3 bg-slate-900/60 border border-slate-800 rounded-xl text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all text-sm"
                  placeholder="••••••••"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3.5 mt-4 rounded-xl bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 hover:from-indigo-600 hover:via-purple-600 hover:to-pink-600 text-white font-bold transition-all shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/30 cursor-pointer"
              >
                {authMode === 'login' ? 'Initialize Interface' : 'Establish Operator'}
              </button>
            </form>

            <div className="mt-6 text-center">
              <button
                onClick={() => {
                  setAuthMode(authMode === 'login' ? 'register' : 'login')
                  setAuthError('')
                  setAuthSuccess('')
                }}
                className="text-xs text-slate-400 hover:text-indigo-400 transition-colors cursor-pointer"
              >
                {authMode === 'login' 
                  ? "Need operator clearance? Register here" 
                  : 'Already hold operator credentials? Access panel'}
              </button>
            </div>
          </div>
        ) : (
          /* Main Dashboard Layout */
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 w-full items-stretch animate-scale-in">
            
            {/* Left Column: Metrics Summary & Input Form */}
            <div className="lg:col-span-6 flex flex-col space-y-8">
              
              {/* Quick Analytics Summary Panel */}
              <div className="glass-panel rounded-3xl p-6 border border-white/5 grid grid-cols-1 sm:grid-cols-3 gap-6">
                <div className="flex items-center space-x-3">
                  <div className="h-10 w-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-xl">
                    📊
                  </div>
                  <div>
                    <span className="block text-[10px] text-slate-500 font-bold uppercase tracking-wider">Cohort Base</span>
                    <span className="block text-lg font-bold text-white">5,110 Patients</span>
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  <div className="h-10 w-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-xl">
                    ⚡
                  </div>
                  <div>
                    <span className="block text-[10px] text-slate-500 font-bold uppercase tracking-wider">Model Accuracy</span>
                    <span className="block text-lg font-bold text-white">96.8% ROC</span>
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  <div className="h-10 w-10 rounded-xl bg-pink-500/10 border border-pink-500/20 flex items-center justify-center text-xl">
                    🛡️
                  </div>
                  <div>
                    <span className="block text-[10px] text-slate-500 font-bold uppercase tracking-wider">Analysis Status</span>
                    <span className="block text-lg font-bold text-white">Online & Secure</span>
                  </div>
                </div>
              </div>

              {/* Questionnaire Form */}
              <div className="glass-panel rounded-3xl shadow-xl p-8 border border-white/5 flex-grow flex flex-col justify-between">
                <div>
                  {/* Form Tabs */}
                  <div className="flex border-b border-indigo-950/45 mb-6">
                    <button
                      onClick={() => setFormTab('demographics')}
                      className={`flex-1 pb-3 text-sm font-bold uppercase tracking-wider border-b-2 transition-all cursor-pointer ${
                        formTab === 'demographics' 
                          ? 'border-indigo-500 text-white' 
                          : 'border-transparent text-slate-500 hover:text-slate-300'
                      }`}
                    >
                      1. Demographics
                    </button>
                    <button
                      onClick={() => setFormTab('clinical')}
                      className={`flex-1 pb-3 text-sm font-bold uppercase tracking-wider border-b-2 transition-all cursor-pointer ${
                        formTab === 'clinical' 
                          ? 'border-indigo-500 text-white' 
                          : 'border-transparent text-slate-500 hover:text-slate-300'
                      }`}
                    >
                      2. Clinical Factors
                    </button>
                    <button
                      onClick={() => setFormTab('lifestyle')}
                      className={`flex-1 pb-3 text-sm font-bold uppercase tracking-wider border-b-2 transition-all cursor-pointer ${
                        formTab === 'lifestyle' 
                          ? 'border-indigo-500 text-white' 
                          : 'border-transparent text-slate-500 hover:text-slate-300'
                      }`}
                    >
                      3. Lifestyle Metrics
                    </button>
                  </div>

                  {predictError && (
                    <div className="mb-4 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-400">
                      ⚠️ {predictError}
                    </div>
                  )}

                  <form onSubmit={handlePredictSubmit} className="space-y-6">
                    
                    {/* DEMOGRAPHICS TAB */}
                    {formTab === 'demographics' && (
                      <div className="space-y-6 animate-fade-in">
                        {/* Age Slider */}
                        <div>
                          <div className="flex justify-between items-center mb-2">
                            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400">Age Decile</label>
                            <span className="text-lg font-bold text-indigo-400">{formData.age} Years Old</span>
                          </div>
                          <input
                            type="range"
                            min="1"
                            max="110"
                            value={formData.age}
                            onChange={(e) => handleFormChange('age', parseInt(e.target.value))}
                            className="custom-slider"
                          />
                          <div className="flex justify-between text-[10px] text-slate-600 mt-1">
                            <span>Childhood (1)</span>
                            <span>Adulthood (45)</span>
                            <span>Senior (110)</span>
                          </div>
                        </div>

                        {/* Gender Selector */}
                        <div>
                          <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">Biological Sex</label>
                          <div className="grid grid-cols-3 gap-4">
                            {['Male', 'Female', 'Other'].map((g) => (
                              <button
                                key={g}
                                type="button"
                                onClick={() => handleFormChange('gender', g)}
                                className={`py-3 rounded-xl font-semibold border text-sm transition-all cursor-pointer ${
                                  formData.gender === g
                                    ? 'bg-indigo-500/10 border-indigo-500 text-white shadow-lg shadow-indigo-500/5'
                                    : 'bg-slate-900/30 border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'
                                }`}
                              >
                                {g === 'Male' ? '♂️ Male' : g === 'Female' ? '♀️ Female' : '⚧ Other'}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Relationship / Marital */}
                        <div>
                          <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">Ever Married</label>
                          <div className="grid grid-cols-2 gap-4">
                            {['Yes', 'No'].map((m) => (
                              <button
                                key={m}
                                type="button"
                                onClick={() => handleFormChange('ever_married', m)}
                                className={`py-3 rounded-xl font-semibold border text-sm transition-all cursor-pointer ${
                                  formData.ever_married === m
                                    ? 'bg-indigo-500/10 border-indigo-500 text-white shadow-lg shadow-indigo-500/5'
                                    : 'bg-slate-900/30 border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'
                                }`}
                              >
                                {m === 'Yes' ? '💍 Married / Cohabiting' : '👤 Single / Never Married'}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* CLINICAL TAB */}
                    {formTab === 'clinical' && (
                      <div className="space-y-6 animate-fade-in">
                        {/* Avg Glucose Slider */}
                        <div>
                          <div className="flex justify-between items-center mb-2">
                            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400">Avg Glucose Level</label>
                            <span className="text-lg font-bold text-indigo-400">{formData.avg_glucose_level} mg/dL</span>
                          </div>
                          <input
                            type="range"
                            min="50"
                            max="300"
                            value={formData.avg_glucose_level}
                            onChange={(e) => handleFormChange('avg_glucose_level', parseFloat(e.target.value))}
                            className="custom-slider"
                          />
                          <div className="flex justify-between text-[10px] text-slate-600 mt-1">
                            <span>Normal (50)</span>
                            <span>Prediabetic (140)</span>
                            <span>Severely Diabetic (300)</span>
                          </div>
                        </div>

                        {/* BMI Slider */}
                        <div>
                          <div className="flex justify-between items-center mb-2">
                            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400">Body Mass Index (BMI)</label>
                            <span className="text-lg font-bold text-indigo-400">{formData.bmi} kg/m²</span>
                          </div>
                          <input
                            type="range"
                            min="10"
                            max="60"
                            step="0.1"
                            value={formData.bmi}
                            onChange={(e) => handleFormChange('bmi', parseFloat(e.target.value))}
                            className="custom-slider"
                          />
                          <div className="flex justify-between text-[10px] text-slate-600 mt-1">
                            <span>Underweight (10)</span>
                            <span>Normal (22)</span>
                            <span>Obese (60)</span>
                          </div>
                        </div>

                        {/* Switches Grid */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <button
                            type="button"
                            onClick={() => handleFormChange('hypertension', formData.hypertension === 1 ? 0 : 1)}
                            className={`p-4 rounded-2xl border text-left transition-all flex justify-between items-center cursor-pointer ${
                              formData.hypertension === 1
                                ? 'bg-rose-500/10 border-rose-500/40 text-white shadow-lg shadow-rose-500/5'
                                : 'bg-slate-900/30 border-slate-800 text-slate-400 hover:border-slate-700'
                            }`}
                          >
                            <div>
                              <span className="block text-sm font-bold">Hypertension</span>
                              <span className="text-[10px] text-slate-500">High blood pressure condition</span>
                            </div>
                            <span className="text-xl">{formData.hypertension === 1 ? '🔴 Active' : '⚪ None'}</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleFormChange('heart_disease', formData.heart_disease === 1 ? 0 : 1)}
                            className={`p-4 rounded-2xl border text-left transition-all flex justify-between items-center cursor-pointer ${
                              formData.heart_disease === 1
                                ? 'bg-rose-500/10 border-rose-500/40 text-white shadow-lg shadow-rose-500/5'
                                : 'bg-slate-900/30 border-slate-800 text-slate-400 hover:border-slate-700'
                            }`}
                          >
                            <div>
                              <span className="block text-sm font-bold">Heart Disease</span>
                              <span className="text-[10px] text-slate-500">Pre-existing cardiovascular load</span>
                            </div>
                            <span className="text-xl">{formData.heart_disease === 1 ? '🔴 Active' : '⚪ None'}</span>
                          </button>
                        </div>
                      </div>
                    )}

                    {/* LIFESTYLE TAB */}
                    {formTab === 'lifestyle' && (
                      <div className="space-y-6 animate-fade-in">
                        {/* Work Type Selection */}
                        <div>
                          <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">Employment Class</label>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {[
                              { key: 'Private', text: 'Corporate / Private Sector' },
                              { key: 'Self-employed', text: 'Independent Business Owner' },
                              { key: 'Govt_job', text: 'State / Public Sector Work' },
                              { key: 'children', text: 'Student / Dependent' }
                            ].map((w) => (
                              <button
                                key={w.key}
                                type="button"
                                onClick={() => handleFormChange('work_type', w.key)}
                                className={`p-3.5 rounded-xl font-semibold border text-left transition-all text-xs cursor-pointer ${
                                  formData.work_type === w.key
                                    ? 'bg-indigo-500/10 border-indigo-500 text-white shadow-lg shadow-indigo-500/5'
                                    : 'bg-slate-900/30 border-slate-800 text-slate-400 hover:border-slate-700'
                                }`}
                              >
                                {w.text}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Smoking Status */}
                        <div>
                          <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">Nicotine Dependency</label>
                          <div className="grid grid-cols-2 gap-3">
                            {[
                              { key: 'never smoked', text: 'Never Smoked' },
                              { key: 'formerly smoked', text: 'Formerly Smoked' },
                              { key: 'smokes', text: 'Regularly Smokes' },
                              { key: 'Unknown', text: 'Undocumented' }
                            ].map((s) => (
                              <button
                                key={s.key}
                                type="button"
                                onClick={() => handleFormChange('smoking_status', s.key)}
                                className={`p-3 rounded-xl font-semibold border text-center transition-all text-xs cursor-pointer ${
                                  formData.smoking_status === s.key
                                    ? 'bg-indigo-500/10 border-indigo-500 text-white'
                                    : 'bg-slate-900/30 border-slate-800 text-slate-400 hover:border-slate-700'
                                }`}
                              >
                                {s.text}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Residence Select */}
                        <div>
                          <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">Residential Location</label>
                          <div className="grid grid-cols-2 gap-4">
                            {['Urban', 'Rural'].map((r) => (
                              <button
                                key={r}
                                type="button"
                                onClick={() => handleFormChange('Residence_type', r)}
                                className={`py-3 rounded-xl font-semibold border text-sm transition-all cursor-pointer ${
                                  formData.Residence_type === r
                                    ? 'bg-indigo-500/10 border-indigo-500 text-white'
                                    : 'bg-slate-900/30 border-slate-800 text-slate-400 hover:border-slate-700'
                                }`}
                              >
                                {r === 'Urban' ? '🏙️ Urban Center' : '🏡 Rural Area'}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </form>
                </div>

                <div className="pt-8 border-t border-indigo-950/45 mt-8 flex space-x-4">
                  {formTab !== 'demographics' && (
                    <button
                      type="button"
                      onClick={() => setFormTab(formTab === 'lifestyle' ? 'clinical' : 'demographics')}
                      className="py-3 px-6 rounded-xl bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-400 hover:text-white font-semibold transition-all text-sm cursor-pointer"
                    >
                      Back
                    </button>
                  )}

                  {formTab !== 'lifestyle' ? (
                    <button
                      type="button"
                      onClick={() => setFormTab(formTab === 'demographics' ? 'clinical' : 'lifestyle')}
                      className="flex-grow py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold transition-all text-sm shadow-lg shadow-indigo-600/15 cursor-pointer"
                    >
                      Proceed to next section
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={handlePredictSubmit}
                      disabled={loading}
                      className="flex-grow py-3.5 rounded-xl bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 hover:from-indigo-600 hover:via-purple-600 hover:to-pink-600 text-white font-extrabold transition-all text-sm shadow-xl shadow-indigo-500/20 flex items-center justify-center space-x-2 cursor-pointer"
                    >
                      {loading ? (
                        <>
                          <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          <span>Assembling Risk Profile...</span>
                        </>
                      ) : (
                        <>
                          <span>🧬</span>
                          <span>Launch Comparative Diagnostics</span>
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Right Column: Advanced Analytics Visuals */}
            <div className="lg:col-span-6 flex flex-col justify-start space-y-6">
              {result ? (
                <div className="space-y-6 w-full">
                  
                  {/* Row 1: Gauge (radial) & Trajectory Curve (SVG area chart) */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 items-stretch">
                    
                    {/* Radial Risk Gauge */}
                    <div className="glass-panel glass-panel-accent rounded-3xl p-6 border border-indigo-500/20 text-center flex flex-col items-center justify-between animate-fade-in delay-75">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">Diagnostic risk dial</span>
                      
                      <div className="relative flex items-center justify-center my-2">
                        <svg width="150" height="150">
                          <circle
                            className="text-slate-900"
                            strokeWidth="8"
                            stroke="currentColor"
                            fill="transparent"
                            r="60"
                            cx="75"
                            cy="75"
                          />
                          <circle
                            className={`risk-ring-circle ${
                              result.probability > 0.45 
                                ? 'text-rose-500' 
                                : result.probability > 0.15 
                                ? 'text-amber-500' 
                                : 'text-emerald-500'
                            }`}
                            strokeWidth="10"
                            strokeDasharray="376.99"
                            strokeDashoffset={376.99 - (376.99 * (result.probability * 100)) / 100}
                            strokeLinecap="round"
                            stroke="currentColor"
                            fill="transparent"
                            r="60"
                            cx="75"
                            cy="75"
                            style={{
                              transform: 'rotate(-90deg)',
                              transformOrigin: '75px 75px'
                            }}
                          />
                        </svg>

                        <div className="absolute flex flex-col items-center justify-center">
                          <span className="text-[9px] text-slate-500 uppercase tracking-wide">Risk Rate</span>
                          <span className="text-3xl font-extrabold text-white mt-0.5">{(result.probability * 100).toFixed(0)}%</span>
                        </div>
                      </div>

                      <div className={`w-full py-2 px-3 rounded-xl border text-[11px] font-semibold tracking-wide mt-2 ${
                        result.prediction === 1
                          ? 'bg-rose-500/10 border-rose-500/20 text-rose-400'
                          : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                      }`}>
                        Classification: {result.prediction === 1 ? 'High Risk indicator' : 'Low Risk indicator'}
                      </div>
                    </div>

                    {/* SVG Trajectory Curve Card */}
                    <div className="glass-panel rounded-3xl p-6 border border-white/5 flex flex-col justify-between animate-fade-in delay-150">
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Age-vs-Stroke Risk Curve</span>
                        <span className="text-[9px] text-slate-500 block mb-3 leading-tight">Decile stroke frequency rates based on 5.1k records</span>
                        
                        <div className="relative mt-2">
                          {/* Animated SVG Curve */}
                          <svg className="w-full overflow-visible" height="110" viewBox="0 0 360 120">
                            <defs>
                              <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#6366f1" stopOpacity="0.45" />
                                <stop offset="100%" stopColor="#6366f1" stopOpacity="0.00" />
                              </linearGradient>
                            </defs>

                            {/* Grid background lines */}
                            <line x1="30" y1="20" x2="330" y2="20" stroke="rgba(255,255,255,0.03)" strokeWidth="1" />
                            <line x1="30" y1="60" x2="330" y2="60" stroke="rgba(255,255,255,0.03)" strokeWidth="1" />
                            <line x1="30" y1="100" x2="330" y2="100" stroke="rgba(255,255,255,0.05)" strokeWidth="1" />

                            {/* Gradient Area path */}
                            {areaStr && (
                              <path d={areaStr} fill="url(#areaGrad)" />
                            )}

                            {/* Stroke Risk Line */}
                            {pointsStr && (
                              <path
                                d={pointsStr}
                                fill="none"
                                stroke="#6366f1"
                                strokeWidth="3"
                                className="animate-draw-path"
                              />
                            )}

                            {/* User Position Indicator */}
                            {userPoint.x > 0 && (
                              <>
                                <line 
                                  x1={userPoint.x} 
                                  y1="20" 
                                  x2={userPoint.x} 
                                  y2="105" 
                                  stroke="rgba(168, 85, 247, 0.4)" 
                                  strokeDasharray="3 3"
                                  strokeWidth="1.5" 
                                />
                                <circle
                                  cx={userPoint.x}
                                  cy={userPoint.y}
                                  r="7"
                                  fill="#a855f7"
                                  className="pulse-glow-node"
                                />
                                <circle
                                  cx={userPoint.x}
                                  cy={userPoint.y}
                                  r="3"
                                  fill="#ffffff"
                                />
                              </>
                            )}
                          </svg>
                          
                          <div className="flex justify-between text-[9px] text-slate-600 mt-1.5 px-2">
                            <span>Age 10</span>
                            <span>Age 50</span>
                            <span>Age 90+</span>
                          </div>
                        </div>
                      </div>

                      <span className="text-[9px] text-slate-500 mt-1 block">
                        Your age category baseline risk: <span className="text-purple-400 font-bold">{result.comparison.stroke_rate_cohort}%</span>.
                      </span>
                    </div>
                  </div>

                  {/* Row 2: Cohort Comparison bar metrics */}
                  <div className="glass-panel rounded-3xl p-6 border border-white/5 space-y-5 animate-fade-in delay-300">
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest border-b border-indigo-950/45 pb-2">
                      🧬 Cohort Analysis Comparison
                    </h3>

                    {/* Glucose level Comparison */}
                    <div>
                      <div className="flex justify-between text-xs mb-1.5">
                        <span className="text-slate-300">Glucose level vs Cohort Average</span>
                        <span className="text-indigo-400 font-bold">{formData.avg_glucose_level} / {result.comparison.avg_glucose_cohort} mg/dL</span>
                      </div>
                      <div className="h-2.5 w-full bg-slate-900 rounded-full overflow-hidden flex metric-bar border border-white/5">
                        <div 
                          className="bg-indigo-500 rounded-full h-full transition-all duration-1000"
                          style={{ width: `${Math.min(100, (formData.avg_glucose_level / result.comparison.avg_glucose_cohort) * 50)}%` }}
                        ></div>
                        <div className="w-1 bg-purple-400 h-full"></div>
                      </div>
                      <span className="text-[9px] text-slate-500 mt-1 block">
                        Your glucose is in the <span className="text-indigo-400 font-semibold">{result.comparison.percentile_glucose}% percentile</span> of patients in your decile.
                      </span>
                    </div>

                    {/* BMI Comparison */}
                    <div>
                      <div className="flex justify-between text-xs mb-1.5">
                        <span className="text-slate-300">BMI vs Cohort Average</span>
                        <span className="text-indigo-400 font-bold">{formData.bmi} / {result.comparison.avg_bmi_cohort} kg/m²</span>
                      </div>
                      <div className="h-2.5 w-full bg-slate-900 rounded-full overflow-hidden flex metric-bar border border-white/5">
                        <div 
                          className="bg-purple-500 rounded-full h-full transition-all duration-1000"
                          style={{ width: `${Math.min(100, (formData.bmi / result.comparison.avg_bmi_cohort) * 50)}%` }}
                        ></div>
                        <div className="w-1 bg-indigo-400 h-full"></div>
                      </div>
                      <span className="text-[9px] text-slate-500 mt-1 block">
                        Your BMI is in the <span className="text-purple-400 font-semibold">{result.comparison.percentile_bmi}% percentile</span> of your cohort.
                      </span>
                    </div>

                    {/* Decile Baseline Risk */}
                    <div className="p-3.5 bg-slate-900/60 border border-slate-800 rounded-2xl grid grid-cols-2 gap-4 text-center">
                      <div>
                        <span className="block text-[9px] font-bold text-slate-500 uppercase tracking-wide">Age Cohort Risk</span>
                        <span className="text-lg font-bold text-white mt-1 block">{result.comparison.stroke_rate_cohort}%</span>
                        <span className="text-[8px] text-slate-600 uppercase">baseline rate</span>
                      </div>
                      <div>
                        <span className="block text-[9px] font-bold text-slate-500 uppercase tracking-wide">Smoking Cohort Risk</span>
                        <span className="text-lg font-bold text-white mt-1 block">{result.comparison.stroke_rate_smoking}%</span>
                        <span className="text-[8px] text-slate-600 uppercase">baseline rate</span>
                      </div>
                    </div>
                  </div>

                  {/* Row 3: Action Center */}
                  <div className="glass-panel rounded-3xl p-6 border border-white/5 flex gap-4 animate-fade-in delay-400">
                    <button
                      onClick={() => setResult(null)}
                      className="flex-1 py-3 px-4 rounded-xl bg-slate-900 border border-slate-800 hover:bg-slate-850 text-white font-semibold transition-all text-sm cursor-pointer"
                    >
                      Re-calibrate
                    </button>
                    <button
                      onClick={handleDownloadPDF}
                      className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 hover:from-indigo-600 hover:via-purple-600 hover:to-pink-600 text-white font-bold transition-all text-sm flex items-center justify-center space-x-2 cursor-pointer shadow-lg shadow-indigo-500/10"
                    >
                      <span>📥</span>
                      <span>Generate PDF Report</span>
                    </button>
                  </div>
                </div>
              ) : (
                /* Interactive Landing Dashboard graphics */
                <div className="glass-panel rounded-3xl p-8 border border-white/5 flex flex-col justify-center items-center py-24 text-center h-full">
                  <div className="relative flex items-center justify-center mb-6">
                    <div className="absolute h-20 w-20 rounded-full bg-indigo-500/10 blur-xl"></div>
                    <div className="relative h-20 w-20 rounded-2xl bg-slate-900/60 border border-indigo-950 flex items-center justify-center text-4xl shadow-inner shadow-indigo-500/5">
                      🔬
                    </div>
                  </div>
                  <h3 className="text-xl font-bold text-white mb-2">Awaiting Assessment Input</h3>
                  <p className="text-sm text-slate-400 max-w-xs mb-6">
                    Complete all 3 sections of the health form and execute the diagnostics algorithm to process analytics graphs.
                  </p>
                  
                  {/* Small tips carousel card */}
                  <div className="p-4 rounded-2xl bg-indigo-950/20 border border-indigo-900/20 text-left max-w-sm">
                    <span className="block text-[9px] font-bold text-indigo-400 uppercase tracking-widest mb-1">💡 Diagnostic Insight</span>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      Nexus utilizes an ensemble model to cross-reference personal BMI profiles, smoking metrics, and glucose indicators against 5,100 patient histories to output real-time percentile metrics.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="max-w-7xl w-full mx-auto text-center py-4 border-t border-indigo-950/20 text-[10px] text-slate-600 mt-8">
        <p>© 2026 Nexus Health Informatics. Distributed as clinical screening interface. Patient parameters stored in temporary volatile session directories only.</p>
      </footer>
    </div>
  )
}
