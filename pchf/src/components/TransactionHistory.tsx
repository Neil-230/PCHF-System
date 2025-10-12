import { useState, useRef } from "react";
import type { Transaction } from "../types";
import { Eye, Search, CreditCard, DollarSign, Receipt, Printer, Trash2 } from "lucide-react";

interface TransactionHistoryProps {
  transactions: Transaction[];
  onDeleteAll: () => void; 
}

export function TransactionHistory({ transactions, onDeleteAll }: TransactionHistoryProps) {
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

  const printTransaction = (transaction: Transaction) => {
    const printWindow = window.open("", "_blank", "width=800,height=600");
    if (printWindow) {
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
            <hr/>
            <table>
              <thead><tr><th>Item</th><th>Qty</th><th>Price</th><th>Total</th></tr></thead>
              <tbody>
                ${transaction.items
                  .map(
                    (item) =>
                      `<tr><td>${item.product.name}</td><td>${item.quantity}</td><td>$${item.product.price.toFixed(
                        2
                      )}</td><td>$${(item.product.price * item.quantity).toFixed(2)}</td></tr>`
                  )
                  .join("")}
              </tbody>
            </table>
            <p><strong>Subtotal:</strong> $${transaction.subtotal.toFixed(2)}</p>
            <p><strong>Tax:</strong> $${transaction.tax.toFixed(2)}</p>
            <p><strong>Total:</strong> <b>$${transaction.total.toFixed(2)}</b></p>
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.print();
    }
  };

  // Print all 
  const printAllTransactions = () => {
    const printWindow = window.open("", "_blank", "width=800,height=600");
    if (printWindow) {
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
                              <td>$${item.product.price.toFixed(2)}</td>
                              <td>$${(item.product.price * item.quantity).toFixed(2)}</td>
                            </tr>`
                        )
                        .join("")}
                    </tbody>
                  </table>
                  <p><strong>Subtotal:</strong> $${t.subtotal.toFixed(2)}</p>
                  <p><strong>Tax:</strong> $${t.tax.toFixed(2)}</p>
                  <p><strong>Total:</strong> <b>$${t.total.toFixed(2)}</b></p>
                </div>
              `
              )
              .join("")}
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.print();
    }
  };

  //Delete all with confirmation
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

  return (
    <div className="container my-4">
      {/* Summary Cards */}
      <div className="row mb-4">
        <div className="col-md-4 mb-3">
          <div className="card text-center border border-0"
            style={{boxShadow:"2px 4px 8px  rgba(0, 0, 0, 0.10)", }}
          >
            <div className="card-body">
              <DollarSign size={20} className="mb-2" />
              <h6>Total Revenue</h6>
              <p className="fw-bold">${totalRevenue.toFixed(2)}</p>
            </div>
          </div>
        </div>
        <div className="col-md-4 mb-3">
          <div className="card text-center border border-0"
            style={{boxShadow:"2px 4px 8px  rgba(0, 0, 0, 0.10)", }}
          >
            <div className="card-body">
              <Receipt size={20} className="mb-2" />
              <h6>Total Transactions</h6>
              <p className="fw-bold">{completedTransactions}</p>
            </div>
          </div>
        </div>
        <div className="col-md-4 mb-3">
          <div className="card text-center border border-0"
            style={{boxShadow:"2px 4px 8px  rgba(0, 0, 0, 0.10)", }}
          >
            <div className="card-body">
              <CreditCard size={20} className="mb-2" />
              <h6>Average Transaction</h6>
              <p className="fw-bold">${averageTransaction.toFixed(2)}</p>
            </div>
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

        <div className="col-md-3">
          <input
            type="date"
            className="form-control"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
          />
        </div>

        <div className="col-md-3">
          <input
            type="date"
            className="form-control"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
          />
        </div>

        <div className="col-md-3 text-end">
          <button className="btn btn-dark me-2" onClick={printAllTransactions}>
            <Printer size={16} className="me-2" />
            Print All
          </button>
          <button className="btn btn-danger" onClick={handleDeleteAll}>
            <Trash2 size={16} className="me-2" />
            Delete All
          </button>
        </div>
      </div>

      {/* Transactions Table */}
      <div className="table-responsive d-flex rounded-2" ref={printAreaRef}>
        <table className="table table-striped table-bordered rounded-2"
          style={{boxShadow:"2px 4px 8px  rgba(0, 0, 0, 0.10)", }}
        >
          <thead className="rounded-2">
            <tr className="rounded-2">
              <th>ID</th>
              <th>Customer</th>
              <th>Date & Time</th>
              <th>Items</th>
              <th>Payment</th>
              <th>Total</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredTransactions.map((transaction) => (
              <tr key={transaction.id}>
                <td>{transaction.id}</td>
                <td>{transaction.customerName}</td>
                <td>{new Date(transaction.timestamp).toLocaleString()}</td>
                <td>{transaction.items.length}</td>
                <td>{transaction.paymentMethod}</td>
                <td>${transaction.total.toFixed(2)}</td>
                <td>
                  <button
                    className="btn btn-outline-secondary btn-sm me-1"
                    onClick={() => setSelectedTransaction(transaction)}
                  >
                    <Eye size={16} />
                  </button>
                  <button
                    className="btn btn-outline-secondary btn-sm"
                    onClick={() => printTransaction(transaction)}
                  >
                    <Printer size={16} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {selectedTransaction && (
        <div className="modal show d-block" tabIndex={-1}>
          <div className="modal-dialog modal-lg">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Transaction Details</h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setSelectedTransaction(null)}
                ></button>
              </div>
              <div className="modal-body">
                <p><strong>Customer:</strong> {selectedTransaction.customerName}</p>
                <p><strong>ID:</strong> {selectedTransaction.id}</p>
                <p><strong>Date & Time:</strong> {new Date(selectedTransaction.timestamp).toLocaleString()}</p>
                <p><strong>Payment Method:</strong> {selectedTransaction.paymentMethod}</p>

                <h6>Items:</h6>
                <ul className="list-group mb-3">
                  {selectedTransaction.items.map((item, idx) => (
                    <li key={idx} className="list-group-item d-flex justify-content-between">
                      <span>{item.product.name} x {item.quantity}</span>
                      <span>${(item.product.price * item.quantity).toFixed(2)}</span>
                    </li>
                  ))}
                </ul>

                <p><strong>Subtotal:</strong> ${selectedTransaction.subtotal.toFixed(2)}</p>
                <p><strong>Tax:</strong> ${selectedTransaction.tax.toFixed(2)}</p>
                <p className="fw-bold"><strong>Total:</strong> ${selectedTransaction.total.toFixed(2)}</p>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setSelectedTransaction(null)}>
                  Close
                </button>
                <button type="button" className="btn btn-primary" onClick={() => printTransaction(selectedTransaction)}>
                  🖨️ Print
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
