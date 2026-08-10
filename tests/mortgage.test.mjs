import assert from "node:assert/strict";
import test from "node:test";

import { calculateMortgage } from "../src/mortgage.js";

test("calculates the original 160万 mortgage preset", () => {
  const result = calculateMortgage({
    totalPriceWan: 160,
    downPaymentPercent: 30,
    years: 30,
    annualRatePercent: 3.1,
  });

  assert.equal(Math.round(result.downPayment / 10000), 48);
  assert.equal(Math.round(result.loanAmount / 10000), 112);
  assert.equal(Math.round(result.monthlyPayment), 4783);
  assert.equal(Math.round(result.totalInterest / 10000), 60);
});

test("supports a zero-interest boundary without division by zero", () => {
  const result = calculateMortgage({
    totalPriceWan: 120,
    downPaymentPercent: 20,
    years: 20,
    annualRatePercent: 0,
  });

  assert.equal(result.monthlyPayment, 4000);
  assert.equal(result.totalInterest, 0);
});
