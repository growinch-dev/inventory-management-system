import { useState } from 'react';
import { Plus, Edit2, Trash2, Search, Filter, Calendar, IndianRupee } from 'lucide-react';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Modal from '../components/ui/Modal';
import Select from '../components/ui/Select';
import Textarea from '../components/ui/Textarea';

const Expenses = () => {
  const [expenses, setExpenses] = useState([
    {
      id: 1,
      date: '2026-11-20',
      category: 'salary',
      description: 'Factory Staff Salaries - November 2026',
      amount: 125000,
      paymentMode: 'bank_transfer',
      vendor: 'Internal',
      status: 'paid',
    },
    {
      id: 2,
      date: '2026-11-18',
      category: 'electricity',
      description: 'Factory Electricity Bill - November',
      amount: 18500,
      paymentMode: 'online',
      vendor: 'State Electricity Board',
      status: 'paid',
    },
    {
      id: 3,
      date: '2026-11-15',
      category: 'maintenance',
      description: 'Bottling Machine Maintenance',
      amount: 8500,
      paymentMode: 'cash',
      vendor: 'Tech Services',
      status: 'paid',
    },
    {
      id: 4,
      date: '2026-11-12',
      category: 'transport',
      description: 'Vehicle Fuel - November',
      amount: 12000,
      paymentMode: 'petty_cash',
      vendor: 'Multiple',
      status: 'paid',
    },
    {
      id: 5,
      date: '2026-11-10',
      category: 'rent',
      description: 'Factory Rent - November 2026',
      amount: 45000,
      paymentMode: 'bank_transfer',
      vendor: 'Landlord',
      status: 'paid',
    },
  ]);

  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentExpense, setCurrentExpense] = useState(null);

  const expenseCategories = [
    { value: 'salary', label: 'Salary & Wages' },
    { value: 'electricity', label: 'Electricity' },
    { value: 'rent', label: 'Rent' },
    { value: 'maintenance', label: 'Maintenance & Repairs' },
    { value: 'transport', label: 'Transport & Fuel' },
    { value: 'packaging', label: 'Packaging Materials' },
    { value: 'marketing', label: 'Marketing & Advertising' },
    { value: 'office', label: 'Office Expenses' },
    { value: 'misc', label: 'Miscellaneous' },
  ];

  const paymentModes = [
    { value: 'cash', label: 'Cash' },
    { value: 'bank_transfer', label: 'Bank Transfer' },
    { value: 'online', label: 'Online Payment' },
    { value: 'cheque', label: 'Cheque' },
    { value: 'petty_cash', label: 'Petty Cash' },
  ];

  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    category: '',
    description: '',
    amount: '',
    paymentMode: 'cash',
    vendor: '',
    billNumber: '',
    notes: '',
  });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleAddExpense = () => {
    setCurrentExpense(null);
    setFormData({
      date: new Date().toISOString().split('T')[0],
      category: '',
      description: '',
      amount: '',
      paymentMode: 'cash',
      vendor: '',
      billNumber: '',
      notes: '',
    });
    setIsModalOpen(true);
  };

  const handleEditExpense = (expense) => {
    setCurrentExpense(expense);
    setFormData({
      date: expense.date,
      category: expense.category,
      description: expense.description,
      amount: expense.amount,
      paymentMode: expense.paymentMode,
      vendor: expense.vendor,
      billNumber: expense.billNumber || '',
      notes: expense.notes || '',
    });
    setIsModalOpen(true);
  };

  const handleDeleteExpense = (id) => {
    if (window.confirm('Are you sure you want to delete this expense?')) {
      setExpenses(expenses.filter(exp => exp.id !== id));
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (currentExpense) {
      // Update existing expense
      setExpenses(expenses.map(exp =>
        exp.id === currentExpense.id
          ? { ...formData, id: exp.id, status: 'paid' }
          : exp
      ));
    } else {
      // Add new expense
      setExpenses([
        ...expenses,
        {
          ...formData,
          id: expenses.length + 1,
          status: 'paid',
        }
      ]);
    }

    setIsModalOpen(false);
  };

  const filteredExpenses = expenses.filter(expense => {
    const matchesSearch =
      expense.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      expense.vendor.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || expense.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const totalExpenses = filteredExpenses.reduce((sum, exp) => sum + exp.amount, 0);

  const categoryTotals = expenses.reduce((acc, expense) => {
    acc[expense.category] = (acc[expense.category] || 0) + expense.amount;
    return acc;
  }, {});

  const getCategoryLabel = (value) => {
    return expenseCategories.find(cat => cat.value === value)?.label || value;
  };

  const getPaymentModeLabel = (value) => {
    return paymentModes.find(mode => mode.value === value)?.label || value;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-primary-900">Expenses</h1>
          <p className="text-sm text-primary-600 mt-1">Track all business expenses and costs</p>
        </div>
        <Button onClick={handleAddExpense} className="flex items-center gap-2">
          <Plus className="w-4 h-4" />
          Add Expense
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg shadow-sm border border-primary-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-primary-600">Total Expenses</p>
              <p className="text-2xl font-bold text-primary-900 mt-1">
                ₹{totalExpenses.toLocaleString('en-IN')}
              </p>
            </div>
            <div className="p-3 bg-red-50 rounded-lg">
              <IndianRupee className="w-6 h-6 text-red-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow-sm border border-primary-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-primary-600">This Month</p>
              <p className="text-2xl font-bold text-primary-900 mt-1">
                ₹{totalExpenses.toLocaleString('en-IN')}
              </p>
            </div>
            <div className="p-3 bg-orange-50 rounded-lg">
              <Calendar className="w-6 h-6 text-orange-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow-sm border border-primary-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-primary-600">Total Entries</p>
              <p className="text-2xl font-bold text-primary-900 mt-1">
                {filteredExpenses.length}
              </p>
            </div>
            <div className="p-3 bg-blue-50 rounded-lg">
              <Filter className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow-sm border border-primary-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-primary-600">Avg per Entry</p>
              <p className="text-2xl font-bold text-primary-900 mt-1">
                ₹{filteredExpenses.length > 0 ? Math.round(totalExpenses / filteredExpenses.length).toLocaleString('en-IN') : 0}
              </p>
            </div>
            <div className="p-3 bg-purple-50 rounded-lg">
              <IndianRupee className="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow-sm border border-primary-100">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <Input
              icon={Search}
              placeholder="Search expenses..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="sm:w-64">
            <Select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
            >
              <option value="all">All Categories</option>
              {expenseCategories.map(cat => (
                <option key={cat.value} value={cat.value}>{cat.label}</option>
              ))}
            </Select>
          </div>
        </div>
      </div>

      {/* Expenses Table */}
      <div className="bg-white rounded-lg shadow-sm border border-primary-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-primary-200">
            <thead className="bg-primary-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-primary-900 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-primary-900 uppercase tracking-wider">
                  Category
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-primary-900 uppercase tracking-wider">
                  Description
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-primary-900 uppercase tracking-wider">
                  Vendor
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-primary-900 uppercase tracking-wider">
                  Payment Mode
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-primary-900 uppercase tracking-wider">
                  Amount
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-primary-900 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-primary-200">
              {filteredExpenses.map((expense) => (
                <tr key={expense.id} className="hover:bg-primary-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-primary-900">
                    {new Date(expense.date).toLocaleDateString('en-IN')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="px-2 py-1 text-xs font-medium bg-primary-100 text-primary-800 rounded-full">
                      {getCategoryLabel(expense.category)}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-primary-900">
                    {expense.description}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-primary-900">
                    {expense.vendor}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-primary-600">
                    {getPaymentModeLabel(expense.paymentMode)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium text-primary-900">
                    ₹{expense.amount.toLocaleString('en-IN')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleEditExpense(expense)}
                        className="text-primary-600 hover:text-primary-900"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteExpense(expense.id)}
                        className="text-red-600 hover:text-red-900"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add/Edit Expense Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={currentExpense ? 'Edit Expense' : 'Add New Expense'}
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Date"
              type="date"
              name="date"
              value={formData.date}
              onChange={handleInputChange}
              required
            />

            <Select
              label="Category"
              name="category"
              value={formData.category}
              onChange={handleInputChange}
              required
            >
              <option value="">Select Category</option>
              {expenseCategories.map(cat => (
                <option key={cat.value} value={cat.value}>{cat.label}</option>
              ))}
            </Select>
          </div>

          <Textarea
            label="Description"
            name="description"
            value={formData.description}
            onChange={handleInputChange}
            placeholder="Enter expense description..."
            rows={2}
            required
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Amount"
              type="number"
              name="amount"
              value={formData.amount}
              onChange={handleInputChange}
              placeholder="0.00"
              step="0.01"
              min="0"
              required
            />

            <Select
              label="Payment Mode"
              name="paymentMode"
              value={formData.paymentMode}
              onChange={handleInputChange}
              required
            >
              {paymentModes.map(mode => (
                <option key={mode.value} value={mode.value}>{mode.label}</option>
              ))}
            </Select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Vendor/Payee"
              name="vendor"
              value={formData.vendor}
              onChange={handleInputChange}
              placeholder="Enter vendor name..."
              required
            />

            <Input
              label="Bill/Receipt Number"
              name="billNumber"
              value={formData.billNumber}
              onChange={handleInputChange}
              placeholder="Optional"
            />
          </div>

          <Textarea
            label="Additional Notes"
            name="notes"
            value={formData.notes}
            onChange={handleInputChange}
            placeholder="Optional notes..."
            rows={2}
          />

          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsModalOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit">
              {currentExpense ? 'Update Expense' : 'Add Expense'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default Expenses;
