'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { payment, calculateMortgage, assessAffordability, summarizeIncome } = require('./finance.js');

const base = { price: 500000000, downPaymentPercent: 20, annualRate: 7, tenorYears: 20, fixedYears: 3, floatingRate: 10, feesPercent: 3, feesFlat: 5000000 };
const profile = { income: 15000000, otherDebt: 1000000, livingCosts: 4000000, commuteCosts: 500000, monthlyBuffer: 1000000, savings: 200000000, emergencyReserve: 50000000, incomeDropPercent: 20 };
const close = (actual, expected) => assert.ok(Math.abs(actual - expected) < 0.02, `${actual} differs from ${expected}`);

// Independent month-by-month balance, not the engine's closed-form reset calculation.
function outstanding(principal, annualRate, installment, paidMonths) {
  for (let month = 0; month < paidMonths; month++) principal = principal * (1 + annualRate / 1200) - installment;
  return Math.max(0, principal);
}

test('a rate reset amortizes the outstanding balance over the remaining term', () => {
  const result = calculateMortgage(base);
  const monthlyRate = 7 / 1200;
  const firstPayment = 400000000 * monthlyRate / (1 - (1 + monthlyRate) ** -240);
  const balance = outstanding(400000000, 7, firstPayment, 36);
  const laterRate = 10 / 1200;
  const laterPayment = balance * laterRate / (1 - (1 + laterRate) ** -204);
  close(result.balanceAtReset, balance);
  close(result.laterPayment, laterPayment);
  close(result.totalInstallments, firstPayment * 36 + laterPayment * 204);
  close(result.totalInterest, firstPayment * 36 + laterPayment * 204 - 400000000);
  close(outstanding(balance, 10, result.laterPayment, 204), 0);
});

test('zero interest before or after the reset preserves the remaining principal', () => {
  const zeroFirst = calculateMortgage({ ...base, annualRate: 0 });
  close(zeroFirst.initialPayment, 400000000 / 240);
  close(zeroFirst.balanceAtReset, 340000000);
  const zeroLater = calculateMortgage({ ...base, floatingRate: 0 });
  close(zeroLater.laterPayment, zeroLater.balanceAtReset / 204);
  close(calculateMortgage({ ...base, annualRate: 0, floatingRate: 0 }).totalInterest, 0);
  close(payment(400000000, 1e-10, 240), 400000000 / 240);
});

test('zero initial-rate years uses the later rate from the first payment', () => {
  const result = calculateMortgage({ ...base, fixedYears: 0, annualRate: 1, floatingRate: 0 });
  close(result.initialPayment, 400000000 / 240);
  close(result.laterPayment, result.initialPayment);
  close(result.totalInterest, 0);
});

test('a fully fixed term ignores the later rate and a full down payment keeps transaction costs', () => {
  const fixed = calculateMortgage({ ...base, fixedYears: 40, floatingRate: 30 });
  close(fixed.initialPayment, fixed.laterPayment);
  close(fixed.balanceAtReset, 0);
  const cashPurchase = calculateMortgage({ ...base, downPaymentPercent: 100 });
  close(cashPurchase.principal, 0);
  close(cashPurchase.initialPayment, 0);
  close(cashPurchase.totalInterest, 0);
  close(cashPurchase.totalCash, 520000000);
});

test('business costs reduce six-month gross revenue to accounting net income', () => {
  const months = [
    { revenue: 20000000, costs: 12000000 },
    { revenue: 24000000, costs: 14000000 },
    { revenue: 16000000, costs: 10000000 },
    { revenue: 30000000, costs: 18000000 },
    { revenue: 18000000, costs: 14000000 },
    { revenue: 12000000, costs: 12000000 }
  ];
  assert.deepEqual(summarizeIncome(months), {
    average: 20000000 / 3,
    minimum: 0,
    maximum: 12000000,
    netMonths: [8000000, 10000000, 6000000, 12000000, 4000000, 0],
    totalRevenue: 120000000,
    totalCosts: 80000000
  });
});

test('loss months and a negative six-month average are not clamped', () => {
  const months = [
    { revenue: 10, costs: 40 },
    { revenue: 20, costs: 40 },
    { revenue: 30, costs: 40 },
    { revenue: 40, costs: 40 },
    { revenue: 50, costs: 40 },
    { revenue: 60, costs: 40 }
  ];
  assert.deepEqual(summarizeIncome(months), {
    average: -5,
    minimum: -30,
    maximum: 20,
    netMonths: [-30, -20, -10, 0, 10, 20],
    totalRevenue: 210,
    totalCosts: 240
  });
});

test('six-month history rejects missing records and nonnumeric or out-of-range amounts', () => {
  const complete = Array.from({ length: 6 }, () => ({ revenue: 100, costs: 50 }));
  for (const history of [undefined, null, {}, [], complete.slice(1), [...complete, complete[0]], Array(6)]) {
    assert.throws(() => summarizeIncome(history), RangeError);
  }
  for (const record of [undefined, null, [], {}, { revenue: 100 }, { costs: 50 }]) {
    assert.throws(() => summarizeIncome([record, ...complete.slice(1)]), RangeError);
  }
  for (const field of ['revenue', 'costs']) {
    for (const value of [undefined, null, '', '100', NaN, Infinity, -Infinity, -1, 1e12 + 1]) {
      assert.throws(() => summarizeIncome([{ ...complete[0], [field]: value }, ...complete.slice(1)]), RangeError);
    }
  }
});

test('income stress, recurring property costs and existing commitments reduce residual cash', () => {
  const mortgage = calculateMortgage(base);
  const result = assessAffordability(mortgage, profile, 800000);
  close(result.normalSurplus, 15000000 - 7300000 - mortgage.initialPayment);
  close(result.stressSurplus, 12000000 - 7300000 - Math.max(mortgage.initialPayment, mortgage.laterPayment));
  const lowerIncome = assessAffordability(mortgage, { ...profile, income: 8000000 }, 800000);
  assert.equal(lowerIncome.fits, false);
  assert.ok(lowerIncome.stressSurplus < 0);
});

test('zero net income preserves the full household deficit', () => {
  const mortgage = calculateMortgage(base);
  const result = assessAffordability(mortgage, { ...profile, income: 0 }, 800000);
  close(result.normalSurplus, -7300000 - mortgage.initialPayment);
  close(result.resetSurplus, -7300000 - mortgage.laterPayment);
  close(result.stressSurplus, -7300000 - Math.max(mortgage.initialPayment, mortgage.laterPayment));
  assert.equal(result.historySurplus, null);
  assert.equal(result.fits, false);
});

test('income stress deepens losses instead of improving negative net income', () => {
  const mortgage = calculateMortgage(base);
  const lossProfile = { ...profile, income: -2000000 };
  const unstressed = assessAffordability(mortgage, { ...lossProfile, incomeDropPercent: 0 }, 800000);
  const stressed = assessAffordability(mortgage, lossProfile, 800000);
  close(stressed.normalSurplus, -2000000 - 7300000 - mortgage.initialPayment);
  close(stressed.stressSurplus, -2400000 - 7300000 - Math.max(mortgage.initialPayment, mortgage.laterPayment));
  close(stressed.stressSurplus - unstressed.stressSurplus, -400000);
  assert.equal(stressed.fits, false);
});

test('a low historical month blocks an otherwise affordable average', () => {
  const mortgage = calculateMortgage(base);
  const averageOnly = assessAffordability(mortgage, profile, 800000);
  assert.equal(averageOnly.fits, true);
  const guarded = assessAffordability(mortgage, { ...profile, lowestMonthlyIncome: -1000000 }, 800000);
  close(guarded.historySurplus, -1000000 - 7300000 - Math.max(mortgage.initialPayment, mortgage.laterPayment));
  close(guarded.normalSurplus, averageOnly.normalSurplus);
  close(guarded.stressSurplus, averageOnly.stressSurplus);
  assert.equal(guarded.fits, false);
  const sufficient = assessAffordability(mortgage, { ...profile, lowestMonthlyIncome: 12000000 }, 800000);
  close(sufficient.historySurplus, 12000000 - 7300000 - Math.max(mortgage.initialPayment, mortgage.laterPayment));
  assert.equal(sufficient.fits, true);
});

test('preserving an unfunded emergency reserve cannot be reported as affordable', () => {
  const noInitialCash = calculateMortgage({ ...base, downPaymentPercent: 0, feesPercent: 0, feesFlat: 0 });
  const result = assessAffordability(noInitialCash, { ...profile, income: 100000000, savings: 0, emergencyReserve: 50000000 }, 0);
  close(result.cashGap, 50000000);
  assert.equal(result.fits, false);
});

test('invalid financial inputs do not produce a plausible affordability result', () => {
  for (const options of [{ annualRate: -1 }, { downPaymentPercent: 101 }, { tenorYears: 1.5 }, { price: NaN }]) {
    assert.throws(() => calculateMortgage({ ...base, ...options }), RangeError);
  }
  const mortgage = calculateMortgage(base);
  for (const invalid of [{ income: NaN }, { income: null }, { livingCosts: -1 }, { otherDebt: Infinity },
    { lowestMonthlyIncome: NaN }, { lowestMonthlyIncome: null }, { lowestMonthlyIncome: -1e12 - 1 }]) {
    assert.throws(() => assessAffordability(mortgage, { ...profile, ...invalid }, 0), RangeError);
  }
});
