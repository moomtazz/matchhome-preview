(function () {
  'use strict';

  function requireNumber(name, value, minimum, maximum, integer) {
    if (
      !Number.isFinite(value) ||
      value < minimum ||
      value > maximum ||
      (integer && !Number.isInteger(value))
    ) {
      throw new RangeError(name + ' is outside its valid range.');
    }
  }

  function requireObject(name, value) {
    if (value === null || typeof value !== 'object' || Array.isArray(value)) {
      throw new RangeError(name + ' must be an object.');
    }
  }

  function requireFiniteResult(name, value) {
    if (!Number.isFinite(value)) {
      throw new RangeError(name + ' exceeds the supported numeric range.');
    }
    return value;
  }

  // Six months of accounting net income, not a lender's income policy or forecast.
  function summarizeIncome(months) {
    if (!Array.isArray(months) || months.length !== 6) {
      throw new RangeError('months must contain exactly six records.');
    }

    var netMonths = [];
    var totalRevenue = 0;
    var totalCosts = 0;
    var totalNet = 0;
    var minimum = Infinity;
    var maximum = -Infinity;
    for (var index = 0; index < months.length; index++) {
      var month = months[index];
      requireObject('month', month);
      requireNumber('revenue', month.revenue, 0, 1e12, false);
      requireNumber('costs', month.costs, 0, 1e12, false);
      var net = month.revenue - month.costs;
      netMonths.push(net);
      totalRevenue += month.revenue;
      totalCosts += month.costs;
      totalNet += net;
      minimum = Math.min(minimum, net);
      maximum = Math.max(maximum, net);
    }

    return {
      average: totalNet / months.length,
      minimum: minimum,
      maximum: maximum,
      netMonths: netMonths,
      totalRevenue: totalRevenue,
      totalCosts: totalCosts
    };
  }

  // Rates are annual percentages; payments use monthly, end-of-period amortization.
  function payment(principal, annualRate, months) {
    requireNumber('principal', principal, 0, Infinity, false);
    requireNumber('annualRate', annualRate, 0, 30, false);
    requireNumber('months', months, 1, Infinity, true);

    if (principal === 0) return 0;

    var monthlyRate = annualRate / 1200;
    if (monthlyRate === 0) return principal / months;
    var discount = -Math.expm1(-months * Math.log1p(monthlyRate));
    return requireFiniteResult('payment', principal * (monthlyRate / discount));
  }

  function calculateMortgage(options) {
    requireObject('options', options);

    var price = options.price;
    var downPaymentPercent = options.downPaymentPercent;
    var annualRate = options.annualRate;
    var tenorYears = options.tenorYears;
    var fixedYears = options.fixedYears;
    var floatingRate = options.floatingRate;
    var feesPercent = options.feesPercent;
    var feesFlat = options.feesFlat;

    requireNumber('price', price, 0, 1e12, false);
    if (price === 0) throw new RangeError('price must be greater than zero.');
    requireNumber('downPaymentPercent', downPaymentPercent, 0, 100, false);
    requireNumber('annualRate', annualRate, 0, 30, false);
    requireNumber('tenorYears', tenorYears, 1, 40, true);
    requireNumber('fixedYears', fixedYears, 0, 40, true);
    requireNumber('floatingRate', floatingRate, 0, 30, false);
    requireNumber('feesPercent', feesPercent, 0, Infinity, false);
    requireNumber('feesFlat', feesFlat, 0, Infinity, false);

    var downPayment = price * (downPaymentPercent / 100);
    var principal = price - downPayment;
    var months = tenorYears * 12;
    var firstPeriodMonths = Math.min(fixedYears, tenorYears) * 12;
    var remainingMonths = months - firstPeriodMonths;
    var initialPayment;
    var laterPayment;
    var balanceAtReset;

    if (firstPeriodMonths === 0) {
      // No fixed period: the floating assumption applies from the first payment.
      initialPayment = payment(principal, floatingRate, months);
      laterPayment = initialPayment;
      balanceAtReset = principal;
    } else {
      initialPayment = payment(principal, annualRate, months);

      if (remainingMonths === 0) {
        balanceAtReset = 0;
        laterPayment = initialPayment;
      } else {
        if (annualRate / 1200 === 0) {
          balanceAtReset = principal * (remainingMonths / months);
        } else {
          // Present value of the remaining fixed-rate installments, not original debt.
          var monthlyRate = annualRate / 1200;
          var remainingDiscount = -Math.expm1(-remainingMonths * Math.log1p(monthlyRate));
          balanceAtReset = initialPayment * (remainingDiscount / monthlyRate);
        }
        laterPayment = payment(balanceAtReset, floatingRate, remainingMonths);
      }
    }

    var totalInstallments = initialPayment * firstPeriodMonths + laterPayment * remainingMonths;
    // Ignore only negative floating-point residue; no intermediate currency rounding.
    var totalInterest = Math.max(0, totalInstallments - principal);
    // User-entered transaction-cost assumptions, not official tax or bank tariffs.
    var upfrontFees = requireFiniteResult('upfrontFees', price * (feesPercent / 100) + feesFlat);
    var totalCash = requireFiniteResult('totalCash', downPayment + upfrontFees);

    return {
      downPayment: downPayment,
      principal: principal,
      initialPayment: initialPayment,
      laterPayment: laterPayment,
      firstPeriodMonths: firstPeriodMonths,
      balanceAtReset: balanceAtReset,
      totalInterest: totalInterest,
      totalInstallments: totalInstallments,
      upfrontFees: upfrontFees,
      totalCash: totalCash
    };
  }

  function assessAffordability(mortgage, profile, propertyMonthlyCosts) {
    requireObject('mortgage', mortgage);
    requireObject('profile', profile);
    if (propertyMonthlyCosts === undefined) propertyMonthlyCosts = 0;

    requireNumber('initialPayment', mortgage.initialPayment, 0, Infinity, false);
    requireNumber('laterPayment', mortgage.laterPayment, 0, Infinity, false);
    requireNumber('totalCash', mortgage.totalCash, 0, Infinity, false);
    requireNumber('income', profile.income, -1e12, 1e12, false);
    if (profile.lowestMonthlyIncome !== undefined) {
      requireNumber('lowestMonthlyIncome', profile.lowestMonthlyIncome, -1e12, 1e12, false);
    }
    requireNumber('otherDebt', profile.otherDebt, 0, Infinity, false);
    requireNumber('livingCosts', profile.livingCosts, 0, Infinity, false);
    requireNumber('commuteCosts', profile.commuteCosts, 0, Infinity, false);
    requireNumber('monthlyBuffer', profile.monthlyBuffer, 0, Infinity, false);
    requireNumber('savings', profile.savings, 0, Infinity, false);
    requireNumber('emergencyReserve', profile.emergencyReserve, 0, Infinity, false);
    requireNumber('incomeDropPercent', profile.incomeDropPercent, 0, 100, false);
    requireNumber('propertyMonthlyCosts', propertyMonthlyCosts, 0, Infinity, false);

    var monthlyCosts = requireFiniteResult('monthlyCosts',
      profile.otherDebt + profile.livingCosts + profile.commuteCosts +
      profile.monthlyBuffer + propertyMonthlyCosts
    );
    var normalSurplus = requireFiniteResult('normalSurplus',
      profile.income - monthlyCosts - mortgage.initialPayment
    );
    var resetSurplus = requireFiniteResult('resetSurplus',
      profile.income - monthlyCosts - mortgage.laterPayment
    );
    var stressSurplus = requireFiniteResult('stressSurplus',
      profile.income - Math.abs(profile.income) * (profile.incomeDropPercent / 100) - monthlyCosts -
      Math.max(mortgage.initialPayment, mortgage.laterPayment)
    );
    var historySurplus = profile.lowestMonthlyIncome === undefined ? null :
      requireFiniteResult('historySurplus',
        profile.lowestMonthlyIncome - monthlyCosts -
        Math.max(mortgage.initialPayment, mortgage.laterPayment)
      );
    var cashAvailable = Math.max(0, profile.savings - profile.emergencyReserve);
    var cashGap = requireFiniteResult('cashGap',
      Math.max(0, mortgage.totalCash + profile.emergencyReserve - profile.savings)
    );
    var tolerance = 1e-6;

    // A household cash-flow illustration, not a lender's credit approval or DTI rule.
    return {
      normalSurplus: normalSurplus,
      resetSurplus: resetSurplus,
      stressSurplus: stressSurplus,
      historySurplus: historySurplus,
      cashAvailable: cashAvailable,
      cashGap: cashGap,
      fits: normalSurplus >= -tolerance && resetSurplus >= -tolerance &&
        stressSurplus >= -tolerance && cashGap <= tolerance &&
        (historySurplus === null || historySurplus >= -tolerance)
    };
  }

  var api = {
    payment: payment,
    calculateMortgage: calculateMortgage,
    summarizeIncome: summarizeIncome,
    assessAffordability: assessAffordability
  };

  if (typeof window !== 'undefined') window.MatchHomeFinance = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})();
