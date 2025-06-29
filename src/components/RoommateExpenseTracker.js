import React, { useState, useEffect } from 'react';
import './res.css';

// Use environment variables for API URL
const API_URL = process.env.REACT_APP_API_URL || 'https://ample-ambition-production.up.railway.app/api';

// Currency configuration
const CURRENCY = {
  code: 'INR',
  symbol: '₹',
  conversionRate: 1,
};

const RoommateExpenseTracker = () => {
  const [showPopup, setShowPopup] = useState(true);
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

  // Custom fetch function with error handling
  const fetchWithAuth = async (endpoint, options = {}) => {
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    };
    
    try {
      const response = await fetch(`${API_URL}${endpoint}`, {
        ...options,
        headers: {
          ...headers,
          ...(options.headers || {})
        }
      });
      
      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          handleLogout();
          throw new Error('Session expired. Please login again');
        }
        
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Request failed with status ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error(`Error fetching ${endpoint}:`, error);
      throw error;
    }
  };

  const handleClosePopup = () => {
    setShowPopup(false);
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
      setError(null);
      
      try {
        // Fetch all data in parallel
        const [roommatesData, expensesData, settlementsData] = await Promise.all([
          fetchWithAuth('/roommates').catch(() => []),
          fetchWithAuth('/expenses').catch(() => []),
          fetchWithAuth('/settlements').catch(() => [])
        ]);
        
        setRoommates(roommatesData || []);
        
        // Format expenses data
        const formattedExpenses = (expensesData || []).map(expense => ({
          ...expense,
          amount: parseFloat(expense.amount),
          date: expense.date.split('T')[0],
          splitAmong: expense.splitAmong || []
        }));
        setExpenses(formattedExpenses);
        
        setSettlements(settlementsData || []);
      } catch (err) {
        console.error('Error fetching data:', err);
        setError(err.message);
        showNotification(err.message, 'error');
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
        : [];
      
      // Only process if there are participants
      if (participantsForThisExpense.length > 0) {
        const splitAmount = amount / participantsForThisExpense.length;
        
        if (splits[paidById]) {
          splits[paidById].paid += amount;
        }
        
        participantsForThisExpense.forEach(participantId => {
          if (splits[participantId]) {
            splits[participantId].owes += splitAmount;
          }
        });
      }
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
      const data = await fetchWithAuth('/settlements', {
        method: 'POST',
        body: JSON.stringify({
          fromId: parseInt(currentSettlement.fromId),
          toId: parseInt(currentSettlement.toId),
          amount: parseFloat(currentSettlement.amount),
          date: currentSettlement.date
        }),
      });
      
      setSettlements([...settlements, data]);
      setShowSettleModal(false);
      showNotification('Settlement recorded successfully!');
    } catch (err) {
      console.error('Error adding settlement:', err);
      showNotification(err.message, 'error');
    }
  };

  const handleAddRoommate = async () => {
    if (newRoommate.trim() === '') {
      showNotification('Please enter a roommate name', 'error');
      return;
    }
    
    try {
      const data = await fetchWithAuth('/roommates', {
        method: 'POST',
        body: JSON.stringify({ name: newRoommate }),
      });
      
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
      
      await fetchWithAuth(`/roommates/${id}`, {
        method: 'DELETE',
      });
      
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
      const data = await fetchWithAuth('/expenses', {
        method: 'POST',
        body: JSON.stringify({
          description: newExpense.description,
          amount: parseFloat(newExpense.amount),
          paidBy: parseInt(newExpense.paidBy),
          date: newExpense.date,
          splitAmong: newExpense.splitAmong
        }),
      });
      
      setExpenses([...expenses, {
        ...data,
        amount: parseFloat(data.amount),
        splitAmong: data.splitAmong || newExpense.splitAmong
      }]);
      
      showNotification(`Expense "${newExpense.description}" added successfully!`);
      
      setNewExpense({
        description: '',
        amount: '',
        paidBy: '',
        date: new Date().toISOString().split('T')[0],
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
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    setUser(null);
    setToken(null);
    showNotification('Logged out successfully', 'info');
    window.location.href = '/';
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

  // Function to calculate monthly expense totals
  const getMonthlyTotals = () => {
    if (!expenses || expenses.length === 0) return [];
    
    const monthlyData = {};
    
    expenses.forEach(expense => {
      const date = new Date(expense.date);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const monthName = date.toLocaleString('default', { month: 'long', year: 'numeric' });
      
      if (!monthlyData[monthKey]) {
        monthlyData[monthKey] = {
          key: monthKey,
          name: monthName,
          total: 0
        };
      }
      
      monthlyData[monthKey].total += parseFloat(expense.amount);
    });
    
    // Convert to array and sort by date (most recent first)
    return Object.values(monthlyData)
      .sort((a, b) => b.key.localeCompare(a.key));
  };

  const PopupNotice = ({ onClose }) => (
    <div className="popup-overlay">
      <div className="popup-box">
        <h3>Important Update About Logins</h3>
        <p>
          Currently, all roommates in a group share a single login.<br /><br />
          We're actively working on a major update that will allow <strong>each roommate to have their own personal login</strong>. This means better security, personalized notifications, and a smoother experience for everyone.
          <br /><br />
          Thanks for being part of Splitta — we're excited to bring you this upgrade soon!
        </p>
        <button className="btn primary" onClick={onClose}>Got it!</button>
      </div>
    </div>
  );

  if (isLoading) {
    return (
      <div className="app-container">
        <div className="loading-spinner">Loading...</div>
      </div>
    );
  }

  return (
    <div className="app-container">
      {showPopup && <PopupNotice onClose={handleClosePopup} />}
      
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
          <h1>Splitta ({CURRENCY.symbol})</h1>
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
                        <span>{CURRENCY.symbol}</span>
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
                      className={`sub-tab ${historyTab === 'monthly' ? 'active' : ''}`}
                      onClick={() => setHistoryTab('monthly')}
                    >
                      Monthly
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
                      <div className="expenses-list">
                        {expenses
                          .sort((a, b) => new Date(b.date) - new Date(a.date))
                          .map((expense) => {
                            const date = new Date(expense.date);
                            const paidByRoommate = roommates.find((r) => r.id === parseInt(expense.paidBy));
                            const participants =
                              expense.splitAmong && expense.splitAmong.length > 0
                                ? roommates.filter((r) => expense.splitAmong.includes(r.id))
                                : [];
                            const participantNames = participants.map((r) => r.name).join(", ");

                            return (
                              <div key={expense.id} className="expense-card">
                                <div className="expense-date">
                                  {date.toLocaleDateString("en-US", {
                                    year: "numeric",
                                    month: "short",
                                    day: "numeric",
                                  })}
                                </div>

                                <div className="expense-details">
                                  <div className="expense-description">{expense.description}</div>

                                  <div className="expense-payment">
                                    <span className="paid-by">
                                      Paid by {paidByRoommate ? paidByRoommate.name : "Unknown"}
                                    </span>
                                    <span className="amount">
                                      {formatCurrency(parseFloat(expense.amount))}
                                    </span>
                                  </div>

                                  {participants.length > 0 && (
                                    <>
                                      <div className="expense-split">
                                        Split among: {participantNames}
                                      </div>
                                      <div className="expense-split">
                                        Split amount:{" "}
                                        {formatCurrency(parseFloat(expense.amount) / participants.length)}{" "}
                                        per person
                                      </div>
                                    </>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                      </div>
                    )
                  ) : historyTab === 'monthly' ? (
                    expenses.length === 0 ? (
                      <div className="empty-state">
                        <p>No expenses added yet. Add your first expense to see monthly totals.</p>
                        <button 
                          className="redirect-button"
                          onClick={() => setActiveTab('expenses')}
                        >
                          Add Expenses
                        </button>
                      </div>
                    ) : (
                      <div className="monthly-view">
                        {getMonthlyTotals().map(month => (
                          <div key={month.key} className="month-card">
                            <h3 className="month-name">{month.name}</h3>
                            <div className="month-amount">{formatCurrency(month.total)}</div>
                          </div>
                        ))}
                      </div>
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
                          .map(settlement => {
                            const fromRoommate = roommates.find(r => r.id === parseInt(settlement.fromId));
                            const toRoommate = roommates.find(r => r.id === parseInt(settlement.toId));
                            
                            return (
                              <div key={settlement.id} className="settlement-card">
                                <div className="settlement-date">
                                  {new Date(settlement.date).toLocaleDateString('en-US', {
                                    year: 'numeric',
                                    month: 'short',
                                    day: 'numeric'
                                  })}
                                </div>
                                
                                <div className="settlement-details">
                                  <div className="settlement-description">
                                    {fromRoommate?.name || 'Unknown'} paid {toRoommate?.name || 'Unknown'}
                                  </div>
                                  
                                  <div className="settlement-amount">
                                    {formatCurrency(parseFloat(settlement.amount))}
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
    </div>
  );
};

export default RoommateExpenseTracker;
