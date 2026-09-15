document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("planner-form");
  const resetBtn = document.getElementById("btn-reset");
  const resultsBox = document.getElementById("results-box");
  const emptyState = document.getElementById("results-empty");

  // Format currency into readable Indian Rupees (INR)
  const formatRupee = (value) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0
    }).format(Math.round(value));
  };

  const clearErrors = () => {
    document.querySelectorAll(".error-text").forEach((el) => (el.textContent = ""));
    document.querySelectorAll("input").forEach((el) => el.classList.remove("input-invalid"));
  };

  const markError = (inputId, message) => {
    const input = document.getElementById(inputId);
    const errSpan = document.getElementById(`${inputId}-err`);
    if (input && errSpan) {
      input.classList.add("input-invalid");
      errSpan.textContent = message;
    }
  };

  // Pure validation function without side effects
  const validateForm = (data) => {
    let isValid = true;
    clearErrors();

    if (!data.goalName || data.goalName.trim().length === 0) {
      markError("goal-name", "Goal name is required.");
      isValid = false;
    }

    if (isNaN(data.goalAmount) || data.goalAmount <= 0) {
      markError("goal-amount", "Goal amount must be greater than ₹0.");
      isValid = false;
    }

    if (isNaN(data.timeHorizon) || data.timeHorizon < 1 || data.timeHorizon > 40) {
      markError("time-horizon", "Enter a horizon between 1 and 40 years.");
      isValid = false;
    }

    if (isNaN(data.inflationRate) || data.inflationRate < 0 || data.inflationRate > 30) {
      markError("inflation-rate", "Enter inflation between 0% and 30%.");
      isValid = false;
    }

    if (isNaN(data.returnRate) || data.returnRate < 0 || data.returnRate > 40) {
      markError("return-rate", "Enter expected return between 0% and 40%.");
      isValid = false;
    }

    if (isNaN(data.currentSavings) || data.currentSavings < 0) {
      markError("current-savings", "Savings cannot be negative.");
      isValid = false;
    }

    return isValid;
  };

  // Core Financial Calculator Engine
  const calculateGoalPlan = ({ goalAmount, timeHorizon, inflationRate, returnRate, currentSavings }) => {
    const t = timeHorizon;
    const n = t * 12;
    const rInf = inflationRate / 100;
    const rRet = returnRate / 100;
    const monthlyRate = rRet / 12;

    // Step 1: Future Goal Cost (Annual compounding)
    const futureGoal = goalAmount * Math.pow(1 + rInf, t);

    // Step 2: Future Value of Current Savings (Annual compounding)
    const futureSavings = currentSavings * Math.pow(1 + rRet, t);

    // Step 3: Net Funding Gap (minimum zero)
    const fundingGap = Math.max(0, futureGoal - futureSavings);

    // Step 4: Monthly Contribution Required (Ordinary Annuity)
    let monthlyContribution = 0;
    if (fundingGap > 0) {
      if (monthlyRate === 0) {
        // Zero-rate fallback: linear division
        monthlyContribution = fundingGap / n;
      } else {
        const accumulationFactor = (Math.pow(1 + monthlyRate, n) - 1) / monthlyRate;
        monthlyContribution = fundingGap / accumulationFactor;
      }
    }

    const totalContribution = monthlyContribution * n;
    const projectedGrowth = Math.max(0, fundingGap - totalContribution);

    return {
      futureGoal,
      futureSavings,
      fundingGap,
      monthlyContribution,
      totalContribution,
      projectedGrowth,
      months: n
    };
  };

  form.addEventListener("submit", (e) => {
    e.preventDefault();

    const data = {
      goalName: document.getElementById("goal-name").value,
      goalAmount: parseFloat(document.getElementById("goal-amount").value),
      timeHorizon: parseInt(document.getElementById("time-horizon").value, 10),
      inflationRate: parseFloat(document.getElementById("inflation-rate").value),
      returnRate: parseFloat(document.getElementById("return-rate").value),
      currentSavings: parseFloat(document.getElementById("current-savings").value) || 0
    };

    if (!validateForm(data)) {
      return;
    }

    const result = calculateGoalPlan(data);

    // Render Metrics
    document.getElementById("out-monthly-contrib").textContent = `${formatRupee(result.monthlyContribution)} / mo`;
    document.getElementById("out-future-goal").textContent = formatRupee(result.futureGoal);
    document.getElementById("out-future-savings").textContent = formatRupee(result.futureSavings);
    document.getElementById("out-funding-gap").textContent = formatRupee(result.fundingGap);
    document.getElementById("out-total-invested").textContent = formatRupee(result.totalContribution);

    // Contextual Summary Message (avoiding jargon)
    const summaryEl = document.getElementById("out-plan-summary");
    if (result.fundingGap === 0) {
      summaryEl.textContent = `Your current savings of ${formatRupee(data.currentSavings)} are projected to reach ${formatRupee(result.futureSavings)}, which fully covers "${data.goalName}" with no additional savings required!`;
    } else {
      summaryEl.textContent = `To fund "${data.goalName}" in ${data.timeHorizon} years, invest ${formatRupee(result.monthlyContribution)} every month assuming a ${data.returnRate}% annual return.`;
    }

    // Render Stacked Bar Proportions
    const totalTarget = Math.max(result.futureGoal, result.futureSavings);
    const pctSav = ((Math.min(result.futureSavings, totalTarget) / totalTarget) * 100).toFixed(1);
    const pctCon = ((result.totalContribution / totalTarget) * 100).toFixed(1);
    const pctGro = ((result.projectedGrowth / totalTarget) * 100).toFixed(1);

    document.getElementById("bar-savings").style.width = `${pctSav}%`;
    document.getElementById("bar-contrib").style.width = `${pctCon}%`;
    document.getElementById("bar-growth").style.width = `${pctGro}%`;

    emptyState.classList.add("hidden");
    resultsBox.classList.remove("hidden");
  });

  resetBtn.addEventListener("click", () => {
    form.reset();
    clearErrors();
    resultsBox.classList.add("hidden");
    emptyState.classList.remove("hidden");
  });
});