//TransactionHistory.tsx ngano mag bout kag mag typscript ko
import { useState, useRef } from "react";
import type { Transaction } from "../types";
import { Eye, Search, CreditCard, DollarSign, Receipt, Printer, Trash2, Calendar, User, Activity, BarChart3, Users, Package } from "lucide-react";
import { Button, Modal } from "react-bootstrap";

interface TransactionHistoryProps {
  transactions: Transaction[];
  onDeleteAll: (params: { dateFrom: string; dateTo: string }) => Promise<{ deletedCount: number }>;
  onDelete?: (id: string) => Promise<any>;
  canDeleteAll?: boolean;
}

export function TransactionHistory({ transactions, onDeleteAll, onDelete, canDeleteAll = false }: TransactionHistoryProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const printAreaRef = useRef<HTMLDivElement>(null);

  const getStoreSettings = () => {
    const saved = localStorage.getItem("storeSettings");
    return saved ? JSON.parse(saved) : {
      storeName: "PCH Hardware Store",
      storeAddress: "Your Address Here",
      phone: "---",
      email: "---",
      footerMessage: "Thank you for your purchase! Please come again."
    };
  };

  const normalizedQuery = searchQuery.trim().toLowerCase();

  const filteredTransactions = transactions.filter((transaction) => {
    let matchesSearch = true;
    if (normalizedQuery) {
      const handler = transaction.handledBy
        ? `${transaction.handledBy.name} ${transaction.handledBy.email || ""}`
        : "";
      const haystack = `${transaction.id} ${transaction.customerName || ""} ${handler}`.toLowerCase();
      matchesSearch = haystack.includes(normalizedQuery);
    }

    let matchesDate = true;
    if (dateFrom || dateTo) {
      const transactionDate = new Date(transaction.timestamp);
      if (dateFrom) matchesDate = transactionDate >= new Date(dateFrom);
      if (dateTo) matchesDate = matchesDate && transactionDate <= new Date(dateTo + "T23:59:59");
    }
    return matchesSearch && matchesDate;
  });

  const totalRevenue = transactions.reduce((sum, t) => sum + t.total, 0);
  const completedTransactions = transactions.filter((t) => t.status === "completed").length;
  const averageTransaction = transactions.length > 0 ? totalRevenue / transactions.length : 0;

  //Updated: includes Processed By & Delivery info
  const printTransaction = (transaction: Transaction) => {
    const store = getStoreSettings();
    const printWindow = window.open("", "_blank", "width=450,height=600");
    if (!printWindow) return;

    printWindow.document.write(`
      <html>
        <head>
          <title>Receipt #${transaction.id.slice(-6).toUpperCase()}</title>
          <style>
            @page { margin: 0; }
            body { 
              font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; 
              padding: 40px; 
              color: #1a1a1a;
              line-height: 1.5;
              max-width: 400px;
              margin: 0 auto;
              font-size: 13px;
            }
            .header { text-align: center; margin-bottom: 30px; }
            .store-name { font-weight: 800; font-size: 20px; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 4px; }
            .store-info { color: #666; font-size: 11px; margin-bottom: 2px; }
            
            .receipt-title { 
              text-align: center; 
              font-weight: 700; 
              margin: 20px 0; 
              padding: 8px; 
              border-top: 1px dashed #ddd; 
              border-bottom: 1px dashed #ddd;
              text-transform: uppercase;
              letter-spacing: 2px;
            }
            
            .meta-section { margin-bottom: 25px; }
            .meta-row { display: flex; justify-content: space-between; margin-bottom: 4px; }
            .meta-label { color: #666; font-weight: 500; }
            .meta-value { font-weight: 600; text-align: right; }
            
            .items-table { width: 100%; border-collapse: collapse; margin-bottom: 25px; }
            .items-table th { text-align: left; padding: 10px 0; color: #666; font-weight: 600; border-bottom: 1px solid #eee; font-size: 11px; text-transform: uppercase; }
            .items-table td { padding: 12px 0; border-bottom: 1px solid #f9f9f9; vertical-align: top; }
            .item-name { font-weight: 600; margin-bottom: 2px; display: block; }
            .item-meta { font-size: 11px; color: #888; }
            .item-total { font-weight: 700; text-align: right; }
            
            .totals-section { margin-top: 10px; border-top: 1px solid #eee; padding-top: 15px; }
            .total-row { display: flex; justify-content: space-between; margin-bottom: 8px; }
            .total-row.grand-total { margin-top: 15px; padding-top: 15px; border-top: 2px solid #1a1a1a; font-size: 18px; font-weight: 800; }
            
            .footer { text-align: center; margin-top: 40px; padding-top: 20px; border-top: 1px dashed #ddd; }
            .footer-msg { font-style: italic; color: #666; margin-bottom: 10px; }
            .signature { margin-top: 30px; display: flex; justify-content: space-between; }
            .sig-line { border-top: 1px solid #ddd; width: 45%; padding-top: 5px; font-size: 10px; color: #999; }
            
            @media print {
              body { padding: 20px; }
              .no-print { display: none; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="store-name">${store.storeName}</div>
            <div class="store-info">${store.storeAddress}</div>
            <div class="store-info">Tel: ${store.phone}</div>
            <div class="store-info">${store.email}</div>
          </div>

          <div class="receipt-title">Official Receipt</div>

          <div class="meta-section">
            <div class="meta-row">
              <span class="meta-label">Reference ID</span>
              <span class="meta-value">#${transaction.id.slice(-8).toUpperCase()}</span>
            </div>
            <div class="meta-row">
              <span class="meta-label">Date</span>
              <span class="meta-value">${new Date(transaction.timestamp).toLocaleDateString()} ${new Date(transaction.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
            </div>
            <div class="meta-row">
              <span class="meta-label">Customer</span>
              <span class="meta-value">${transaction.customerName}</span>
            </div>
            <div class="meta-row">
              <span class="meta-label">Payment Method</span>
              <span class="meta-value">${transaction.paymentMethod}</span>
            </div>
            <div class="meta-row">
              <span class="meta-label">Order Type</span>
              <span class="meta-value">${transaction.isDelivery ? "Delivery" : "Pickup"}</span>
            </div>
          </div>

          <table class="items-table">
            <thead>
              <tr>
                <th>Items Description</th>
                <th style="text-align: right;">Amount</th>
              </tr>
            </thead>
            <tbody>
              ${transaction.items
                .map(
                  (item) =>
                    `<tr>
                      <td>
                        <span class="item-name">${item.product.name}</span>
                        <span class="item-meta">${item.quantity} x ₱${item.product.price.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                      </td>
                      <td class="item-total">₱${(item.product.price * item.quantity).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                    </tr>`
                )
                .join("")}
            </tbody>
          </table>

          <div class="totals-section">
            <div class="total-row">
              <span class="meta-label">Subtotal</span>
              <span class="meta-value">₱${transaction.subtotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
            </div>
            <div class="total-row">
              <span class="meta-label">Tax</span>
              <span class="meta-value">₱${transaction.tax.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
            </div>
            ${transaction.isDelivery ? `
            <div class="total-row">
              <span class="meta-label">Delivery Fee</span>
              <span class="meta-value">₱${(transaction.deliveryFee || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
            </div>` : ""}
            <div class="total-row grand-total">
              <span>TOTAL</span>
              <span>₱${transaction.total.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
            </div>
          </div>

          <div class="footer">
            <div class="footer-msg">${store.footerMessage || "Thank you for shopping!"}</div>
            <div class="store-info">Processed by: ${transaction.handledBy?.name || "System"}</div>
            
            <div class="signature">
              <div class="sig-line">Customer Signature</div>
              <div class="sig-line">Cashier Signature</div>
            </div>
            
            <div style="margin-top: 25px; font-size: 10px; color: #ccc;">
              This is a computer generated receipt.
            </div>
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  // PRINT TANAN APILA IMONG MAMAG PRINT
  //print for all the transactionssssit
  const printAllTransactions = () => {
    const store = getStoreSettings();
    const printWindow = window.open("", "_blank", "width=800,height=600");
    if (!printWindow) return;

    printWindow.document.write(`
      <html>
        <head>
          <title>Sales Report</title>
          <style>
            body { 
              font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; 
              padding: 40px; 
              color: #1a1a1a;
              line-height: 1.5;
            }
            .report-header { border-bottom: 2px solid #1a1a1a; padding-bottom: 20px; margin-bottom: 30px; display: flex; justify-content: space-between; align-items: flex-end; }
            .store-name { font-weight: 800; font-size: 24px; text-transform: uppercase; }
            .report-title { font-weight: 700; color: #666; font-size: 14px; text-transform: uppercase; letter-spacing: 2px; }
            
            .summary-bar { background: #f9f9f9; padding: 20px; border-radius: 8px; display: grid; grid-template-columns: repeat(4, 1fr); gap: 20px; margin-bottom: 40px; }
            .summary-item { display: flex; flex-direction: column; }
            .summary-label { font-size: 11px; color: #888; text-transform: uppercase; font-weight: 600; margin-bottom: 5px; }
            .summary-value { font-size: 18px; font-weight: 700; }
            
            .transaction-table { width: 100%; border-collapse: collapse; }
            .transaction-table th { text-align: left; padding: 12px; border-bottom: 1px solid #1a1a1a; font-size: 11px; text-transform: uppercase; font-weight: 700; color: #1a1a1a; }
            .transaction-table td { padding: 12px; border-bottom: 1px solid #eee; font-size: 13px; }
            .ref-id { font-family: monospace; font-weight: 600; color: #000; }
            .date-col { color: #666; font-size: 12px; }
            .total-col { font-weight: 700; text-align: right; }
            
            @media print {
              body { padding: 20px; }
            }
          </style>
        </head>
        <body>
          <div class="report-header">
            <div>
              <div class="store-name">${store.storeName}</div>
              <div style="font-size: 12px; color: #666;">${store.storeAddress}</div>
            </div>
            <div class="report-title">Sales Transaction Report</div>
          </div>

          <div class="summary-bar">
            <div class="summary-item">
              <span class="summary-label">Date Range</span>
              <span class="summary-value" style="font-size: 13px;">${dateFrom || "Start"} - ${dateTo || "End"}</span>
            </div>
            <div class="summary-item">
              <span class="summary-label">Transactions</span>
              <span class="summary-value">${filteredTransactions.length}</span>
            </div>
            <div class="summary-item">
              <span class="summary-label">Tax Total</span>
              <span class="summary-value">₱${filteredTransactions.reduce((s, t) => s + t.tax, 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
            </div>
            <div class="summary-item">
              <span class="summary-label">Total Revenue</span>
              <span class="summary-value">₱${filteredTransactions.reduce((s, t) => s + t.total, 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
            </div>
          </div>

          <table class="transaction-table">
            <thead>
              <tr>
                <th>REF ID</th>
                <th>DATE</th>
                <th>CUSTOMER</th>
                <th>ITEMS</th>
                <th>METHOD</th>
                <th style="text-align: right;">TOTAL</th>
              </tr>
            </thead>
            <tbody>
              ${filteredTransactions
                .map(
                  (t) => `
                  <tr>
                    <td class="ref-id">#${t.id.slice(-8).toUpperCase()}</td>
                    <td class="date-col">${new Date(t.timestamp).toLocaleDateString()}</td>
                    <td>${t.customerName}</td>
                    <td>${t.items.length} units</td>
                    <td>${t.paymentMethod}</td>
                    <td class="total-col">₱${t.total.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                  </tr>
                `
                )
                .join("")}
            </tbody>
          </table>
          
          <div style="margin-top: 50px; text-align: center; color: #999; font-size: 11px;">
            End of Report • Generated on ${new Date().toLocaleString()}
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  // Delete all transactions within date range
  const handleDeleteAll = async () => {
    if (!dateFrom || !dateTo) return;
    const confirmation = window.confirm(
      `CRITICAL ACTION: Delete all transactions from ${dateFrom} to ${dateTo}?\n\nThis cannot be undone and will permanently remove records from the system.`
    );
    if (!confirmation) return;
    setIsDeleting(true);
    try {
      const { deletedCount } = await onDeleteAll({ dateFrom, dateTo });
      alert(`Successfully purged ${deletedCount} transaction records.`);
    } catch (err: any) {
      alert(err?.message || "Failed to purge transactions. Please check your permissions.");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDeleteSingle = async (transaction: Transaction) => {
    if (!onDelete) return;
    const confirmation = window.confirm(
      `Delete transaction #${transaction.id.slice(-6).toUpperCase()} for ${transaction.customerName}?\n\nThis action is permanent.`
    );
    if (!confirmation) return;
    
    try {
      await onDelete(transaction.id);
      alert("Transaction deleted successfully.");
    } catch (err: any) {
      alert(err?.message || "Failed to delete transaction.");
    }
  };

  return (
    <div style={{ marginTop: "1rem" }}>
      {/* Summary Cards */}
      <div className="row g-4 mb-4">
        <div className="col-md-4">
          <div className="card border-0 rounded-4 shadow-sm p-3 bg-white">
            <div className="d-flex align-items-center justify-content-between mb-2">
              <div className="rounded-circle bg-primary bg-opacity-10 p-2">
                <BarChart3 size={20} className="text-primary" />
              </div>
              <span className="text-muted small fw-medium">Total Revenue</span>
            </div>
            <h3 className="fw-bold mb-0 text-dark">₱{totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</h3>
            <div className="text-success small mt-2 d-flex align-items-center">
              <Activity size={12} className="me-1" />
              <span>Lifetime Earnings</span>
            </div>
          </div>
        </div>

        <div className="col-md-4">
          <div className="card border-0 rounded-4 shadow-sm p-3 bg-white">
            <div className="d-flex align-items-center justify-content-between mb-2">
              <div className="rounded-circle bg-success bg-opacity-10 p-2">
                <Users size={20} className="text-success" />
              </div>
              <span className="text-muted small fw-medium">Total Transactions</span>
            </div>
            <h3 className="fw-bold mb-0 text-dark">{completedTransactions.toLocaleString()}</h3>
            <div className="text-muted small mt-2">
              Completed Orders
            </div>
          </div>
        </div>

        <div className="col-md-4">
          <div className="card border-0 rounded-4 shadow-sm p-3 bg-white">
            <div className="d-flex align-items-center justify-content-between mb-2">
              <div className="rounded-circle bg-warning bg-opacity-10 p-2">
                <Activity size={20} className="text-warning" />
              </div>
              <span className="text-muted small fw-medium">Average Sale</span>
            </div>
            <h3 className="fw-bold mb-0 text-dark">₱{averageTransaction.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</h3>
            <div className="text-muted small mt-2">
              Per Customer
            </div>
          </div>
        </div>
      </div>

      {/* Filters + Actions */}
      <div className="card border-0 rounded-4 shadow-sm mb-4 bg-white overflow-hidden">
        <div className="card-body p-3">
          <div className="row g-3 align-items-center">
            <div className="col-lg-4 position-relative">
              <Search size={18} className="position-absolute top-50 translate-middle-y ms-3 text-muted" />
              <input
                type="text"
                className="form-control form-control-lg border-light bg-light bg-opacity-50 ps-5 fs-6"
                placeholder="Search ID, customer, phone..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="col-lg-5">
              <div className="d-flex align-items-center gap-2">
                <div className="input-group">
                  <span className="input-group-text bg-transparent border-end-0 text-muted small"><Calendar size={14} /></span>
                  <input type="date" className="form-control border-start-0 ps-0 text-muted small" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
                </div>
                <span className="text-muted small">to</span>
                <div className="input-group">
                  <span className="input-group-text bg-transparent border-end-0 text-muted small"><Calendar size={14} /></span>
                  <input type="date" className="form-control border-start-0 ps-0 text-muted small" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
                </div>
              </div>
            </div>
            <div className="col-lg-3 text-end d-flex gap-2 justify-content-end">
              <button className="btn btn-outline-dark d-flex align-items-center" onClick={printAllTransactions}>
                <Printer size={16} className="me-2" /> Print
              </button>
              {canDeleteAll && (
                <div className="d-flex align-items-center gap-2" title={(!dateFrom || !dateTo) ? "Please select a date range (From & To) to enable deletion" : ""}>
                  <button
                    className={`btn d-flex align-items-center fw-medium px-3 rounded-3 transition-all ${
                      (!dateFrom || !dateTo || isDeleting) 
                        ? 'btn-light text-muted border-light' 
                        : 'btn-outline-danger shadow-sm'
                    }`}
                    onClick={handleDeleteAll}
                    disabled={!dateFrom || !dateTo || isDeleting}
                    style={{ minHeight: '44px' }}
                  >
                    {isDeleting ? (
                      <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                    ) : (
                      <Trash2 size={16} className="me-2" />
                    )}
                    {isDeleting ? "Purging..." : "Delete Range"}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="card border-0 rounded-4 shadow-sm bg-white overflow-hidden">
        <div className="table-responsive" ref={printAreaRef}>
          <table className="table table-hover align-middle mb-0">
            <thead className="bg-light border-bottom border-light">
              <tr>
                <th className="ps-4 py-3 text-muted small fw-bold text-uppercase">Reference</th>
                <th className="py-3 text-muted small fw-bold text-uppercase">Customer</th>
                <th className="py-3 text-muted small fw-bold text-uppercase">Date & Time</th>
                <th className="py-3 text-muted small fw-bold text-uppercase">Items</th>
                <th className="py-3 text-muted small fw-bold text-uppercase">Method</th>
                <th className="py-3 text-muted small fw-bold text-uppercase">Type</th>
                <th className="py-3 text-muted small fw-bold text-uppercase">Processor</th>
                <th className="py-3 text-muted small fw-bold text-uppercase">Total</th>
                <th className="pe-4 py-3 text-end text-muted small fw-bold text-uppercase">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredTransactions.map((transaction) => (
                <tr key={transaction.id} className="border-bottom border-light">
                  <td className="ps-4 fw-medium text-dark" style={{fontSize: "0.85rem"}}>#{transaction.id.slice(-6).toUpperCase()}</td>
                  <td>
                    <div className="fw-semibold text-dark">{transaction.customerName}</div>
                  </td>
                  <td>
                    <div className="text-dark small">{new Date(transaction.timestamp).toLocaleDateString()}</div>
                    <div className="text-muted" style={{fontSize: "0.75rem"}}>{new Date(transaction.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                  </td>
                  <td>
                    <span className="badge bg-light text-dark rounded-pill px-2 py-1 fw-medium border">
                      {transaction.items.length} {transaction.items.length === 1 ? 'item' : 'items'}
                    </span>
                  </td>
                  <td>
                    <span className="text-muted small d-flex align-items-center">
                      <CreditCard size={14} className="me-1" /> {transaction.paymentMethod}
                    </span>
                  </td>
                  <td>
                    <span className={`badge rounded-pill px-3 py-1 fw-bold ${transaction.isDelivery ? "bg-info bg-opacity-10 text-info" : "bg-secondary bg-opacity-10 text-secondary"}`} style={{fontSize: "0.7rem"}}>
                      {transaction.isDelivery ? "DELIVERY" : "PICKUP"}
                    </span>
                  </td>
                  <td>
                    <div className="small text-dark font-medium">{transaction.handledBy?.name || "System"}</div>
                    <div className="text-muted text-uppercase" style={{fontSize: "0.65rem"}}>{transaction.handledBy?.role || "N/A"}</div>
                  </td>
                  <td>
                    <div className="fw-bold text-dark">₱{transaction.total.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
                  </td>
                  <td className="pe-4 text-end">
                    <div className="btn-group shadow-sm rounded-3 overflow-hidden border border-light">
                      <button
                        className="btn btn-white btn-sm border-0 bg-transparent hover-bg-light p-2"
                        onClick={() => setSelectedTransaction(transaction)}
                        title="View Full Details"
                      >
                        <Eye size={18} className="text-primary" />
                      </button>
                      <button 
                        className="btn btn-white btn-sm border-0 bg-transparent hover-bg-light p-2" 
                        onClick={() => printTransaction(transaction)}
                        title="Print Thermal Receipt"
                      >
                        <Printer size={18} className="text-dark" />
                      </button>
                      {canDeleteAll && onDelete && (
                        <button 
                          className="btn btn-white btn-sm border-0 bg-transparent hover-bg-light p-2 text-danger" 
                          onClick={() => handleDeleteSingle(transaction)}
                          title="Delete Transaction"
                        >
                          <Trash2 size={18} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Transaction Details Modal */}
      {selectedTransaction && (
        <Modal 
          show={true} 
          onHide={() => setSelectedTransaction(null)} 
          size="lg" 
          centered
          className="details-modal"
          contentClassName="border-0 rounded-4 shadow-lg"
          backdropClassName="custom-backdrop"
        >
          <Modal.Header closeButton className="border-0 pb-0 pt-4 px-4">
            <Modal.Title className="fw-bold fs-4 d-flex align-items-center">
              <Receipt className="me-2 text-primary" size={24} />
              Transaction Receipt
            </Modal.Title>
          </Modal.Header>

          <Modal.Body className="p-4 pt-2">
            <div className="bg-light bg-opacity-50 p-3 rounded-4 mb-4 border border-light shadow-sm">
              <div className="row g-3">
                <div className="col-md-6">
                  <label className="text-muted small text-uppercase fw-bold mb-1 d-block">Customer Details</label>
                  <div className="d-flex align-items-center">
                    <div className="rounded-circle bg-white shadow-sm p-2 me-2">
                      <User size={16} className="text-primary" />
                    </div>
                    <div>
                      <div className="fw-bold text-dark">{selectedTransaction.customerName}</div>
                      <div className="text-muted small">ID: {selectedTransaction.id}</div>
                    </div>
                  </div>
                </div>
                <div className="col-md-6">
                  <label className="text-muted small text-uppercase fw-bold mb-1 d-block">Meta Information</label>
                  <div className="d-flex flex-column gap-1">
                    <div className="small d-flex justify-content-between">
                      <span className="text-muted">Date:</span>
                      <span className="fw-medium text-dark">{new Date(selectedTransaction.timestamp).toLocaleString()}</span>
                    </div>
                    <div className="small d-flex justify-content-between">
                      <span className="text-muted">Payment:</span>
                      <span className="fw-medium text-dark badge bg-white shadow-sm text-dark border-0">{selectedTransaction.paymentMethod}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <h6 className="fw-bold mb-3 d-flex align-items-center">
              <Package size={18} className="me-2 text-muted" />
              Purchased Items
            </h6>
            <div className="rounded-4 border overflow-hidden mb-4 shadow-sm bg-white">
              <table className="table table-hover align-middle mb-0">
                <thead className="bg-light small">
                  <tr>
                    <th className="ps-3 fw-bold text-muted">Product</th>
                    <th className="text-center fw-bold text-muted">Qty</th>
                    <th className="text-end pe-3 fw-bold text-muted">Price</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedTransaction.items.map((item, idx) => (
                    <tr key={idx}>
                      <td className="ps-3 fw-medium">{item.product.name}</td>
                      <td className="text-center fw-bold text-primary">{item.quantity}</td>
                      <td className="text-end pe-3 fw-bold text-dark">₱{(item.product.price * item.quantity).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="row justify-content-end">
              <div className="col-md-5">
                <div className="card border-0 bg-light rounded-4 p-3 border border-white shadow-sm">
                  <div className="d-flex justify-content-between mb-2">
                    <span className="text-muted small">Subtotal</span>
                    <span className="fw-medium">₱{selectedTransaction.subtotal.toFixed(2)}</span>
                  </div>
                  <div className="d-flex justify-content-between mb-2">
                    <span className="text-muted small">Tax</span>
                    <span className="fw-medium text-danger">+₱{selectedTransaction.tax.toFixed(2)}</span>
                  </div>
                  {selectedTransaction.isDelivery && (
                    <div className="d-flex justify-content-between mb-2">
                      <span className="text-muted small">Delivery Fee</span>
                      <span className="fw-medium text-primary">₱{selectedTransaction.deliveryFee?.toFixed(2)}</span>
                    </div>
                  )}
                  <hr className="my-2 border-secondary border-opacity-25" />
                  <div className="d-flex justify-content-between">
                    <span className="fw-bold text-dark">Grand Total</span>
                    <span className="fw-bold fs-5 text-primary">₱{selectedTransaction.total.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>

            {selectedTransaction.handledBy && (
              <div className="mt-4 pt-3 border-top border-light opacity-75">
                <div className="d-flex align-items-center small text-muted">
                  <User size={14} className="me-1" />
                  <span>Processed by <strong>{selectedTransaction.handledBy.name}</strong> ({selectedTransaction.handledBy.role}) • {selectedTransaction.handledBy.email}</span>
                </div>
              </div>
            )}
          </Modal.Body>

          <Modal.Footer className="border-0 px-4 pb-4 gap-2">
            <Button variant="light" className="rounded-3 px-4 fw-medium" onClick={() => setSelectedTransaction(null)}>
              Close
            </Button>
            <Button variant="dark" className="rounded-3 px-4 fw-medium d-flex align-items-center shadow-sm" onClick={() => printTransaction(selectedTransaction)}>
              <Printer size={18} className="me-2" />
              Print Receipt
            </Button>
          </Modal.Footer>
        </Modal>
      )}
    </div>
  );
}
