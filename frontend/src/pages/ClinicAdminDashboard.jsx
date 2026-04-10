import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { authAPI, appointmentsAPI, clinicsAPI, paymentsAPI, patientsAPI } from '../services/api';
import { StatCard, Spinner, Table, StatusBadge, Modal, FormField } from '../components/UI';
import { Users, UserPlus, Calendar, CreditCard, TrendingUp, Stethoscope, Clock, AlertCircle, Check, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';

export default function ClinicAdminDashboard() {
  const { user } = useAuth();
  const [stats, setStats]     = useState(null);
  const [appts, setAppts]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [subscription, setSubscription] = useState(null);
  // Payment modal state
  const [paymentModal, setPaymentModal] = useState(false);
  const [paymentMonths, setPaymentMonths] = useState(1);
  const [processingPayment, setProcessingPayment] = useState(false);

  const loadSubscription = async () => {
    if (user?.clinic) {
      try {
        const { data } = await clinicsAPI.getSubscriptionStatus(user.clinic);
        setSubscription(data);
      } catch (err) {
        console.error('Failed to load subscription', err);
      }
    }
  };

  useEffect(() => {
    const today = format(new Date(), 'yyyy-MM-dd');
    Promise.all([
      authAPI.dashboard(),
      appointmentsAPI.list({ appointment_date: today }),
    ]).then(([{ data: s }, { data: a }]) => {
      setStats(s);
      setAppts(a.results || a);
    }).finally(() => setLoading(false));

    loadSubscription();
    
    // Trigger background auto-archival check
    patientsAPI.autoArchive().catch(err => console.error("Auto-archive failed:", err));
  }, [user]);

  // Initialize Razorpay payment
  const handlePayment = async () => {
    if (!subscription) return;
    setProcessingPayment(true);

    try {
      // Create order on backend
      const { data: orderData } = await paymentsAPI.createOrder({
        clinic_id: user.clinic,
        months: paymentMonths,
      });

      // Initialize Razorpay
      const options = {
        key: orderData.key_id,
        amount: orderData.amount,
        currency: orderData.currency,
        name: 'DMS Tresvance',
        description: `Subscription for ${subscription.clinic_name} (${paymentMonths} month${paymentMonths > 1 ? 's' : ''})`,
        order_id: orderData.order_id,
        handler: async (response) => {
          // Verify payment
          try {
            await paymentsAPI.verify({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            });
            toast.success('Payment successful! Subscription activated.');
            setPaymentModal(false);
            loadSubscription();
          } catch (err) {
            toast.error('Payment verification failed');
          }
        },
        prefill: {
          name: subscription.clinic_name,
        },
        theme: {
          color: '#3B82F6',
        },
        modal: {
          ondismiss: () => {
            setProcessingPayment(false);
          }
        }
      };

      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to initiate payment');
    } finally {
      setProcessingPayment(false);
    }
  };

  if (loading) return <Spinner />;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Clinic Dashboard</h1>
        <p className="text-gray-500 text-sm mt-0.5">{format(new Date(), 'EEEE, MMMM d, yyyy')}</p>
      </div>

      {/* Subscription Status Banner */}
      {subscription && (
        <div className={`mb-6 p-4 rounded-xl border ${
          subscription.subscription_status === 'ACTIVE' ? 'bg-green-50 border-green-200' :
          subscription.subscription_status === 'TRIAL' ? 'bg-blue-50 border-blue-200' :
          subscription.subscription_status === 'PENDING' ? 'bg-orange-50 border-orange-200' :
          'bg-red-50 border-red-200'
        }`}>
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3">
              {subscription.subscription_status === 'ACTIVE' && <Check className="w-6 h-6 text-green-600" />}
              {subscription.subscription_status === 'TRIAL' && <Clock className="w-6 h-6 text-blue-600" />}
              {subscription.subscription_status === 'PENDING' && <AlertCircle className="w-6 h-6 text-orange-600" />}
              {subscription.subscription_status === 'EXPIRED' && <AlertCircle className="w-6 h-6 text-red-600" />}
              <div>
                <p className="font-semibold text-gray-900">
                  {subscription.subscription_status === 'ACTIVE' && 'Subscription Active'}
                  {subscription.subscription_status === 'TRIAL' && 'Free Trial'}
                  {subscription.subscription_status === 'PENDING' && 'Payment Required'}
                  {subscription.subscription_status === 'EXPIRED' && 'Subscription Expired'}
                </p>
                <p className="text-sm text-gray-600">
                  {subscription.days_remaining > 0 
                    ? `${subscription.days_remaining} days remaining`
                    : 'Please renew your subscription'
                  }
                </p>
              </div>
            </div>
            
            {/* Show Pay button if not on active trial or if payment is needed */}
            {subscription.subscription_amount > 0 && (subscription.subscription_status === 'PENDING' || subscription.subscription_status === 'EXPIRED' || (subscription.subscription_status === 'ACTIVE' && subscription.days_remaining <= 30)) && (
              <button
                onClick={() => setPaymentModal(true)}
                className="btn-primary flex items-center gap-2"
              >
                <CreditCard className="w-4 h-4" />
                {subscription.subscription_status === 'ACTIVE' ? 'Renew' : 'Pay Now'} - ₹{subscription.subscription_amount}/mo
              </button>
            )}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mb-8">
        <StatCard label="Doctors"            value={stats?.total_doctors}      icon={Stethoscope} color="green" />
        <StatCard label="Receptionists"      value={stats?.total_reception}    icon={Users}       color="blue" />
        <StatCard label="Total Patients"     value={stats?.total_patients}     icon={UserPlus}    color="purple" />
        <StatCard label="Appointments Today" value={stats?.appointments_today} icon={Calendar}    color="orange" />
        <StatCard label="Revenue Collected"  value={`₹${Number(stats?.total_revenue || 0).toLocaleString()}`}   icon={CreditCard}  color="teal" />
        <StatCard label="Pending Balance"    value={`₹${Number(stats?.pending_balance || 0).toLocaleString()}`} icon={TrendingUp}  color="red" />
        <StatCard label="Pending Bills"      value={stats?.pending_bills}      icon={CreditCard}  color="orange" />
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <Link to="/clinic/staff"   className="p-3 rounded-xl text-sm font-medium text-center bg-purple-50 text-purple-700 hover:bg-purple-100 transition-colors"> Add Staff</Link>
        <Link to="/patients/new"   className="p-3 rounded-xl text-sm font-medium text-center bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors"> New Patient</Link>
        <Link to="/appointments"   className="p-3 rounded-xl text-sm font-medium text-center bg-green-50 text-green-700 hover:bg-green-100 transition-colors">Appointments</Link>
        <Link to="/billing"        className="p-3 rounded-xl text-sm font-medium text-center bg-orange-50 text-orange-700 hover:bg-orange-100 transition-colors">Billing</Link>
      </div>

      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-gray-900">Today's Appointments</h2>
          <Link to="/appointments" className="text-sm text-blue-600 hover:underline">View all</Link>
        </div>
        {appts.length === 0 ? (
          <p className="text-center py-8 text-gray-400 text-sm">No appointments today</p>
        ) : (
          <Table headers={['Patient', 'Doctor', 'Time', 'Reason', 'Status']}>
            {appts.map(a => (
              <tr key={a.id} className="hover:bg-gray-50">
                <td className="table-cell font-medium">{a.patient_name}</td>
                <td className="table-cell">{a.doctor_name}</td>
                <td className="table-cell">{a.appointment_time?.slice(0, 5)}</td>
                <td className="table-cell text-gray-500 max-w-xs truncate">{a.reason}</td>
                <td className="table-cell"><StatusBadge status={a.status} /></td>
              </tr>
            ))}
          </Table>
        )}
      </div>

      {/* Payment Modal */}
      <Modal isOpen={paymentModal} onClose={() => setPaymentModal(false)} title="Subscription Payment">
        {subscription && (
          <div className="space-y-4">
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="font-medium text-gray-900">{subscription.clinic_name}</h3>
              <p className="text-sm text-gray-500">
                Status: {subscription.subscription_status} • {subscription.days_remaining} days remaining
              </p>
            </div>

            <div className="border rounded-lg p-4 space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">Monthly Rate:</span>
                <span className="font-medium">₹{subscription.subscription_amount}</span>
              </div>

              <FormField label="Number of Months">
                <select
                  value={paymentMonths}
                  onChange={(e) => setPaymentMonths(parseInt(e.target.value))}
                  className="input-field"
                >
                  {[1, 2, 3, 6, 12].map(m => (
                    <option key={m} value={m}>{m} month{m > 1 ? 's' : ''}</option>
                  ))}
                </select>
              </FormField>

              <div className="border-t pt-3 flex justify-between text-lg font-bold">
                <span>Total:</span>
                <span className="text-green-600">
                  ₹{(parseFloat(subscription.subscription_amount) * paymentMonths).toFixed(2)}
                </span>
              </div>
            </div>

            <div className="flex gap-3 justify-end pt-2">
              <button
                type="button"
                onClick={() => setPaymentModal(false)}
                className="btn-secondary"
              >
                Cancel
              </button>
              <button
                onClick={handlePayment}
                disabled={processingPayment}
                className="btn-primary flex items-center gap-2"
              >
                {processingPayment && <Loader2 className="w-4 h-4 animate-spin" />}
                <CreditCard className="w-4 h-4" />
                Pay Now
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
