import { useState } from "react";
import type { Transaction } from "../types";
import { Eye, Search, CreditCard, DollarSign, Receipt } from "lucide-react";

interface TransactionHistoryProps {
  transactions: Transaction[];
}

export function TransactionHistory({ transactions }: TransactionHistoryProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [paymentFilter, setPaymentFilter] = useState("all");
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);

  const filteredTransactions = transactions.filter((transaction) => {
    const matchesSearch = transaction.id.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || transaction.status === statusFilter;
    const matchesPayment = paymentFilter === "all" || transaction.paymentMethod === paymentFilter;

    return matchesSearch && matchesStatus && matchesPayment;
  });

  const totalRevenue = transactions.reduce((sum, t) => sum + t.total, 0);
  const completedTransactions = transactions.filter((t) => t.status === "completed").length;
  const averageTransaction =
    transactions.length > 0 ? totalRevenue / transactions.length : 0;

  const getPaymentMethodIcon = (method: string) => {
    switch (method) {
      case "card":
        return <CreditCard size={16} />;
      case "cash":
        return <DollarSign size={16} />;
      case "digital":
        return <Receipt size={16} />;
      default:
        return null;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return <span className="badge bg-dark">Completed</span>;
      case "refunded":
        return <span className="badge bg-danger">Refunded</span>;
      case "pending":
        return <span className="badge bg-warning text-dark">Pending</span>;
      default:
        return <span className="badge bg-secondary">{status}</span>;
    }
  };

  return (
    <div className="container py-4">
      {/* Stats */}
      <div className="row mb-4">
        <div className="col-md-4">
          <div className="card text-center border-0" style={{boxShadow:"2px 4px 8px  rgba(0, 0, 0, 0.10)"}}>
            <div className="card-body">
              <h6 className="card-title">Total Revenue</h6>
              <p className="fw-bold">₱{totalRevenue.toFixed(2)}</p>
            </div>
          </div>
        </div>
        <div className="col-md-4">
          <div className="card text-center border-0" style={{boxShadow:"2px 4px 8px  rgba(0, 0, 0, 0.10)"}}>
            <div className="card-body">
              <h6 className="card-title">Total Transactions</h6>
              <p className="fw-bold">{completedTransactions}</p>
            </div>
          </div>
        </div>
        <div className="col-md-4">
          <div className="card text-center border-0" style={{boxShadow:"2px 4px 8px  rgba(0, 0, 0, 0.10)"}}>
            <div className="card-body">
              <h6 className="card-title">Average Transaction</h6>
              <p className="fw-bold">₱{averageTransaction.toFixed(2)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="d-flex gap-3 mb-3">
        <div className="flex-grow-1 position-relative">
          <Search
            size={16}
            className="position-absolute top-50 translate-middle-y ms-2 text-muted"
          />
          <input
            type="text"
            className="form-control ps-5"
            placeholder="Search by transaction ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <select
          className="form-select w-auto"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="all">All Status</option>
          <option value="completed">Completed</option>
          <option value="pending">Pending</option>
          <option value="refunded">Refunded</option>
        </select>

        {/* <select
          className="form-select w-auto"
          value={paymentFilter}
          onChange={(e) => setPaymentFilter(e.target.value)}
        >
          <option value="all">All Payment</option>
          <option value="card">Card</option>
          <option value="cash">Cash</option>
          <option value="digital">Digital</option>
        </select> */}
      </div>

      {/* Transactions Table */}
      <div className="card border-0" style={{boxShadow:"2px 4px 8px  rgba(0, 0, 0, 0.10)"}}>
        <div className="card-body p-0">
          <table className="table table-hover mb-0">
            <thead className="table-light">
              <tr>
                <th>Transaction ID</th>
                <th>Date & Time</th>
                <th>Items</th>
                <th>Payment Method</th>
                <th>Total</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredTransactions.map((transaction) => (
                <tr key={transaction.id}>
                  <td className="font-monospace">{transaction.id}</td>
                  <td>
                    <div>
                      <p className="mb-0">{transaction.timestamp.toLocaleDateString()}</p>
                      <small className="text-muted">
                        {transaction.timestamp.toLocaleTimeString()}
                      </small>
                    </div>
                  </td>
                  <td>
                    <p className="mb-0">
                      {transaction.items.length} item
                      {transaction.items.length !== 1 ? "s" : ""}
                    </p>
                    <small className="text-muted">
                      {transaction.items.slice(0, 2).map((item) => item.product.name).join(", ")}
                      {transaction.items.length > 2 && "..."}
                    </small>
                  </td>
                  <td>
                    <div className="d-flex align-items-center gap-2">
                      {getPaymentMethodIcon(transaction.paymentMethod)}
                      <span className="text-capitalize">{transaction.paymentMethod}</span>
                    </div>
                  </td>
                  <td className="fw-semibold">₱{transaction.total.toFixed(2)}</td>
                  <td>{getStatusBadge(transaction.status)}</td>
                  <td>
                    <button
                      className="btn btn-sm btn-outline-secondary"
                      onClick={() => setSelectedTransaction(transaction)}
                      data-bs-toggle="modal"
                      data-bs-target="#transactionModal"
                    >
                      <Eye size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Transaction Modal */}
      <div
        className="modal fade"
        id="transactionModal"
        tabIndex={-1}
        aria-hidden="true"
      >
        <div className="modal-dialog modal-dialog-centered">
          <div className="modal-content">
            {selectedTransaction && (
              <>
                <div className="modal-header">
                  <h5 className="modal-title">Transaction Details</h5>
                  <button
                    type="button"
                    className="btn-close"
                    data-bs-dismiss="modal"
                    aria-label="Close"
                  ></button>
                </div>
                <div className="modal-body">
                  <p>
                    <strong>Transaction ID:</strong> {selectedTransaction.id}
                  </p>
                  <p>
                    <strong>Date & Time:</strong>{" "}
                    {selectedTransaction.timestamp.toLocaleDateString()}{" "}
                    {selectedTransaction.timestamp.toLocaleTimeString()}
                  </p>
                  <p>
                    <strong>Payment Method:</strong>{" "}
                    {getPaymentMethodIcon(selectedTransaction.paymentMethod)}{" "}
                    {selectedTransaction.paymentMethod}
                  </p>
                  <p>
                    <strong>Status:</strong>{" "}
                    {getStatusBadge(selectedTransaction.status)}
                  </p>

                  <hr />
                  <h6>Items</h6>
                  {selectedTransaction.items.map((item, index) => (
                    <div key={index} className="d-flex justify-content-between">
                      <div>
                        {item.product.name}{" "}
                        <small className="text-muted">
                          ₱{item.product.price.toFixed(2)} x {item.quantity}
                        </small>
                      </div>
                      <span>
                        ₱{(item.product.price * item.quantity).toFixed(2)}
                      </span>
                    </div>
                  ))}

                  <hr />
                  <p>
                    <strong>Subtotal:</strong> ₱
                    {selectedTransaction.subtotal.toFixed(2)}
                  </p>
                  <p>
                    <strong>Tax:</strong> ₱{selectedTransaction.tax.toFixed(2)}
                  </p>
                  <p className="fw-bold">
                    Total: ₱{selectedTransaction.total.toFixed(2)}
                  </p>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}