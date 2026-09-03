/**
 * Vendor / Supplier Reliability Scoring Engine
 * Computes multi-dimensional reliability scores, letter grades, and risk trend alerts.
 */

function calculateSupplierScores(transactions = []) {
  if (!transactions || transactions.length === 0) {
    return {
      total_transactions: 0,
      punctuality_score: 100,
      quantity_score: 100,
      quality_score: 100,
      dispute_score: 100,
      composite_score: 100,
      star_rating: 5.0,
      grade: 'New',
      grade_label: 'New Supplier (No transactions logged)',
      on_time_rate: 100,
      avg_delay_days: 0,
      accuracy_rate: 100,
      avg_quality_stars: 5.0,
      dispute_count: 0,
      dispute_rate: 0,
      risk_status: 'Stable',
      risk_message: 'Insufficient transaction history to establish trend.'
    };
  }

  const count = transactions.length;

  // 1. Delivery Punctuality
  let onTimeCount = 0;
  let totalDelayDays = 0;
  let delayedCount = 0;

  transactions.forEach(tx => {
    if (tx.promised_date && tx.actual_date) {
      const promised = new Date(tx.promised_date);
      const actual = new Date(tx.actual_date);
      const diffDays = Math.ceil((actual - promised) / (1000 * 60 * 60 * 24));
      
      if (diffDays <= 0) {
        onTimeCount++;
      } else {
        delayedCount++;
        totalDelayDays += diffDays;
      }
    } else {
      onTimeCount++; // Default if not specified
    }
  });

  const onTimeRate = (onTimeCount / count) * 100;
  const avgDelayDays = delayedCount > 0 ? (totalDelayDays / delayedCount) : 0;
  // Penalty scales with delay days: e.g. 3 days late reduces score more
  const delayPenalty = Math.min(25, avgDelayDays * 4);
  const punctualityScore = Math.max(0, Math.min(100, onTimeRate - (delayedCount > 0 ? delayPenalty : 0)));

  // 2. Quantity Accuracy
  let totalOrdered = 0;
  let totalReceived = 0;

  transactions.forEach(tx => {
    const ordered = Number(tx.quantity_ordered) || 1;
    const received = Number(tx.quantity_received) !== undefined ? Number(tx.quantity_received) : ordered;
    totalOrdered += ordered;
    totalReceived += received;
  });

  const accuracyRatio = totalOrdered > 0 ? (totalReceived / totalOrdered) : 1;
  const accuracyRate = Math.min(100, Math.max(0, accuracyRatio * 100));
  const quantityScore = accuracyRate;

  // 3. Quality Consistency
  let totalQuality = 0;
  transactions.forEach(tx => {
    totalQuality += Number(tx.quality_rating) || 5;
  });
  const avgQualityStars = totalQuality / count;
  const qualityScore = (avgQualityStars / 5) * 100;

  // 4. Dispute Freedom & Resolution
  let disputeCount = 0;
  let resolvedDisputes = 0;
  let unresolvedDisputes = 0;

  transactions.forEach(tx => {
    if (tx.has_dispute === 1 || tx.has_dispute === true || tx.has_dispute === '1') {
      disputeCount++;
      if (tx.dispute_status === 'Resolved') resolvedDisputes++;
      if (tx.dispute_status === 'Unresolved' || tx.dispute_status === 'Open') unresolvedDisputes++;
    }
  });

  const disputeRate = (disputeCount / count) * 100;
  // If disputes occur, resolved ones penalize less than open/unresolved ones
  const disputePenalty = (unresolvedDisputes * 20 + resolvedDisputes * 8) / count;
  const disputeScore = Math.max(0, Math.min(100, 100 - disputePenalty));

  // 5. Composite Score Calculation (Weighted)
  // Weights: Punctuality (30%), Accuracy (25%), Quality (25%), Dispute (20%)
  const compositeScore = Math.round(
    (punctualityScore * 0.30) +
    (quantityScore * 0.25) +
    (qualityScore * 0.25) +
    (disputeScore * 0.20)
  );

  const starRating = Number(((compositeScore / 100) * 5).toFixed(1));

  // Letter Grade
  let grade = 'A';
  let grade_label = 'Highly Reliable';
  if (compositeScore >= 92) {
    grade = 'A+';
    grade_label = 'Elite Reliability (Top Tier)';
  } else if (compositeScore >= 80) {
    grade = 'A';
    grade_label = 'Consistently Reliable';
  } else if (compositeScore >= 68) {
    grade = 'B';
    grade_label = 'Moderate / Acceptable';
  } else if (compositeScore >= 50) {
    grade = 'C';
    grade_label = 'Inconsistent (Caution)';
  } else {
    grade = 'D';
    grade_label = 'High Risk / Severe Issues';
  }

  // 6. Trend / Risk Detection (Early Warning)
  let risk_status = 'Stable';
  let risk_message = 'Performance is steady within normal variance.';

  if (count >= 5) {
    // Sort chronologically ascending to see recent
    const sorted = [...transactions].sort((a, b) => new Date(a.date || a.actual_date || 0) - new Date(b.date || b.actual_date || 0));
    const recent5 = sorted.slice(-5);
    const recentScoreObj = calculateBasicScore(recent5);

    const scoreDiff = recentScoreObj.composite - compositeScore;

    if (scoreDiff <= -15) {
      risk_status = 'Deteriorating';
      risk_message = `⚠️ Warning: Last 5 transactions scored ${recentScoreObj.composite} vs ${compositeScore} historical average (Disputes/delays surging).`;
    } else if (scoreDiff >= 10) {
      risk_status = 'Improving';
      risk_message = `📈 Performance improving (+${scoreDiff} pts over recent deliveries).`;
    }
  }

  return {
    total_transactions: count,
    punctuality_score: Math.round(punctualityScore),
    quantity_score: Math.round(quantityScore),
    quality_score: Math.round(qualityScore),
    dispute_score: Math.round(disputeScore),
    composite_score: compositeScore,
    star_rating: starRating,
    grade,
    grade_label,
    on_time_rate: Math.round(onTimeRate),
    avg_delay_days: Number(avgDelayDays.toFixed(1)),
    accuracy_rate: Math.round(accuracyRate),
    avg_quality_stars: Number(avgQualityStars.toFixed(1)),
    dispute_count: disputeCount,
    dispute_rate: Math.round(disputeRate),
    risk_status,
    risk_message
  };
}

function calculateBasicScore(txList) {
  if (!txList.length) return { composite: 100 };
  let punct = 0, qual = 0, disp = 0;
  txList.forEach(t => {
    if (t.promised_date && t.actual_date && new Date(t.actual_date) <= new Date(t.promised_date)) punct += 100;
    else if (!t.promised_date) punct += 100;
    qual += ((Number(t.quality_rating) || 5) / 5) * 100;
    if (t.has_dispute === 1 || t.has_dispute === true || t.has_dispute === '1') disp += 40;
    else disp += 100;
  });
  const c = txList.length;
  const composite = Math.round(((punct / c) * 0.35) + ((qual / c) * 0.35) + ((disp / c) * 0.30));
  return { composite };
}

module.exports = {
  calculateSupplierScores
};
