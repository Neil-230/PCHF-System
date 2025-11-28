//TransactionHistory.tsx ngano mag bout kag mag typscript ko
import { useState, useRef } from "react";
import type { Transaction } from "../types";
import { Eye, Search, CreditCard, DollarSign, Receipt, Printer, Trash2 } from "lucide-react";
import { Button, Modal } from "react-bootstrap";

interface TransactionHistoryProps {
  transactions: Transaction[];
  onDeleteAll: () => void;
  canDeleteAll?: boolean;
}

export function TransactionHistory({ transactions, onDeleteAll, canDeleteAll = false }: TransactionHistoryProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const printAreaRef = useRef<HTMLDivElement>(null);

  const filteredTransactions = transactions.filter((transaction) => {
    const matchesSearch = transaction.id.toLowerCase().includes(searchQuery.toLowerCase());
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

  // Delete all confirmation
  // ga bug rabani, dili ma delete kamo na debug ani uy for backend bitaw ang method ani
  const handleDeleteAll = () => {
    const confirmMessage = prompt(
      'Do you want to delete the entire transaction?\nCopy this message to confirm:\n\n"Delete Transaction"\n\nOr press Cancel to abort.'
    );
    if (confirmMessage === "Delete Transaction") {
      onDeleteAll();
      alert("All transactions have been deleted.");
    } else if (confirmMessage !== null) {
      alert("Confirmation text did not match. Deletion cancelled.");
    }
  };
  //kapuy nag modal tistingan taning prompt HAHA bati kaayo

  return (
    <div style={{ marginTop: "1rem" }}>
      {/* Summary Cards */}
      <div className="row g-3 mb-3">
        {/* Total Revenue */}
        <div className="col-md-4">
          <div className="card border-0 fs-5" style={{ boxShadow: "2px 4px 8px rgba(0,0,0,0.10)" }}>
            <h6>Total Revenue</h6>
            <p className="fw-bold m-0 text-primary">₱{totalRevenue.toFixed(2)}</p>
          </div>
        </div>
        {/* Total Transactions */}
        <div className="col-md-4">
          <div className="card border-0 fs-5" style={{ boxShadow: "2px 4px 8px rgba(0,0,0,0.10)" }}>
            <h6>Total Transactions</h6>
            <p className="fw-bold m-0 text-success">{completedTransactions}</p>
          </div>
        </div>
        {/* Average */}
        <div className="col-md-4">
          <div className="card border-0 fs-5" style={{ boxShadow: "2px 4px 8px rgba(0,0,0,0.10)" }}>
            <h6>Average Transaction</h6>
            <p className="fw-bold m-0 text-warning">₱{averageTransaction.toFixed(2)}</p>
          </div>
        </div>
      </div>

      {/* Filters + Actions */}
      <div className="row mb-3 g-3 align-items-center">
        <div className="col-md-3 position-relative">
          <Search size={16} className="position-absolute top-50 translate-middle-y ms-2" />
          <input
            type="text"
            className="form-control ps-5"
            placeholder="Search by transaction ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="col-md-3 d-flex align-items-center">
          <span className="fw-bold me-2">From</span>
          <input type="date" className="form-control" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
        </div>
        <div className="col-md-3 d-flex align-items-center">
          <span className="fw-bold me-2">To</span>
          <input type="date" className="form-control" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
        </div>
        <div className="col-md-3 text-end">
          <button className="btn btn-dark me-2" onClick={printAllTransactions}>
            <Printer size={16} className="me-2" /> Print All
          </button>
          {canDeleteAll && (
            <button className="btn btn-danger" onClick={handleDeleteAll}>
              <Trash2 size={16} className="me-2" /> Delete All
            </button>
          )}
        </div>
      </div>

      {/* table  */}
      <div className="card border-0 rounded-3" style={{boxShadow:"2px 4px 8px  rgba(0, 0, 0, 0.10)"}}>
        <div className="table-responsive d-flex rounded-2" ref={printAreaRef}>
          <table className="table table-hover rounded-2" >
            <thead>
              <tr>
                <th>ID</th>
                <th>Customer</th>
                <th>Date & Time</th>
                <th>Items</th>
                <th>Payment</th>
                <th>Delivery</th>
                <th>Processed By</th>
                <th>Total</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredTransactions.map((transaction) => (
                <tr key={transaction.id}>
                  <td>{transaction.id}</td>
                  <td>{transaction.customerName}</td>
                  <td>
                    <div style={{color: "blue"}}>{new Date(transaction.timestamp).toLocaleDateString()}</div>
                    <div>{new Date(transaction.timestamp).toLocaleTimeString()}</div>
                  </td>
                  <td>{transaction.items.length}</td>
                  <td>{transaction.paymentMethod}</td>
                  <td >{transaction.isDelivery ? "Yes" : "No"}</td>
                  <td>
                    {transaction.handledBy
                      ? `${transaction.handledBy.name} (${transaction.handledBy.role})`
                      : "N/A"}
                  </td>
                  <td>₱{transaction.total.toFixed(2)}</td>
                  <td>
                    <button
                      className="btn btn-outline-primary btn-sm me-1"
                      onClick={() => setSelectedTransaction(transaction)}
                    >
                      <Eye size={16} />
                    </button>
                    <button className="btn btn-outline-dark btn-sm" onClick={() => printTransaction(transaction)}>
                      <Printer size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* bushit na modal*/}
      {selectedTransaction && (
        <Modal show={true} onHide={() => setSelectedTransaction(null)} 
          size="lg" centered
          style={{ backgroundColor: "rgba(239, 252, 255, 0.31)" }}
        >
          <Modal.Header closeButton>
            <Modal.Title>Transaction Details</Modal.Title>
          </Modal.Header>

          <Modal.Body>
            <div className="me-3 ms-3">
              <p><strong>Customer:</strong> {selectedTransaction.customerName}</p>
              <p><strong>ID:</strong> {selectedTransaction.id}</p>
              <p><strong>Date & Time:</strong> {new Date(selectedTransaction.timestamp).toLocaleString()}</p>
              <p><strong>Payment Method:</strong> {selectedTransaction.paymentMethod}</p>
              <p><strong>Delivery:</strong> {selectedTransaction.isDelivery ? "Yes" : "No"}</p>
              {selectedTransaction.isDelivery && (
                <p><strong>Delivery Fee:</strong> ₱{selectedTransaction.deliveryFee?.toFixed(2)}</p>
              )}

              {selectedTransaction.handledBy && (
                <>
                  <hr />
                  <p><strong>Processed By:</strong> {selectedTransaction.handledBy.name} ({selectedTransaction.handledBy.role})</p>
                  <p><strong>Email:</strong> {selectedTransaction.handledBy.email}</p>
                </>
              )}

              <h6>Items:</h6>
              <ul className="list-group mb-3">
                {selectedTransaction.items.map((item, idx) => (
                  <li key={idx} className="list-group-item d-flex justify-content-between">
                    <span>{item.product.name} x {item.quantity}</span>
                    <span>₱{(item.product.price * item.quantity).toFixed(2)}</span>
                  </li>
                ))}
              </ul>

              <p><strong>Subtotal:</strong> ₱{selectedTransaction.subtotal.toFixed(2)}</p>
              <p><strong>Tax:</strong> ₱{selectedTransaction.tax.toFixed(2)}</p>
              {selectedTransaction.isDelivery && (
                <p><strong>Delivery Fee:</strong> ₱{selectedTransaction.deliveryFee?.toFixed(2)}</p>
              )}
              <p className="fw-bold"><strong>Total:</strong> ₱{selectedTransaction.total.toFixed(2)}</p>
            </div>
          </Modal.Body>

          <Modal.Footer>
            <Button variant="secondary" onClick={() => setSelectedTransaction(null)}>
              Close
            </Button>
            <Button variant="primary" onClick={() => printTransaction(selectedTransaction)}>
              🖨️ Print 
              {/* yaga pwedi man diay Emoji ang i icon ba HHAAHHAHA */}
            </Button>
          </Modal.Footer>
        </Modal>
      )}
    </div>
  );
}
