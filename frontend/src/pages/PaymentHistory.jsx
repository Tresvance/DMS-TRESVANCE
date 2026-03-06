import { useState, useEffect, useCallback, useRef } from 'react';
import { paymentsAPI } from '../services/api';
import { PageHeader, Table, Spinner, EmptyState, Modal, SearchBar } from '../components/UI';
import { CreditCard, Download, Printer, CheckCircle, XCircle, Clock, Eye } from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';

export default function PaymentHistory() {
  const { user } = useAuth();
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [receiptModal, setReceiptModal] = useState(false);
  const receiptRef = useRef();

  const isSuperAdmin = user?.role === 'SUPER_ADMIN';

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await paymentsAPI.list({ search });
      setPayments(data.results || data);
    } catch {
      toast.error('Failed to load payments');
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => { load(); }, [load]);

  const openReceipt = (payment) => {
    setSelectedPayment(payment);
    setReceiptModal(true);
  };

  const handlePrint = () => {
    const printContent = receiptRef.current;
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Payment Receipt</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            .receipt { max-width: 400px; margin: 0 auto; border: 1px solid #ddd; padding: 20px; }
            .header { text-align: center; border-bottom: 2px solid #333; padding-bottom: 15px; margin-bottom: 15px; }
            .header h1 { margin: 0; font-size: 24px; color: #333; }
            .header p { margin: 5px 0 0; color: #666; }
            .section { margin: 15px 0; }
            .row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px dashed #eee; }
            .label { color: #666; }
            .value { font-weight: bold; }
            .total { font-size: 18px; background: #f5f5f5; padding: 15px; margin: 20px 0; border-radius: 8px; }
            .footer { text-align: center; margin-top: 20px; padding-top: 15px; border-top: 1px solid #ddd; color: #888; font-size: 12px; }
            .status-success { color: #22c55e; }
            .status-pending { color: #f59e0b; }
            .status-failed { color: #ef4444; }
            @media print { body { padding: 0; } .receipt { border: none; } }
          </style>
        </head>
        <body>
          ${printContent.innerHTML}
          <script>window.onload = function() { window.print(); window.close(); }</script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'SUCCESS': return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'FAILED': return <XCircle className="w-5 h-5 text-red-500" />;
      default: return <Clock className="w-5 h-5 text-yellow-500" />;
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'SUCCESS': return <span className="badge-green">Success</span>;
      case 'FAILED': return <span className="badge-red">Failed</span>;
      case 'REFUNDED': return <span className="badge-blue">Refunded</span>;
      default: return <span className="badge-yellow">Pending</span>;
    }
  };

  return (
    <div>
      <PageHeader
        title="Payment History"
        subtitle={`${payments.length} payment${payments.length !== 1 ? 's' : ''}`}
      />

      <div className="card">
        {isSuperAdmin && (
          <div className="mb-4">
            <SearchBar value={search} onChange={setSearch} placeholder="Search by clinic name..." />
          </div>
        )}

        {loading ? <Spinner /> : payments.length === 0 ? (
          <EmptyState message="No payments found" icon={CreditCard} />
        ) : (
          <Table headers={[
            ...(isSuperAdmin ? ['Clinic'] : []),
            'Amount', 'Months', 'Status', 'Payment ID', 'Date', 'Actions'
          ]}>
            {payments.map(p => (
              <tr key={p.id} className="hover:bg-gray-50">
                {isSuperAdmin && (
                  <td className="table-cell font-medium">{p.clinic_name}</td>
                )}
                <td className="table-cell font-bold text-green-600">₹{p.amount}</td>
                <td className="table-cell">{p.subscription_months} mo</td>
                <td className="table-cell">{getStatusBadge(p.status)}</td>
                <td className="table-cell font-mono text-xs text-gray-500">
                  {p.razorpay_payment_id || '-'}
                </td>
                <td className="table-cell text-gray-500">
                  {p.payment_date 
                    ? format(new Date(p.payment_date), 'dd MMM yyyy, HH:mm')
                    : format(new Date(p.created_at), 'dd MMM yyyy, HH:mm')
                  }
                </td>
                <td className="table-cell">
                  {p.status === 'SUCCESS' && (
                    <button
                      onClick={() => openReceipt(p)}
                      className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg"
                      title="View Receipt"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </Table>
        )}
      </div>

      {/* Receipt Modal */}
      <Modal isOpen={receiptModal} onClose={() => setReceiptModal(false)} title="Payment Receipt">
        {selectedPayment && (
          <div>
            {/* Printable Receipt */}
            <div ref={receiptRef}>
              <div className="receipt">
                <div className="header">
                  <h1>DMS TRESVANCE</h1>
                  <p>Payment Receipt</p>
                </div>

                <div className="section">
                  <div className="row">
                    <span className="label">Receipt No:</span>
                    <span className="value">#{selectedPayment.id.toString().padStart(6, '0')}</span>
                  </div>
                  <div className="row">
                    <span className="label">Date:</span>
                    <span className="value">
                      {selectedPayment.payment_date 
                        ? format(new Date(selectedPayment.payment_date), 'dd MMM yyyy, HH:mm')
                        : '-'
                      }
                    </span>
                  </div>
                  <div className="row">
                    <span className="label">Clinic:</span>
                    <span className="value">{selectedPayment.clinic_name}</span>
                  </div>
                </div>

                <div className="section">
                  <div className="row">
                    <span className="label">Description:</span>
                    <span className="value">Subscription ({selectedPayment.subscription_months} month{selectedPayment.subscription_months > 1 ? 's' : ''})</span>
                  </div>
                  <div className="row">
                    <span className="label">Payment ID:</span>
                    <span className="value" style={{fontSize: '11px'}}>{selectedPayment.razorpay_payment_id || '-'}</span>
                  </div>
                  <div className="row">
                    <span className="label">Status:</span>
                    <span className={`value status-${selectedPayment.status.toLowerCase()}`}>
                      {selectedPayment.status}
                    </span>
                  </div>
                </div>

                <div className="total">
                  <div className="row" style={{border: 'none', padding: 0}}>
                    <span className="label" style={{fontSize: '16px'}}>Total Paid:</span>
                    <span className="value" style={{fontSize: '24px', color: '#22c55e'}}>₹{selectedPayment.amount}</span>
                  </div>
                </div>

                <div className="footer">
                  <p>Thank you for your payment!</p>
                  <p>This is a computer-generated receipt.</p>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 justify-end mt-4 pt-4 border-t">
              <button
                onClick={() => setReceiptModal(false)}
                className="btn-secondary"
              >
                Close
              </button>
              <button
                onClick={handlePrint}
                className="btn-primary flex items-center gap-2"
              >
                <Printer className="w-4 h-4" />
                Print Receipt
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
