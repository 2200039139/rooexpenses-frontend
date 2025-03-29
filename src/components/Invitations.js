import React, { useState, useEffect } from 'react';
import './Invitations.css';

const Invitations = ({ user }) => {
  const [activeTab, setActiveTab] = useState('received');
  const [sentInvitations, setSentInvitations] = useState([]);
  const [receivedInvitations, setReceivedInvitations] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchInvitations();
  }, [user]);

  const fetchInvitations = async () => {
    try {
      setIsLoading(true);
      
      // Fetch sent invitations if user is admin of any group
      const sentResponse = await fetch('/api/invitations/sent', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      const sentData = await sentResponse.json();
      setSentInvitations(sentData);
      
      // Fetch received invitations
      const receivedResponse = await fetch('/api/invitations/received', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      const receivedData = await receivedResponse.json();
      setReceivedInvitations(receivedData);
      
    } catch (error) {
      console.error('Error fetching invitations:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAcceptInvitation = async (inviteId) => {
    try {
      const response = await fetch(`/api/invitations/${inviteId}/accept`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (response.ok) {
        fetchInvitations(); // Refresh the list
        alert('Invitation accepted successfully!');
      } else {
        const errorData = await response.json();
        alert(errorData.error || 'Failed to accept invitation');
      }
    } catch (error) {
      console.error('Error accepting invitation:', error);
      alert('Failed to accept invitation');
    }
  };

  const handleDeclineInvitation = async (inviteId) => {
    try {
      const response = await fetch(`/api/invitations/${inviteId}/decline`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (response.ok) {
        fetchInvitations(); // Refresh the list
        alert('Invitation declined successfully!');
      } else {
        const errorData = await response.json();
        alert(errorData.error || 'Failed to decline invitation');
      }
    } catch (error) {
      console.error('Error declining invitation:', error);
      alert('Failed to decline invitation');
    }
  };

  return (
    <div className="invitations-container">
      <h2>Invitations</h2>
      
      <div className="invitations-tabs">
        <button 
          className={`tab-button ${activeTab === 'received' ? 'active' : ''}`}
          onClick={() => setActiveTab('received')}
        >
          Received ({receivedInvitations.length})
        </button>
        <button 
          className={`tab-button ${activeTab === 'sent' ? 'active' : ''}`}
          onClick={() => setActiveTab('sent')}
        >
          Sent ({sentInvitations.length})
        </button>
      </div>
      
      {isLoading ? (
        <div className="loading">Loading invitations...</div>
      ) : (
        <div className="invitations-list">
          {activeTab === 'received' ? (
            receivedInvitations.length === 0 ? (
              <p className="empty-state">No received invitations</p>
            ) : (
              receivedInvitations.map(invite => (
                <div key={invite.id} className="invitation-card">
                  <div className="invitation-info">
                    <h3>Invitation to join: {invite.groupName}</h3>
                    <p>Invited by: {invite.inviterName}</p>
                    <p>Sent on: {new Date(invite.createdAt).toLocaleDateString()}</p>
                    <p>Expires on: {new Date(invite.expiresAt).toLocaleDateString()}</p>
                  </div>
                  <div className="invitation-actions">
                    <button 
                      className="accept-button"
                      onClick={() => handleAcceptInvitation(invite.id)}
                    >
                      Accept
                    </button>
                    <button 
                      className="decline-button"
                      onClick={() => handleDeclineInvitation(invite.id)}
                    >
                      Decline
                    </button>
                  </div>
                </div>
              ))
            )
          ) : (
            sentInvitations.length === 0 ? (
              <p className="empty-state">No sent invitations</p>
            ) : (
              sentInvitations.map(invite => (
                <div key={invite.id} className="invitation-card">
                  <div className="invitation-info">
                    <h3>Invitation to join: {invite.groupName}</h3>
                    <p>Sent to: {invite.email}</p>
                    <p>Sent on: {new Date(invite.createdAt).toLocaleDateString()}</p>
                    <p>Expires on: {new Date(invite.expiresAt).toLocaleDateString()}</p>
                    <p>Status: {new Date(invite.expiresAt) > new Date() ? 'Pending' : 'Expired'}</p>
                  </div>
                </div>
              ))
            )
          )}
        </div>
      )}
    </div>
  );
};

export default Invitations;