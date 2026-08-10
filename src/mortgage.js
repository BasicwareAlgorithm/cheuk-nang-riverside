export function calculateMortgage({
  totalPriceWan,
  downPaymentPercent,
  years,
  annualRatePercent,
}) {
  const totalPrice = Number(totalPriceWan) * 10000;
  const downPayment = totalPrice * (Number(downPaymentPercent) / 100);
  const loanAmount = totalPrice - downPayment;
  const months = Number(years) * 12;
  const monthlyRate = Number(annualRatePercent) / 100 / 12;

  const monthlyPayment = monthlyRate === 0
    ? loanAmount / months
    : loanAmount * monthlyRate * ((1 + monthlyRate) ** months)
      / (((1 + monthlyRate) ** months) - 1);

  const totalInterest = monthlyPayment * months - loanAmount;

  return {
    downPayment,
    loanAmount,
    monthlyPayment,
    totalInterest,
  };
}
