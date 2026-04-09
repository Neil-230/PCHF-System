//TransactionHistory.tsx ngano mag bout kag mag typscript ko
import { useState, useRef } from "react";
import type { Transaction } from "../types";
import { Eye, Search, CreditCard, DollarSign, Receipt, Printer, Trash2, Calendar, User, Activity, BarChart3, Users, Package } from "lucide-react";
import { Button, Modal } from "react-bootstrap";

interface TransactionHistoryProps {
  transactions: Transaction[];
  onDeleteAll: (params: { dateFrom: string; dateTo: string }) => Promise<{ deletedCount: number }>;
  canDeleteAll?: boolean;
}

export function TransactionHistory({ transactions, onDeleteAll, canDeleteAll = false }: TransactionHistoryProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const printAreaRef = useRef<HTMLDivElement>(null);

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
    const printWindow = window.open("", "_blank", "width=800,height=600");
    if (!printWindow) return;

    printWindow.document.write(`
      <html>
        <head>
          <title>Transaction ${transaction.id}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            h2 { text-align: center; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; }
            th, td { border: 1px solid #ccc; padding: 8px; text-align: left; }
            th { background: #f4f4f4; }
          </style>
        </head>
        <body>
          <h2>Transaction Receipt</h2>
          <p><strong>ID:</strong> ${transaction.id}</p>
          <p><strong>Customer:</strong> ${transaction.customerName}</p>
          <p><strong>Date:</strong> ${new Date(transaction.timestamp).toLocaleString()}</p>
          <p><strong>Payment Method:</strong> ${transaction.paymentMethod}</p>
          <p><strong>Delivery:</strong> ${transaction.isDelivery ? "Yes" : "No"}</p>
          ${transaction.isDelivery ? `<p><strong>Delivery Fee:</strong> ₱${(transaction.deliveryFee || 0).toFixed(2)}</p>` : ""}
          ${
            transaction.handledBy
              ? `<p><strong>Processed By:</strong> ${transaction.handledBy.name} (${transaction.handledBy.role})<br/>
                 <strong>Email:</strong> ${transaction.handledBy.email}</p>`
              : ""
          }
          <hr/>
          <table>
            <thead><tr><th>Item</th><th>Qty</th><th>Price</th><th>Total</th></tr></thead>
            <tbody>
              ${transaction.items
                .map(
                  (item) =>
                    `<tr>
                      <td>${item.product.name}</td>
                      <td>${item.quantity}</td>
                      <td>₱${item.product.price.toFixed(2)}</td>
                      <td>₱${(item.product.price * item.quantity).toFixed(2)}</td>
                    </tr>`
                )
                .join("")}
            </tbody>
          </table>
          <p><strong>Subtotal:</strong> ₱${transaction.subtotal.toFixed(2)}</p>
          <p><strong>Tax:</strong> ₱${transaction.tax.toFixed(2)}</p>
          ${transaction.isDelivery ? `<p><strong>Delivery Fee:</strong> ₱${(transaction.deliveryFee || 0).toFixed(2)}</p>` : ""}
          <p><strong>Total:</strong> <b>₱${transaction.total.toFixed(2)}</b></p>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  // PRINT TANAN APILA IMONG MAMAG PRINT
  //print for all the transactionssssit
  const printAllTransactions = () => {
    const printWindow = window.open("", "_blank", "width=800,height=600");
    if (!printWindow) return;
    

    //chat gpt nani atay kapuy naman
    printWindow.document.write(`
      <html>
        <head>
          <title>All Transactions</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            h2 { text-align: center; margin-bottom: 20px; }
            .transaction-block { margin-bottom: 40px; border-bottom: 1px solid #ccc; padding-bottom: 20px; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; }
            th, td { border: 1px solid #ccc; padding: 8px; text-align: left; }
            th { background: #f4f4f4; }
          </style>
        </head>
        <body>
          <h2>All Transactions Report</h2>
          <p><strong>Date Range:</strong> ${dateFrom || "Any"} to ${dateTo || "Any"}</p>
          <hr/>
          ${filteredTransactions
            .map(
              (t) => `
              <div class="transaction-block">
                <p><strong>Transaction ID:</strong> ${t.id}</p>
                <p><strong>Customer:</strong> ${t.customerName}</p>
                <p><strong>Date:</strong> ${new Date(t.timestamp).toLocaleString()}</p>
                <p><strong>Payment Method:</strong> ${t.paymentMethod}</p>
                <p><strong>Delivery:</strong> ${t.isDelivery ? "Yes" : "No"}</p>
                ${t.isDelivery ? `<p><strong>Delivery Fee:</strong> $${(t.deliveryFee || 0).toFixed(2)}</p>` : ""}
                ${
                  t.handledBy
                    ? `<p><strong>Processed By:</strong> ${t.handledBy.name} (${t.handledBy.role})<br/>
                       <strong>Email:</strong> ${t.handledBy.email}</p>`
                    : ""
                }
                <table>
                  <thead>
                    <tr><th>Item</th><th>Qty</th><th>Price</th><th>Total</th></tr>
                  </thead>
                  <tbody>
                    ${t.items
                      .map(
                        (item) => `
                          <tr>
                            <td>${item.product.name}</td>
                            <td>${item.quantity}</td>
                            <td>₱${item.product.price.toFixed(2)}</td>
                            <td>₱${(item.product.price * item.quantity).toFixed(2)}</td>
                          </tr>`
                      )
                      .join("")}
                  </tbody>
                </table>
                <p><strong>Subtotal:</strong> ₱${t.subtotal.toFixed(2)}</p>
                <p><strong>Tax:</strong> ₱${t.tax.toFixed(2)}</p>
                ${t.isDelivery ? `<p><strong>Delivery Fee:</strong> ₱${(t.deliveryFee || 0).toFixed(2)}</p>` : ""}
                <p><strong>Total:</strong> <b>₱${t.total.toFixed(2)}</b></p>
              </div>
            `
            )
            .join("")}
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  // Delete all transactions within date range
  const handleDeleteAll = async () => {
    if (!dateFrom || !dateTo) {
      alert("Please select both start and end dates before deleting.");
      return;
    }
    const confirmation = window.confirm(
      `Delete all transactions from ${dateFrom} to ${dateTo}? This cannot be undone.`
    );
    if (!confirmation) return;
    setIsDeleting(true);
    try {
      const { deletedCount } = await onDeleteAll({ dateFrom, dateTo });
      alert(`Deleted ${deletedCount} transaction${deletedCount === 1 ? "" : "s"} successfully.`);
    } catch (err: any) {
      alert(err?.message || "Failed to delete transactions. Please try again.");
    } finally {
      setIsDeleting(false);
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
                <button
                  className="btn btn-outline-danger d-flex align-items-center"
                  onClick={handleDeleteAll}
                  disabled={!dateFrom || !dateTo || isDeleting}
                >
                  <Trash2 size={16} className="me-2" /> Delete
                </button>
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
                    <div className="btn-group shadow-sm rounded-3 overflow-hidden">
                      <button
                        className="btn btn-white btn-sm border-0 bg-transparent hover-bg-light"
                        onClick={() => setSelectedTransaction(transaction)}
                        title="View Details"
                      >
                        <Eye size={18} className="text-primary" />
                      </button>
                      <button 
                        className="btn btn-white btn-sm border-0 bg-transparent hover-bg-light" 
                        onClick={() => printTransaction(transaction)}
                        title="Print Receipt"
                      >
                        <Printer size={18} className="text-dark" />
                      </button>
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
