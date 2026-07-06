import { useEffect, useState } from "react";
import { getPreferences, updatePreferences } from "./api";

const DIET_OPTIONS = [
  { label: "Vegetarian", value: "vegetarian" },
  { label: "Non-Vegetarian", value: "non_vegetarian" },
  { label: "Pescatarian", value: "pescatarian" },
];

const GENDER_OPTIONS = [
  { label: "Male", value: "male" },
  { label: "Female", value: "female" },
  { label: "Other", value: "other" },
];

const COMMON_ALLERGIES = ["Peanut", "Dairy", "Gluten", "Shellfish"];

function sameAllergy(a, b) {
  return a.toLowerCase() === b.toLowerCase();
}

const ACTIVITY_LEVELS = [
  { label: "Sedentary", value: "sedentary" },
  { label: "Light", value: "light" },
  { label: "Moderate", value: "moderate" },
  { label: "Active", value: "active" },
  { label: "Very Active", value: "very_active" },
];

// Standard Mifflin-St Jeor activity multipliers (BMR -> TDEE).
const ACTIVITY_MULTIPLIERS = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  very_active: 1.9,
};

const MIN_CALORIE_GOAL = 1000;

// Mifflin-St Jeor: BMR from weight/height/age/gender, scaled to TDEE by activity level.
function estimateGoals({ weight, height, age, gender, activityLevel }) {
  const w = Number(weight);
  const genderOffset = gender === "male" ? 5 : gender === "female" ? -161 : -78;
  const bmr = 10 * w + 6.25 * Number(height) - 5 * Number(age) + genderOffset;
  const tdee = bmr * (ACTIVITY_MULTIPLIERS[activityLevel] ?? 1.2);
  return {
    calorieGoal: Math.max(MIN_CALORIE_GOAL, Math.round(tdee)),
    proteinGoal: Math.round(w * 1.6),
  };
}

function Preferences({ onSaved }) {
  const [step, setStep] = useState(1);
  const [dietType, setDietType] = useState("non_vegetarian");
  const [calorieGoal, setCalorieGoal] = useState(2000);
  const [proteinGoal, setProteinGoal] = useState(50);
  const [allergies, setAllergies] = useState([]);
  const [customAllergy, setCustomAllergy] = useState("");
  const [gender, setGender] = useState("");
  const [height, setHeight] = useState("");
  const [weight, setWeight] = useState("");
  const [age, setAge] = useState("");
  const [activityLevel, setActivityLevel] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [stepError, setStepError] = useState("");

  useEffect(() => {
    async function loadPreferences() {
      try {
        const data = await getPreferences();
        setDietType(data.diet_type || "non_vegetarian");
        setCalorieGoal(data.daily_cal_goal ?? 2000);
        setProteinGoal(data.daily_prot_goal ?? 50);
        setAllergies(data.allergies || []);
        setGender(data.gender ?? "");
        setHeight(data.height ?? "");
        setWeight(data.weight ?? "");
        setAge(data.age ?? "");
        setActivityLevel(data.activity_level ?? "");

        const hasBodyDetails =
          Boolean(data.gender) &&
          data.height != null &&
          data.weight != null &&
          data.age != null &&
          Boolean(data.activity_level);
        setStep(hasBodyDetails ? 2 : 1);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    loadPreferences();
  }, []);

  function toggleAllergy(tag) {
    setAllergies((prev) =>
      prev.includes(tag) ? prev.filter((a) => a !== tag) : [...prev, tag]
    );
  }

  function addCustomAllergy() {
    const tag = customAllergy.trim();
    if (!tag) return;
    if (!allergies.some((a) => sameAllergy(a, tag))) {
      setAllergies((prev) => [...prev, tag]);
    }
    setCustomAllergy("");
  }

  function handleCustomAllergyKeyDown(e) {
    if (e.key === "Enter") {
      e.preventDefault();
      addCustomAllergy();
    }
  }

  function handleContinue() {
    if (!gender || height === "" || weight === "" || age === "" || !activityLevel) {
      setStepError("Please fill in gender, height, weight, age, and activity level to continue.");
      return;
    }

    const h = Number(height);
    const w = Number(weight);
    const a = Number(age);

    if (h < 50 || h > 300) {
      setStepError("Please enter a valid height (50cm - 300cm).");
      return;
    }
    if (w < 20 || w > 500) {
      setStepError("Please enter a valid weight (20kg - 500kg).");
      return;
    }
    if (a < 10 || a > 120) {
      setStepError("Please enter a valid age (10 - 120).");
      return;
    }

    setStepError("");
    const goals = estimateGoals({ weight, height, age, gender, activityLevel });
    setCalorieGoal(goals.calorieGoal);
    setProteinGoal(goals.proteinGoal);
    setStep(2);
  }

  async function handleSave() {
    setError("");
    setSuccess("");
    setSaving(true);
    try {
      const finalCalorieGoal = Math.min(8000, Math.max(MIN_CALORIE_GOAL, Number(calorieGoal) || MIN_CALORIE_GOAL));
      const finalProteinGoal = Math.min(600, Math.max(0, Number(proteinGoal) || 0));
      setCalorieGoal(finalCalorieGoal);
      setProteinGoal(finalProteinGoal);
      await updatePreferences({
        diet_type: dietType,
        daily_cal_goal: finalCalorieGoal,
        daily_prot_goal: finalProteinGoal,
        allergies,
        gender: gender === "" ? null : gender,
        height: height === "" ? null : Number(height),
        weight: weight === "" ? null : Number(weight),
        age: age === "" ? null : Number(age),
        activity_level: activityLevel === "" ? null : activityLevel,
      });
      setSuccess("Preferences saved.");
      onSaved?.();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="card preferences-card">
        <p>Loading preferences...</p>
      </div>
    );
  }

  return (
    <div className="card preferences-card">
      <h2>Preferences</h2>

      {step === 1 ? (
        <>
          <section className="pref-section">
            <label className="pref-label">Gender</label>
            <div className="pill-row">
              {GENDER_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  className={`pill-button ${gender === option.value ? "selected" : ""}`}
                  onClick={() => setGender(option.value)}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </section>

          <section className="pref-section">
            <label className="pref-label">Body Details</label>
            <div className="goal-row">
              <div className="goal-field">
                <span className="goal-field-label">Height (cm)</span>
                <input
                  type="number"
                  min="0"
                  value={height}
                  onChange={(e) => setHeight(e.target.value)}
                />
              </div>
              <div className="goal-field">
                <span className="goal-field-label">Weight (kg)</span>
                <input
                  type="number"
                  min="0"
                  value={weight}
                  onChange={(e) => setWeight(e.target.value)}
                />
              </div>
            </div>
            <div className="goal-row">
              <div className="goal-field">
                <span className="goal-field-label">Age</span>
                <input
                  type="number"
                  min="0"
                  value={age}
                  onChange={(e) => setAge(e.target.value)}
                />
              </div>
              <div className="goal-field">
                <span className="goal-field-label">Activity Level</span>
                <select
                  value={activityLevel}
                  onChange={(e) => setActivityLevel(e.target.value)}
                >
                  <option value="">Select...</option>
                  {ACTIVITY_LEVELS.map((level) => (
                    <option key={level.value} value={level.value}>
                      {level.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </section>

          {stepError && <p className="error">{stepError}</p>}

          <button type="button" onClick={handleContinue}>
            Continue
          </button>
        </>
      ) : (
        <>
          <button type="button" className="link-button" onClick={() => setStep(1)}>
            ← Edit body details
          </button>

          <section className="pref-section">
            <label className="pref-label">Diet Type</label>
            <div className="pill-row">
              {DIET_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  className={`pill-button ${dietType === option.value ? "selected" : ""}`}
                  onClick={() => setDietType(option.value)}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </section>

          <section className="pref-section">
            <label className="pref-label">Daily Goals</label>
            <p className="hint-text hint-text-lead">
              Estimated from your body details — feel free to adjust (calorie goal can't go below {MIN_CALORIE_GOAL}).
            </p>
            <div className="goal-row">
              <div className="goal-field">
                <span className="goal-field-label">Daily Calorie Goal</span>
                <input
                  type="number"
                  min={MIN_CALORIE_GOAL}
                  value={calorieGoal}
                  onChange={(e) => setCalorieGoal(e.target.value)}
                />
              </div>
              <div className="goal-field">
                <span className="goal-field-label">Daily Protein Goal (g)</span>
                <input
                  type="number"
                  min="0"
                  value={proteinGoal}
                  onChange={(e) => setProteinGoal(e.target.value)}
                />
              </div>
            </div>
          </section>

          <section className="pref-section">
            <label className="pref-label">Allergies</label>
            <div className="pill-row">
              {COMMON_ALLERGIES.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  className={`pill-button ${allergies.some((a) => sameAllergy(a, tag)) ? "selected" : ""}`}
                  onClick={() => toggleAllergy(tag)}
                >
                  {tag}
                </button>
              ))}
              {allergies
                .filter((a) => !COMMON_ALLERGIES.some((c) => sameAllergy(c, a)))
                .map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    className="pill-button selected"
                    onClick={() => toggleAllergy(tag)}
                  >
                    {tag}
                  </button>
                ))}
            </div>

            <div className="custom-allergy-row">
              <input
                type="text"
                placeholder="Add custom allergy"
                value={customAllergy}
                onChange={(e) => setCustomAllergy(e.target.value)}
                onKeyDown={handleCustomAllergyKeyDown}
              />
              <button type="button" className="add-button" onClick={addCustomAllergy}>
                Add
              </button>
            </div>
            <p className="hint-text">Please enter one at a time</p>
          </section>

          <button type="button" onClick={handleSave} disabled={saving}>
            {saving ? "Saving..." : "Save Preferences"}
          </button>

          {error && <p className="error">{error}</p>}
          {success && <p className="success">{success}</p>}
        </>
      )}
    </div>
  );
}

export default Preferences;
