export type BurnoutInput = {
  sessionMinutes: number;
  totalMinutesToday: number;
  idleSecondsLast10Min: number;
  accuracyLastWindow: number | null;
  accuracyPrevWindow: number | null;
  avgTimePerQuestionCurrent: number | null;
  avgTimePerQuestionBaseline: number | null;
  hintsLastWindow: number;
  selfReportedTiredness: number;
};

export type BurnoutRisk = {
  risk: number;
  level: 'low' | 'medium' | 'high';
  contributingFactors: string[];
};

export function computeBurnoutRisk(input: BurnoutInput): BurnoutRisk {
  let score = 0;
  const factors: string[] = [];

  const {
    sessionMinutes,
    totalMinutesToday,
    idleSecondsLast10Min,
    accuracyLastWindow,
    accuracyPrevWindow,
    avgTimePerQuestionCurrent,
    avgTimePerQuestionBaseline,
    hintsLastWindow,
    selfReportedTiredness,
  } = input;

  // Session length
  if (sessionMinutes >= 50 && sessionMinutes < 80) {
    score += 0.15;
    factors.push('long_session_50min');
  } else if (sessionMinutes >= 80) {
    score += 0.3;
    factors.push('very_long_session_80min');
  }

  // Total minutes today
  if (totalMinutesToday >= 150 && totalMinutesToday < 240) {
    score += 0.15;
    factors.push('heavy_day_2_5_4h');
  } else if (totalMinutesToday >= 240) {
    score += 0.25;
    factors.push('very_heavy_day_4h_plus');
  }

  // Idle / reduced interaction
  if (idleSecondsLast10Min >= 90 && idleSecondsLast10Min < 180) {
    score += 0.1;
    factors.push('high_idle_90s_180s');
  } else if (idleSecondsLast10Min >= 180) {
    score += 0.2;
    factors.push('very_high_idle_180s_plus');
  }

  // Accuracy drop
  if (accuracyLastWindow !== null && accuracyPrevWindow !== null) {
    const delta = accuracyLastWindow - accuracyPrevWindow; // negative = worse
    if (delta <= -0.15 && delta > -0.3) {
      score += 0.15;
      factors.push('accuracy_drop_15_to_30_pct');
    } else if (delta <= -0.3) {
      score += 0.25;
      factors.push('accuracy_drop_30_pct_plus');
    }
  }

  // Slower than baseline
  if (
    avgTimePerQuestionCurrent !== null &&
    avgTimePerQuestionBaseline !== null &&
    avgTimePerQuestionBaseline > 0
  ) {
    const ratio = avgTimePerQuestionCurrent / avgTimePerQuestionBaseline;
    if (ratio >= 1.3 && ratio < 1.7) {
      score += 0.1;
      factors.push('slower_than_baseline_30_to_70_pct');
    } else if (ratio >= 1.7) {
      score += 0.2;
      factors.push('much_slower_than_baseline_70_pct_plus');
    }
  }

  // Hints spike
  if (hintsLastWindow >= 3 && hintsLastWindow < 6) {
    score += 0.05;
    factors.push('many_hints_3_to_5');
  } else if (hintsLastWindow >= 6) {
    score += 0.1;
    factors.push('many_hints_6_plus');
  }

  // Self-reported tiredness
  if (selfReportedTiredness > 0) {
    const tiredBoost = Math.min(0.3, selfReportedTiredness * 0.4);
    score += tiredBoost;
    if (selfReportedTiredness >= 0.5) {
      factors.push('self_reported_tired');
    }
  }

  score = Math.max(0, Math.min(1, score));

  let level: BurnoutRisk['level'] = 'low';
  if (score >= 0.35 && score < 0.7) level = 'medium';
  if (score >= 0.7) level = 'high';

  return { risk: score, level, contributingFactors: factors };
}

