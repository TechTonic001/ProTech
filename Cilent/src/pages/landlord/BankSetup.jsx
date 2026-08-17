// src/pages/landlord/BankSetup.jsx
import React, { useEffect, useState } from 'react';
import { authAPI, paymentAPI } from '../../utils/api';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import {
  Landmark,
  CheckCircle2,
  HelpCircle,
  Loader2,
  ShieldCheck
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../../hooks/useAuth';

const BankSetup = () => {
  const { setUser } = useAuth();
  const [profile, setProfile] = useState(null);
  const [bankDetails, setBankDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [bankDetailsLoading, setBankDetailsLoading] = useState(true);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [banks, setBanks] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);

  // Form State
  const [form, setForm] = useState({
    business_name: '',
    settlement_bank: '',
    account_number: '',
    percentage_charge: 1.0, // Default 1% split or fee sharing
  });

  const [formError, setFormError] = useState('');
  const [accountNameError, setAccountNameError] = useState('');
  const [resolving, setResolving] = useState(false);
  const [resolved, setResolved] = useState(null);

  useEffect(() => {
    fetchProfile();
    fetchBanksList();
    fetchBankDetails();
  }, []);

  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (!e.target.closest('.bank-search-container')) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('click', handleOutsideClick);
    return () => document.removeEventListener('click', handleOutsideClick);
  }, []);

  const fetchBanksList = async () => {
    try {
      const res = await paymentAPI.getBanks();
      if (res.data && res.data.data) {
        setBanks(res.data.data);
      }
    } catch (err) {
      console.error('Failed to fetch bank list dynamically, using fallback', err);
      setBanks([
        { code: '044', name: 'Access Bank' },
        { code: '058', name: 'Guaranty Trust Bank (GTBank)' },
        { code: '057', name: 'Zenith Bank' },
        { code: '033', name: 'United Bank for Africa (UBA)' },
        { code: '011', name: 'First Bank of Nigeria' },
        { code: '050', name: 'EcoBank Nigeria' },
        { code: '070', name: 'Fidelity Bank' },
        { code: '232', name: 'Sterling Bank' },
        { code: '032', name: 'Union Bank of Nigeria' },
        { code: '035', name: 'Wema Bank' },
        { code: '214', name: 'First City Monument Bank (FCMB)' },
        { code: '082', name: 'Keystone Bank' },
        { code: '101', name: 'Providus Bank' },
        { code: '301', name: 'Jaiz Bank' },
      ]);
    }
  };

  const getBankCodeByName = (bankName) => {
    if (!bankName) return '';
    return (
      banks.find(
        (b) => b.name?.toLowerCase().trim() === bankName.toLowerCase().trim(),
      )?.code || ''
    );
  };

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const res = await authAPI.getProfile();
      const profileData = res.data.user;
      setProfile(profileData);
      if (profileData) {
        setUser((prevUser) => ({
          ...prevUser,
          ...profileData,
        }));
        localStorage.setItem('protech_user', JSON.stringify({
          ...JSON.parse(localStorage.getItem('protech_user') || '{}'),
          ...profileData,
        }));
      }
    } catch (err) {
      toast.error(err.message || 'Failed to fetch user profile details');
    } finally {
      setLoading(false);
    }
  };

  const fetchBankDetails = async () => {
    try {
      setBankDetailsLoading(true);
      const res = await paymentAPI.getBankDetails();
      const data = res.data.data;
      setBankDetails(data);
      if (data) {
        const code = getBankCodeByName(data.bank_name);
        setSearchQuery(data.bank_name || '');
        setForm((prev) => ({
          ...prev,
          business_name: data.account_name || prev.business_name,
          settlement_bank: code || prev.settlement_bank,
          account_number: data.account_number || prev.account_number,
        }));
      }
    } catch (err) {
      console.error('Failed to fetch landlord bank details:', err);
    } finally {
      setBankDetailsLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.business_name || !form.settlement_bank || !form.account_number) {
      setFormError('All bank settlement fields are required.');
      return;
    }
    if (form.account_number.length !== 10) {
      setFormError('Account number must be exactly 10 digits.');
      return;
    }

    if (!resolved?.account_name) {
      setFormError('Please verify the account number first.');
      toast.error('Please verify the account number first.');
      return;
    }

    setFormError('');
    setSubmitLoading(true);
    try {
      const selectedBankName = banks.find(b => b.code === form.settlement_bank)?.name || 'Nigerian Bank';

      await paymentAPI.createSubaccount({
        business_name: form.business_name,
        settlement_bank: form.settlement_bank, // bank code
        account_number: form.account_number,
        percentage_charge: Number(form.percentage_charge),
        bank_name: selectedBankName,
      });

      toast.success('Paystack settlement subaccount connected successfully!');
      await fetchProfile();
      await fetchBankDetails();
      setIsEditMode(false);
    } catch (err) {
      setFormError(err.response?.data?.error || err.message || 'Subaccount registration failed');
      toast.error(err.response?.data?.error || err.message || 'Subaccount connection failed');
    } finally {
      setSubmitLoading(false);
    }
  };

  useEffect(() => {
    let mounted = true;
    const shouldResolve = form.account_number && form.account_number.length === 10 && form.settlement_bank;
    if (!shouldResolve) {
      setResolved(null);
      setAccountNameError('');
      setResolving(false);
      return;
    }

    setResolving(true);
    setResolved(null);
    setAccountNameError('');

    paymentAPI.resolveAccount({ account_number: form.account_number, bank_code: form.settlement_bank })
      .then((res) => {
        if (!mounted) return;
        const resolvedData = res.data || null;
        setResolved(resolvedData);
        if (!resolvedData?.account_name) {
          setAccountNameError('Could not resolve account name');
        } else {
          setAccountNameError('');
        }
      })
      .catch((err) => {
        if (!mounted) return;
        const message = err.response?.data?.error || err.message || 'Account not found. Check number and bank.';
        setResolved({ error: true, message });
        setAccountNameError(message);
      })
      .finally(() => {
        if (!mounted) return;
        setResolving(false);
      });

    return () => { mounted = false; };
  }, [form.account_number, form.settlement_bank]);

  if (loading || bankDetailsLoading) return <LoadingSpinner fullPage />;

  const hasSubaccount = profile && profile.subaccount_code;
  const hasBankDetails = Boolean(bankDetails && bankDetails.subaccount_code);
  const filteredBanks = banks.filter(b =>
    b.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="max-w-2xl mx-auto space-y-6">

      {/* Header */}
      <div>
        <h2 className="text-xl lg:text-2xl font-black text-slate-900">Bank Setup</h2>
        <p className="text-xs text-slate-500 mt-1 leading-relaxed">
          Configure bank settlements to authorize direct payouts. Rent collected from tenants will automatically split and deposit directly into this account.
        </p>
      </div>

      {hasBankDetails && !isEditMode ? (
        <div className="bg-white rounded-3xl border border-slate-100 p-8 shadow-xs space-y-6 animate-fade-in">
          <div className="flex flex-col items-center text-center">
            <div className="w-16 h-16 rounded-2xl bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center mb-4">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold text-slate-900">Bank Details Saved</h3>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              Your settlement account is already configured. You can edit it if anything changes.
            </p>
          </div>

          <div className="bg-slate-50 border border-slate-100 rounded-2xl p-5 font-semibold text-xs space-y-3">
            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-slate-400 uppercase tracking-wider">Settlement Code</span>
              <span className="font-mono text-slate-800 font-bold">{bankDetails?.subaccount_code || profile?.subaccount_code}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-slate-400 uppercase tracking-wider">Account Name</span>
              <span className="text-slate-800 font-bold">{bankDetails?.account_name || profile?.account_name || 'Hostel Business'}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-slate-400 uppercase tracking-wider">Bank</span>
              <span className="text-slate-800 font-bold">{bankDetails?.bank_name || profile?.bank_name || 'Connected Bank'}</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-slate-400 uppercase tracking-wider">Account Number</span>
              <span className="font-mono text-slate-800 font-bold">
                {bankDetails?.account_number
                  ? `******${bankDetails.account_number.slice(-4)}`
                  : profile?.account_number
                  ? `******${profile.account_number.slice(-4)}`
                  : '******'}
              </span>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => setIsEditMode(true)}
              className="px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-semibold text-sm transition"
            >
              Edit Bank Details
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-3xl border border-slate-100 p-6 shadow-xs">
          <form onSubmit={handleSubmit} className="space-y-4">

            <div className="flex items-center gap-2 pb-2 border-b border-slate-50 mb-2">
              <Landmark className="w-5 h-5 text-blue-600" />
              <h3 className="text-sm font-bold text-slate-900">{hasBankDetails ? 'Edit Settlement Bank' : 'Add Settlement Bank'}</h3>
            </div>

            {formError && (
              <p className="text-xs text-red-500 bg-red-50 border border-red-200 rounded-xl p-3">
                {formError}
              </p>
            )}

            <div>
              <label className="text-[10px] font-bold text-slate-600 uppercase tracking-widest block mb-1.5">
                Business / Settlement Name
              </label>
              <input
                type="text"
                name="business_name"
                value={form.business_name}
                onChange={handleInputChange}
                placeholder="e.g. Halleluyah Hostel Management"
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white transition"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bank-search-container relative">
                <label className="text-[10px] font-bold text-slate-600 uppercase tracking-widest block mb-1.5">
                  Select Settlement Bank
                </label>
                <input
                  type="text"
                  placeholder="Search bank name..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setShowDropdown(true);
                    setForm(prev => ({ ...prev, settlement_bank: '' }));
                  }}
                  onFocus={() => setShowDropdown(true)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white transition"
                />
                {showDropdown && filteredBanks.length > 0 && (
                  <div className="absolute z-50 w-full mt-1 max-h-60 overflow-y-auto bg-white border border-slate-200 rounded-xl shadow-lg">
                    {filteredBanks.map((b, index) => (
                      <div
                        key={`${b.code}-${index}`}
                        onClick={() => {
                          setSearchQuery(b.name);
                          setForm(prev => ({ ...prev, settlement_bank: b.code }));
                          setShowDropdown(false);
                        }}
                        className="px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer transition"
                      >
                        {b.name}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-600 uppercase tracking-widest block mb-1.5">
                  Account Number (10 digits)
                </label>
                <input
                  type="text"
                  name="account_number"
                  maxLength={10}
                  value={form.account_number}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, '');
                    setForm(prev => ({ ...prev, account_number: val }));
                  }}
                  placeholder="0123456789"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white transition"
                />
                {resolving ? (
                  <p className="text-xs text-slate-500 mt-2">Resolving account name...</p>
                ) : resolved?.account_name ? (
                  <p className="text-sm text-slate-700 mt-2">Account name: <strong>{resolved.account_name}</strong></p>
                ) : null}

                {accountNameError && (
                  <p className="text-xs text-red-500 mt-2">{accountNameError}</p>
                )}
              </div>
            </div>

            <button
              type="submit"
              disabled={submitLoading || !form.settlement_bank || !resolved?.account_name || !!accountNameError}
              className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm rounded-xl transition duration-150 flex items-center justify-center gap-2 hover:shadow-lg hover:shadow-blue-500/25 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Connecting settlement...
                </>
              ) : (
                hasBankDetails ? 'Update Bank Details' : 'Verify & Connect Bank Account'
              )}
            </button>

            {hasBankDetails && (
              <button
                type="button"
                onClick={() => {
                  const code = getBankCodeByName(bankDetails?.bank_name);
                  setIsEditMode(false);
                  setForm({
                    business_name: bankDetails?.account_name || '',
                    settlement_bank: code || '',
                    account_number: bankDetails?.account_number || '',
                    percentage_charge: form.percentage_charge,
                  });
                  setSearchQuery(bankDetails?.bank_name || '');
                }}
                className="w-full py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-sm rounded-xl transition duration-150"
              >
                Cancel
              </button>
            )}

          </form>
        </div>
      )}

    </div>
  );
};

export default BankSetup;
