const hasLandlordPaymentSetup = (landlord = {}) => {
  const subaccountCode = `${landlord.subaccount_code || ""}`.trim();
  const bankName = `${landlord.bank_name || ""}`.trim();
  const accountNumber = `${landlord.account_number || ""}`.trim();
  const accountName = `${landlord.account_name || ""}`.trim();

  const hasBankDetails = Boolean(bankName && accountNumber && accountName);
  return Boolean(subaccountCode || hasBankDetails);
};

module.exports = {
  hasLandlordPaymentSetup,
};
