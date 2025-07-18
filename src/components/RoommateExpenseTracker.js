import React, { useState, useEffect } from 'react';
import './res.css';

const API_URL = 'https://ample-ambition-production.up.railway.app/api';

// Currency configuration
const CURRENCY = {
  code: 'INR',
  symbol: '₹',
  conversionRate: 1,
};

// Helper function to get week number
const getWeekNumber = (date) => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 3 - (d.getDay() + 6) % 7);
  const week1 = new Date(d.getFullYear(), 0, 4);
  return 1 + Math.round(((d - week1) / 86400000 - 3 + (week1.getDay() + 6) % 7) / 7);
};

const RoommateExpenseTracker = () => {
  const [roommates, setRoommates] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [newRoommate, setNewRoommate] = useState('');
  const [newExpense, setNewExpense] = useState({
    description: '',
    amount: '',
    paidBy: '',
    date: new Date().toISOString().split('T')[0],
    splitAmong: []
  });
  const [activeTab, setActiveTab] = useState('roommates');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Authentication state
  const [user, setUser] = useState(JSON.parse(localStorage.getItem('user')) || null);
  const [token, setToken] = useState(localStorage.getItem('token') || null);
  
  // Notification state
  const [notification, setNotification] = useState({ show: false, message: '', type: 'success' });

  // Settlement state
  const [settlements, setSettlements] = useState([]);
  const [showSettleModal, setShowSettleModal] = useState(false);
  const [currentSettlement, setCurrentSettlement] = useState({
    fromId: '',
    toId: '',
    amount: '',
    date: new Date().toISOString().split('T')[0]
  });
  const [historyTab, setHistoryTab] = useState('expenses');
  const [expenseViewType, setExpenseViewType] = useState('day');
  const [sortOrder, setSortOrder] = useState('desc');

  // Utility functions for grouping expenses
  const groupByDay = (expenses) => {
    const grouped = {};
    expenses.forEach(expense => {
      const date = new Date(expense.date).toLocaleDateString();
      if (!grouped[date]) {
        grouped[date] = {
          date,
          total: 0,
          expenses: []
        };
      }
      grouped[date].total += parseFloat(expense.amount);
      grouped[date].expenses.push(expense);
    });
    return Object.values(grouped);
  };

  const groupByWeek = (expenses) => {
    const grouped = {};
    expenses.forEach(expense => {
      const date = new Date(expense.date);
      const year = date.getFullYear();
      const weekNum = getWeekNumber(date);
      const weekKey = `Week ${weekNum}, ${year}`;
      
      if (!grouped[weekKey]) {
        grouped[weekKey] = {
          week: weekNum,
          year,
          total: 0,
          expenses: []
        };
      }
      grouped[weekKey].total += parseFloat(expense.amount);
      grouped[weekKey].expenses.push(expense);
    });
    return Object.values(grouped);
  };

  const groupByMonth = (expenses) => {
    const grouped = {};
    expenses.forEach(expense => {
      const date = new Date(expense.date);
      const month = date.toLocaleString('default', { month: 'long' });
      const year = date.getFullYear();
      const monthKey = `${month} ${year}`;
      
      if (!grouped[monthKey]) {
        grouped[monthKey] = {
          month,
          year,
          total: 0,
          expenses: []
        };
      }
      grouped[monthKey].total += parseFloat(expense.amount);
      grouped[monthKey].expenses.push(expense);
    });
    return Object.values(grouped);
  };

  // Show notification helper function
  const showNotification = (message, type = 'success') => {
    setNotification({ show: true, message, type });
    setTimeout(() => {
      setNotification({ show: false, message: '', type: 'success' });
    }, 3000);
  };

  // Check if user is authenticated
  useEffect(() => {
    if (!user || !token) {
      window.location.href = '/login';
    }
  }, [user, token]);

  // Fetch data when component mounts
  useEffect(() => {
    const fetchData = async () => {
      if (!token) return;
      
      setIsLoading(true);
      try {
        const headers = {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'Access-Control-Allow-Origin': '*'
        };
        
        // Fetch roommates
        const roommatesResponse = await fetch(`${API_URL}/roommates`, { 
          headers,
          mode: 'cors'
        });
        
        if (!roommatesResponse.ok) {
          if (roommatesResponse.status === 401 || roommatesResponse.status === 403) {
            handleLogout();
            throw new Error('Session expired. Please login again');
          }
          if (roommatesResponse.status === 404) {
            setRoommates([]);
          } else {
            throw new Error('Failed to fetch roommates');
          }
        } else {
          const roommatesData = await roommatesResponse.json();
          setRoommates(roommatesData || []);
        }
        
        // Fetch expenses
        const expensesResponse = await fetch(`${API_URL}/expenses`, { 
          headers,
          mode: 'cors'
        });
        
        if (!expensesResponse.ok) {
          if (expensesResponse.status === 404) {
            setExpenses([]);
          } else {
            throw new Error('Failed to fetch expenses');
          }
        } else {
          const expensesData = await expensesResponse.json();
          const formattedExpenses = expensesData.map(expense => ({
            ...expense,
            amount: parseFloat(expense.amount),
            date: expense.date.split('T')[0],
            splitAmong: expense.splitAmong || roommates.map(r => r.id)
          }));
          setExpenses(formattedExpenses || []);
        }

        // Fetch settlements
        const settlementsResponse = await fetch(`${API_URL}/settlements`, { 
          headers,
          mode: 'cors'
        });
        
        if (!settlementsResponse.ok) {
          if (settlementsResponse.status === 404) {
            setSettlements([]);
          } else {
            throw new Error('Failed to fetch settlements');
          }
        } else {
          const settlementsData = await settlementsResponse.json();
          setSettlements(settlementsData || []);
        }
      } catch (err) {
        console.error('Error fetching data:', err);
        if (err.message !== 'Failed to fetch roommates' && 
            err.message !== 'Failed to fetch expenses' &&
            err.message !== 'Failed to fetch settlements') {
          setError(err.message);
          showNotification(err.message, 'error');
        }
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchData();
  }, [token]);

  // Calculate splits based on expenses and settlements
  const calculateSplits = () => {
    const splits = {};
    
    // Initialize splits for each roommate
    roommates.forEach(roommate => {
      splits[roommate.id] = { paid: 0, owes: 0, net: 0 };
    });
    
    // Calculate what each person paid and owes from expenses
    expenses.forEach(expense => {
      const paidById = parseInt(expense.paidBy);
      const amount = parseFloat(expense.amount);
      
      const participantsForThisExpense = expense.splitAmong && expense.splitAmong.length > 0
        ? expense.splitAmong.map(id => parseInt(id))
        : roommates.map(r => r.id);
      
      const splitAmount = amount / participantsForThisExpense.length;
      
      if (splits[paidById]) {
        splits[paidById].paid += amount;
      }
      
      participantsForThisExpense.forEach(participantId => {
        if (splits[participantId]) {
          splits[participantId].owes += splitAmount;
        }
      });
    });

    // Adjust balances based on settlements
    settlements.forEach(settlement => {
      const fromId = parseInt(settlement.fromId);
      const toId = parseInt(settlement.toId);
      const amount = parseFloat(settlement.amount);

      if (splits[fromId]) {
        splits[fromId].owes -= amount; // Reduced what they owe
      }
      if (splits[toId]) {
        splits[toId].paid -= amount; // Reduced what they're owed
      }
    });
    
    // Calculate net for each person
    roommates.forEach(roommate => {
      splits[roommate.id].net = splits[roommate.id].paid - splits[roommate.id].owes;
    });
    
    return splits;
  };

  // Handle settlement modal opening
  const handleOpenSettleModal = (fromId, toId) => {
    setCurrentSettlement({
      fromId,
      toId,
      amount: '',
      date: new Date().toISOString().split('T')[0]
    });
    setShowSettleModal(true);
  };

  // Handle settlement submission
  const handleAddSettlement = async () => {
    if (!currentSettlement.fromId || !currentSettlement.toId || !currentSettlement.amount || isNaN(parseFloat(currentSettlement.amount))) {
      showNotification('Please enter a valid amount', 'error');
      return;
    }

    try {
      const response = await fetch(`${API_URL}/settlements`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({
          fromId: parseInt(currentSettlement.fromId),
          toId: parseInt(currentSettlement.toId),
          amount: parseFloat(currentSettlement.amount),
          date: currentSettlement.date
        }),
        mode: 'cors'
      });
      
      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          handleLogout();
          throw new Error('Session expired. Please login again');
        }
        
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to add settlement');
      }
      
      const data = await response.json();
      setSettlements([...settlements, data]);
      setShowSettleModal(false);
      showNotification('Settlement recorded successfully!');
    } catch (err) {
      console.error('Error adding settlement:', err);
      showNotification(err.message, 'error');
    }
  };

  // Expense Item Component
  const ExpenseItem = ({ expense, roommates }) => {
    const paidByRoommate = roommates.find(r => r.id === parseInt(expense.paidBy));
    const participants = expense.splitAmong && expense.splitAmong.length > 0
      ? roommates.filter(r => expense.splitAmong.includes(r.id))
      : roommates;
    const participantNames = participants.map(r => r.name).join(', ');

    return (
      <div className="expense-card">
        <div className="expense-date">
          {new Date(expense.date).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric'
          })}
        </div>
        
        <div className="expense-details">
          <div className="expense-description">
            {expense.description}
          </div>
          
          <div className="expense-payment">
            <span className="paid-by">
              Paid by {paidByRoommate ? paidByRoommate.name : 'Unknown'}
            </span>
            <span className="amount">
              {formatCurrency(parseFloat(expense.amount))}
            </span>
          </div>
          
          <div className="expense-split">
            Split among: {participantNames}
          </div>
        </div>
      </div>
    );
  };

  const handleAddRoommate = async () => {
    if (newRoommate.trim() === '') {
      showNotification('Please enter a roommate name', 'error');
      return;
    }
    
    try {
      const response = await fetch(`${API_URL}/roommates`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({ name: newRoommate }),
        mode: 'cors'
      });
      
      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          handleLogout();
          throw new Error('Session expired. Please login again');
        }
        
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to add roommate');
      }
      
      const data = await response.json();
      setRoommates([...roommates, data]);
      setNewRoommate('');
      showNotification(`${newRoommate} added successfully!`);
    } catch (err) {
      console.error('Error adding roommate:', err);
      showNotification(err.message, 'error');
    }
  };

  const handleRemoveRoommate = async (id) => {
    try {
      const roommateToRemove = roommates.find(roommate => roommate.id === id);
      
      const response = await fetch(`${API_URL}/roommates/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Access-Control-Allow-Origin': '*'
        },
        mode: 'cors'
      });
      
      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          handleLogout();
          throw new Error('Session expired. Please login again');
        }
        
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to remove roommate');
      }
      
      setRoommates(roommates.filter(roommate => roommate.id !== id));
      showNotification(`${roommateToRemove.name} removed successfully`, 'info');
    } catch (err) {
      console.error('Error removing roommate:', err);
      showNotification(err.message, 'error');
    }
  };

  const handleToggleParticipant = (roommateId) => {
    const isSelected = newExpense.splitAmong.includes(roommateId);
    
    if (isSelected) {
      setNewExpense({
        ...newExpense,
        splitAmong: newExpense.splitAmong.filter(id => id !== roommateId)
      });
    } else {
      setNewExpense({
        ...newExpense,
        splitAmong: [...newExpense.splitAmong, roommateId]
      });
    }
  };

  useEffect(() => {
    if (activeTab === 'expenses' && roommates.length > 0 && newExpense.splitAmong.length === 0) {
      setNewExpense({
        ...newExpense,
        splitAmong: roommates.map(r => r.id)
      });
    }
  }, [activeTab, roommates]);

  const handleAddExpense = async () => {
    if (roommates.length === 0) {
      showNotification('Please add at least one roommate first', 'error');
      setActiveTab('roommates');
      return;
    }
    
    if (newExpense.description.trim() === '') {
      showNotification('Please enter a description', 'error');
      return;
    }
    
    if (newExpense.amount === '' || isNaN(parseFloat(newExpense.amount)) || parseFloat(newExpense.amount) <= 0) {
      showNotification('Please enter a valid amount', 'error');
      return;
    }
    
    if (newExpense.paidBy === '') {
      showNotification('Please select who paid', 'error');
      return;
    }

    if (newExpense.splitAmong.length === 0) {
      showNotification('Please select at least one person to split the expense with', 'error');
      return;
    }

    try {
      const response = await fetch(`${API_URL}/expenses`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({
          description: newExpense.description,
          amount: parseFloat(newExpense.amount),
          paidBy: parseInt(newExpense.paidBy),
          date: newExpense.date,
          splitAmong: newExpense.splitAmong
        }),
        mode: 'cors'
      });
      
      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          handleLogout();
          throw new Error('Session expired. Please login again');
        }
        
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to add expense');
      }
      
      const data = await response.json();
      setExpenses([...expenses, {
        ...data,
        amount: parseFloat(data.amount),
        splitAmong: newExpense.splitAmong
      }]);
      
      showNotification(`Expense "${newExpense.description}" added successfully!`);
      
      setNewExpense({
        description: '',
        amount: '',
        paidBy: '',
        date: newExpense.date,
        splitAmong: roommates.map(r => r.id)
      });
    } catch (err) {
      console.error('Error adding expense:', err);
      showNotification(err.message, 'error');
    }
  };

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    if (roommates.length === 0 && tab !== 'roommates') {
      showNotification('Please add roommates first', 'info');
      setActiveTab('roommates');
    } else {
      if (tab === 'expenses' && roommates.length > 0) {
        setNewExpense({
          ...newExpense,
          splitAmong: roommates.map(r => r.id)
        });
      }
      showNotification(`Switched to ${tab.charAt(0).toUpperCase() + tab.slice(1)} tab`, 'info');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    setUser(null);
    setToken(null);
    showNotification('Logged out successfully', 'info');
    window.location.href = '/login';
  };

  const splits = calculateSplits();

  const formatCurrency = (amount) => {
    return `${CURRENCY.symbol} ${amount.toFixed(2)}`;
  };

  const generatePaymentSuggestions = () => {
    const suggestions = [];
    const debtors = [];
    const creditors = [];
    
    roommates.forEach(roommate => {
      const netAmount = splits[roommate.id].net;
      
      if (netAmount < 0) {
        debtors.push({
          id: roommate.id,
          name: roommate.name,
          amount: Math.abs(netAmount)
        });
      } else if (netAmount > 0) {
        creditors.push({
          id: roommate.id,
          name: roommate.name,
          amount: netAmount
        });
      }
    });
    
    debtors.sort((a, b) => b.amount - a.amount);
    creditors.sort((a, b) => b.amount - a.amount);
    
    for (const debtor of debtors) {
      let remainingDebt = debtor.amount;
      
      for (let i = 0; i < creditors.length && remainingDebt > 0.01; i++) {
        const creditor = creditors[i];
        
        if (creditor.amount <= 0.01) continue;
        
        const paymentAmount = Math.min(remainingDebt, creditor.amount);
        
        if (paymentAmount >= 0.01) {
          suggestions.push({
            fromId: debtor.id,
            fromName: debtor.name,
            toId: creditor.id,
            toName: creditor.name,
            amount: paymentAmount
          });
          
          remainingDebt -= paymentAmount;
          creditors[i] = {
            ...creditor,
            amount: creditor.amount - paymentAmount
          };
        }
      }
    }
    
    return suggestions.length > 0 ? suggestions : null;
  };

  const paymentSuggestions = generatePaymentSuggestions();

  // Sort expenses based on sortOrder
  const sortedExpenses = [...expenses].sort((a, b) => {
    const dateA = new Date(a.date);
    const dateB = new Date(b.date);
    return sortOrder === 'desc' ? dateB - dateA : dateA - dateB;
  });

  if (isLoading) {
    return (
      <div className="app-container">
        <div className="loading-spinner">Loading...</div>
      </div>
    );
  }

  return (
    <div className="app-container">
      {notification.show && (
        <div className={`notification notification-${notification.type}`}>
          <span className="notification-message">{notification.message}</span>
          <button 
            className="notification-close"
            onClick={() => setNotification({ show: false, message: '', type: 'success' })}
          >
            ×
          </button>
        </div>
      )}

      {/* Settlement Modal */}
      {showSettleModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3>Record Settlement</h3>
            <div className="form-group">
              <label>From</label>
              <input 
                type="text" 
                value={roommates.find(r => r.id === parseInt(currentSettlement.fromId))?.name || ''} 
                readOnly 
              />
            </div>
            <div className="form-group">
              <label>To</label>
              <input 
                type="text" 
                value={roommates.find(r => r.id === parseInt(currentSettlement.toId))?.name || ''} 
                readOnly 
              />
            </div>
            <div className="form-group">
              <label>Amount</label>
              <div className="input-group">
                <span>{CURRENCY.symbol}</span>
                <input
                  type="number"
                  placeholder="0.00"
                  min="0.01"
                  step="0.01"
                  value={currentSettlement.amount}
                  onChange={(e) => setCurrentSettlement({
                    ...currentSettlement,
                    amount: e.target.value
                  })}
                />
              </div>
            </div>
            <div className="form-group">
              <label>Date</label>
              <input
                type="date"
                value={currentSettlement.date}
                onChange={(e) => setCurrentSettlement({
                  ...currentSettlement,
                  date: e.target.value
                })}
              />
            </div>
            <div className="modal-actions">
              <button 
                className="cancel-button"
                onClick={() => setShowSettleModal(false)}
              >
                Cancel
              </button>
              <button 
                className="confirm-button"
                onClick={handleAddSettlement}
              >
                Record Settlement
              </button>
            </div>
          </div>
        </div>
      )}
      
      <div className="content-wrapper">
        <div className="app-header">
          <div className="app-header-bg"></div>
          <div className="particle"></div>
          <div className="particle"></div>
          <div className="particle"></div>
          <div className="particle"></div>
          <h1>Room Expense Tracker (₹)</h1>
          <p>Track expenses, split bills, and keep roommate finances clear</p>
          
          {user && (
            <div className="user-info">
              <span className="welcome-text">Welcome, {user.fullName}</span>
            </div>
          )}
        </div>
        
        <div className="tabs">
          <button 
            className={`tab-button ${activeTab === 'roommates' ? 'active' : ''}`}
            onClick={() => handleTabChange('roommates')}
          >
            Roommates
          </button>
          <button 
            className={`tab-button ${activeTab === 'expenses' ? 'active' : ''}`}
            onClick={() => handleTabChange('expenses')}
          >
            Add Expense
          </button>
          <button 
            className={`tab-button ${activeTab === 'splits' ? 'active' : ''}`}
            onClick={() => handleTabChange('splits')}
          >
            Splits
          </button>
          <button 
            className={`tab-button ${activeTab === 'history' ? 'active' : ''}`}
            onClick={() => handleTabChange('history')}
          >
            History
          </button>
          {user && (
            <button 
              className="tab-button logout-tab"
              onClick={handleLogout}
            >
              Logout
            </button>
          )}
        </div>
        
        <div className="tab-content">
          {/* Roommates Section */}
          {activeTab === 'roommates' && (
            <div className="section-container">
              <h2>Manage Roommates</h2>
              
              <div className="add-roommate-form">
                <input
                  type="text"
                  placeholder="New roommate name"
                  value={newRoommate}
                  onChange={(e) => setNewRoommate(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleAddRoommate()}
                />
                <button 
                  className="add-button"
                  onClick={handleAddRoommate}
                >
                  Add
                </button>
              </div>
              
              <div className="roommate-list">
                {roommates.length === 0 ? (
                  <div className="empty-state">
                    <p>No roommates added yet. Add your first roommate above!</p>
                    <p className="hint">You need to add roommates before you can track expenses.</p>
                  </div>
                ) : (
                  roommates.map((roommate) => (
                    <div 
                      key={roommate.id}
                      className="roommate-card"
                    >
                      <div className="avatar-with-name">
                        <div className="avatar">
                          {roommate.name.charAt(0).toUpperCase()}
                        </div>
                        <span>{roommate.name}</span>
                      </div>
                      <button 
                        className="remove-button"
                        onClick={() => handleRemoveRoommate(roommate.id)}
                      >
                        Remove
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
          
          {/* Add Expense Section */}
          {activeTab === 'expenses' && (
            <div className="section-container">
              <h2>Add New Expense</h2>
              
              {roommates.length === 0 ? (
                <div className="empty-state">
                  <p>You need to add roommates before adding expenses.</p>
                  <button 
                    className="redirect-button"
                    onClick={() => setActiveTab('roommates')}
                  >
                    Go to Roommates
                  </button>
                </div>
              ) : (
                <div className="form-container">
                  <div className="form-grid">
                    <div className="form-group">
                      <label>Description</label>
                      <input
                        type="text"
                        placeholder="What was purchased?"
                        value={newExpense.description}
                        onChange={(e) => setNewExpense({...newExpense, description: e.target.value})}
                      />
                    </div>
                    
                    <div className="form-group">
                      <label>Amount</label>
                      <div className="input-group">
                        <span>₹</span>
                        <input
                          type="number"
                          placeholder="0.00"
                          min="0.01"
                          step="0.01"
                          value={newExpense.amount}
                          onChange={(e) => setNewExpense({...newExpense, amount: e.target.value})}
                        />
                      </div>
                    </div>
                    
                    <div className="form-group">
                      <label>Paid By</label>
                      <select
                        value={newExpense.paidBy}
                        onChange={(e) => setNewExpense({...newExpense, paidBy: e.target.value})}
                      >
                        <option value="">Select roommate</option>
                        {roommates.map(roommate => (
                          <option key={roommate.id} value={roommate.id}>
                            {roommate.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    
                    <div className="form-group">
                      <label>Date</label>
                      <input
                        type="date"
                        value={newExpense.date}
                        onChange={(e) => setNewExpense({...newExpense, date: e.target.value})}
                      />
                    </div>
                  </div>
                  
                  <div className="form-section">
                    <h3>Split Among</h3>
                    <p className="hint">Deselect roommates to exclude them from this expense</p>
                    
                    <div className="split-selection">
                      {roommates.map(roommate => (
                        <div 
                          key={roommate.id} 
                          className={`split-option ${newExpense.splitAmong.includes(roommate.id) ? 'selected' : ''}`}
                          onClick={() => handleToggleParticipant(roommate.id)}
                        >
                          <div className="avatar">
                            {roommate.name.charAt(0).toUpperCase()}
                          </div>
                          <span>{roommate.name}</span>
                          <span className="checkmark">
                            {newExpense.splitAmong.includes(roommate.id) ? '✓' : ''}
                          </span>
                        </div>
                      ))}
                    </div>
                    
                    {newExpense.splitAmong.length > 0 && (
                      <p className="split-info">
                        {newExpense.amount && !isNaN(parseFloat(newExpense.amount)) ? 
                          `Each person pays: ${formatCurrency(parseFloat(newExpense.amount) / newExpense.splitAmong.length)}` : 
                          `Splitting among ${newExpense.splitAmong.length} people`}
                      </p>
                    )}
                  </div>
                  
                  <div className="form-actions">
                    <button 
                      className="add-button"
                      onClick={handleAddExpense}
                    >
                      Add Expense
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
          
          {/* Splits Section */}
          {activeTab === 'splits' && (
            <div className="section-container">
              <h2>Bill Splits</h2>
              
              {roommates.length === 0 ? (
                <div className="empty-state">
                  <p>You need to add roommates before you can see splits.</p>
                  <button 
                    className="redirect-button"
                    onClick={() => setActiveTab('roommates')}
                  >
                    Go to Roommates
                  </button>
                </div>
              ) : expenses.length === 0 ? (
                <div className="empty-state">
                  <p>No expenses added yet. Add expenses to calculate splits.</p>
                  <button 
                    className="redirect-button"
                    onClick={() => setActiveTab('expenses')}
                  >
                    Add Expenses
                  </button>
                </div>
              ) : (
                <>
                  <div className="splits-container">
                    <div className="splits-header">
                      <span>Roommate</span>
                      <span>Paid</span>
                      <span>Owes</span>
                      <span>Net Balance</span>
                    </div>
                    
                    {roommates.map(roommate => (
                      <div key={roommate.id} className="split-row">
                        <div className="roommate-info">
                          <div className="avatar">
                            {roommate.name.charAt(0).toUpperCase()}
                          </div>
                          <span>{roommate.name}</span>
                        </div>
                        <div className="split-details">
                          <span>{formatCurrency(splits[roommate.id].paid)}</span>
                          <span>{formatCurrency(splits[roommate.id].owes)}</span>
                          <span 
                            className={`net-amount ${splits[roommate.id].net > 0 ? 'positive' : splits[roommate.id].net < 0 ? 'negative' : ''}`}
                          >
                            {formatCurrency(Math.abs(splits[roommate.id].net))}
                            {splits[roommate.id].net > 0 ? ' (receives)' : splits[roommate.id].net < 0 ? ' (pays)' : ''}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  <div className="payment-suggestions">
                    <h3>Payment Suggestions</h3>
                    {paymentSuggestions ? (
                      paymentSuggestions.map((suggestion, index) => (
                        <div key={index} className="suggestion-row">
                          <span>
                            {suggestion.fromName} should pay {suggestion.toName} {formatCurrency(suggestion.amount)}
                          </span>
                          <button
                            className="settle-button"
                            onClick={() => handleOpenSettleModal(suggestion.fromId, suggestion.toId)}
                          >
                            Settle
                          </button>
                        </div>
                      ))
                    ) : (
                      <div className="suggestion-row">
                        Everyone is settled up!
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          )}
          
          {/* History Section */}
          {activeTab === 'history' && (
            <div className="section-container">
              <h2>History</h2>
              
              {roommates.length === 0 ? (
                <div className="empty-state">
                  <p>You need to add roommates before tracking expenses.</p>
                  <button 
                    className="redirect-button"
                    onClick={() => setActiveTab('roommates')}
                  >
                    Go to Roommates
                  </button>
                </div>
              ) : (
                <>
                  <div className="history-tabs">
                    <button 
                      className={`sub-tab ${historyTab === 'expenses' ? 'active' : ''}`}
                      onClick={() => setHistoryTab('expenses')}
                    >
                      Expenses
                    </button>
                    <button 
                      className={`sub-tab ${historyTab === 'settlements' ? 'active' : ''}`}
                      onClick={() => setHistoryTab('settlements')}
                    >
                      Settlements
                    </button>
                  </div>
                  
                  {historyTab === 'expenses' ? (
                    expenses.length === 0 ? (
                      <div className="empty-state">
                        <p>No expenses added yet. Add your first expense in the "Add Expense" tab.</p>
                        <button 
                          className="redirect-button"
                          onClick={() => setActiveTab('expenses')}
                        >
                          Add Expenses
                        </button>
                      </div>
                    ) : (
                      <>
                        <div className="view-controls">
                          <div className="view-type-selector">
                            <button
                              className={`view-type-btn ${expenseViewType === 'day' ? 'active' : ''}`}
                              onClick={() => setExpenseViewType('day')}
                            >
                              Daily
                            </button>
                            <button
                              className={`view-type-btn ${expenseViewType === 'week' ? 'active' : ''}`}
                              onClick={() => setExpenseViewType('week')}
                            >
                              Weekly
                            </button>
                            <button
                              className={`view-type-btn ${expenseViewType === 'month' ? 'active' : ''}`}
                              onClick={() => setExpenseViewType('month')}
                            >
                              Monthly
                            </button>
                          </div>
                          <div className="sort-controls">
                            <span>Sort by: </span>
                            <select 
                              value={sortOrder}
                              onChange={(e) => setSortOrder(e.target.value)}
                            >
                              <option value="desc">Newest First</option>
                              <option value="asc">Oldest First</option>
                            </select>
                          </div>
                        </div>

                        {expenseViewType === 'day' && (
                          <div className="expenses-grouped">
                            {groupByDay(sortedExpenses).map((group, index) => (
                              <div key={index} className="expense-group">
                                <div className="group-header">
                                  <h4>{group.date}</h4>
                                  <span className="group-total">{formatCurrency(group.total)}</span>
                                </div>
                                {group.expenses.map(expense => (
                                  <ExpenseItem 
                                    key={expense.id} 
                                    expense={expense} 
                                    roommates={roommates}
                                  />
                                ))}
                              </div>
                            ))}
                          </div>
                        )}

                        {expenseViewType === 'week' && (
                          <div className="expenses-grouped">
                            {groupByWeek(sortedExpenses).map((group, index) => (
<div key={index} className="expense-group">
<div className="group-header">
<h4>Week {group.week}, {group.year}</h4>
<span className="group-total">{formatCurrency(group.total)}</span>
</div>
{group.expenses.map(expense => (
<ExpenseItem key={expense.id} expense={expense} roommates={roommates} />
))}
</div>
))}
</div>
)}
 {expenseViewType === 'month' && (
                      <div className="expenses-grouped">
                        {groupByMonth(sortedExpenses).map((group, index) => (
                          <div key={index} className="expense-group">
                            <div className="group-header">
                              <h4>{group.month} {group.year}</h4>
                              <span className="group-total">{formatCurrency(group.total)}</span>
                            </div>
                            {group.expenses.map(expense => (
                              <ExpenseItem 
                                key={expense.id} 
                                expense={expense} 
                                roommates={roommates}
                              />
                            ))}
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                )
              ) : (
                settlements.length === 0 ? (
                  <div className="empty-state">
                    <p>No settlements recorded yet.</p>
                  </div>
                ) : (
                  <div className="settlements-list">
                    {settlements
                      .sort((a, b) => new Date(b.date) - new Date(a.date))
                      .map((settlement, index) => {
                        const fromRoommate = roommates.find(r => r.id === parseInt(settlement.fromId));
                        const toRoommate = roommates.find(r => r.id === parseInt(settlement.toId));
                        
                        return (
                          <div key={index} className="settlement-card">
                            <div className="settlement-details">
                              <div className="settlement-direction">
                                <div className="avatar">
                                  {fromRoommate?.name.charAt(0).toUpperCase()}
                                </div>
                                <span>→</span>
                                <div className="avatar">
                                  {toRoommate?.name.charAt(0).toUpperCase()}
                                </div>
                              </div>
                              
                              <div className="settlement-info">
                                <p>
                                  {fromRoommate?.name || 'Unknown'} paid {toRoommate?.name || 'Unknown'} {formatCurrency(parseFloat(settlement.amount))}
                                </p>
                                <p className="settlement-date">
                                  {new Date(settlement.date).toLocaleDateString('en-US', {
                                    month: 'short',
                                    day: 'numeric',
                                    year: 'numeric'
                                  })}
                                </p>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                )
              )}
            </>
          )}
        </div>
      )}
    </div>
  </div>
  
  <footer className="app-footer">
    <p>Room Expense Tracker © {new Date().getFullYear()}</p>
    <p className="hint">All amounts in {CURRENCY.code} ({CURRENCY.symbol})</p>
  </footer>
</div>
);
};
export default RoommateExpenseTracker;
