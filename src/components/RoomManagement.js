import React, { useState, useEffect } from 'react';
import './res.css'; // Reusing existing styles

const API_URL = 'http://localhost:5000/api';

const RoomManagement = ({ user, token, showNotification, onRoomSelect }) => {
  const [rooms, setRooms] = useState([]);
  const [newRoom, setNewRoom] = useState('');
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [roomMembers, setRoomMembers] = useState([]);
  const [availableUsers, setAvailableUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [roomCode, setRoomCode] = useState('');
  const [joinRoomCode, setJoinRoomCode] = useState('');

  // Fetch rooms when component mounts
  useEffect(() => {
    if (!token) return;
    
    const fetchRooms = async () => {
      setIsLoading(true);
      try {
        const headers = {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        };
        
        // Fetch rooms the user is part of
        const roomsResponse = await fetch(`${API_URL}/rooms/user`, {
          headers
        });
        
        if (!roomsResponse.ok) {
          if (roomsResponse.status === 401 || roomsResponse.status === 403) {
            throw new Error('Session expired. Please login again');
          }
          
          if (roomsResponse.status === 404) {
            setRooms([]);
          } else {
            throw new Error('Failed to fetch rooms');
          }
        } else {
          const roomsData = await roomsResponse.json();
          setRooms(roomsData || []);
          
          // If user has rooms, select the first one by default
          if (roomsData && roomsData.length > 0) {
            await handleRoomSelect(roomsData[0].id);
          }
        }
      } catch (err) {
        console.error('Error fetching rooms:', err);
        showNotification(err.message, 'error');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchRooms();
  }, [token]);

  // Handle selecting a room
  const handleRoomSelect = async (roomId) => {
    try {
      setIsLoading(true);
      
      const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      };
      
      // Get room details
      const roomResponse = await fetch(`${API_URL}/rooms/${roomId}`, {
        headers
      });
      
      if (!roomResponse.ok) {
        throw new Error('Failed to fetch room details');
      }
      
      const roomData = await roomResponse.json();
      setSelectedRoom(roomData);
      
      // Get room members
      const membersResponse = await fetch(`${API_URL}/rooms/${roomId}/members`, {
        headers
      });
      
      if (!membersResponse.ok) {
        throw new Error('Failed to fetch room members');
      }
      
      const membersData = await membersResponse.json();
      setRoomMembers(membersData || []);
      
      // Fetch room join code
      const codeResponse = await fetch(`${API_URL}/rooms/${roomId}/code`, {
        headers
      });
      
      if (codeResponse.ok) {
        const codeData = await codeResponse.json();
        setRoomCode(codeData.code);
      }
      
      // Notify parent component about room selection
      if (onRoomSelect) {
        onRoomSelect(roomId);
      }
      
      // Generate list of available users to add
      const usersResponse = await fetch(`${API_URL}/users`, {
        headers
      });
      
      if (usersResponse.ok) {
        const usersData = await usersResponse.json();
        // Filter out users who are already members
        const memberIds = membersData.map(member => member.id);
        setAvailableUsers(usersData.filter(user => !memberIds.includes(user.id)));
      }
      
    } catch (err) {
      console.error('Error selecting room:', err);
      showNotification(err.message, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // Create a new room
  const handleCreateRoom = async () => {
    if (newRoom.trim() === '') {
      showNotification('Please enter a room name', 'error');
      return;
    }
    
    try {
      const response = await fetch(`${API_URL}/rooms`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ 
          name: newRoom,
          createdBy: user.id
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create room');
      }
      
      const data = await response.json();
      setRooms([...rooms, data]);
      setNewRoom('');
      showNotification(`Room "${newRoom}" created successfully!`);
      
      // Select the newly created room
      handleRoomSelect(data.id);
    } catch (err) {
      console.error('Error creating room:', err);
      showNotification(err.message, 'error');
    }
  };

  // Join a room using a code
  const handleJoinRoom = async () => {
    if (joinRoomCode.trim() === '') {
      showNotification('Please enter a room code', 'error');
      return;
    }
    
    try {
      const response = await fetch(`${API_URL}/rooms/join`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ 
          code: joinRoomCode,
          userId: user.id
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to join room');
      }
      
      const data = await response.json();
      
      // Add the new room to the list if it's not already there
      if (!rooms.some(room => room.id === data.id)) {
        setRooms([...rooms, data]);
      }
      
      setJoinRoomCode('');
      showNotification(`Joined room "${data.name}" successfully!`);
      
      // Select the joined room
      handleRoomSelect(data.id);
    } catch (err) {
      console.error('Error joining room:', err);
      showNotification(err.message, 'error');
    }
  };

  // Add a user to the room
  const handleAddUserToRoom = async (userId) => {
    if (!selectedRoom) {
      showNotification('Please select a room first', 'error');
      return;
    }
    
    try {
      const response = await fetch(`${API_URL}/rooms/${selectedRoom.id}/members`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ userId }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to add user to room');
      }
      
      // Refresh room members
      handleRoomSelect(selectedRoom.id);
      showNotification('User added to room successfully!');
    } catch (err) {
      console.error('Error adding user to room:', err);
      showNotification(err.message, 'error');
    }
  };

  // Remove a user from the room
  const handleRemoveUserFromRoom = async (userId) => {
    if (!selectedRoom) {
      showNotification('Please select a room first', 'error');
      return;
    }
    
    try {
      const response = await fetch(`${API_URL}/rooms/${selectedRoom.id}/members/${userId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to remove user from room');
      }
      
      // Refresh room members
      handleRoomSelect(selectedRoom.id);
      showNotification('User removed from room successfully!');
    } catch (err) {
      console.error('Error removing user from room:', err);
      showNotification(err.message, 'error');
    }
  };

  // Leave a room
  const handleLeaveRoom = async (roomId) => {
    try {
      const response = await fetch(`${API_URL}/rooms/${roomId}/leave`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ userId: user.id }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to leave room');
      }
      
      // Remove room from list
      setRooms(rooms.filter(room => room.id !== roomId));
      setSelectedRoom(null);
      showNotification('Left room successfully!');
      
      // Select another room if available
      if (rooms.length > 1) {
        const nextRoom = rooms.find(room => room.id !== roomId);
        if (nextRoom) {
          handleRoomSelect(nextRoom.id);
        }
      }
    } catch (err) {
      console.error('Error leaving room:', err);
      showNotification(err.message, 'error');
    }
  };

  if (isLoading) {
    return <div className="loading-spinner">Loading room information...</div>;
  }

  return (
    <div className="room-management-container">
      <div className="room-tabs">
        <div className="room-selector">
          <h3>Your Rooms</h3>
          <div className="room-list">
            {rooms.length === 0 ? (
              <p>You haven't joined any rooms yet.</p>
            ) : (
              rooms.map(room => (
                <div 
                  key={room.id} 
                  className={`room-item ${selectedRoom && selectedRoom.id === room.id ? 'active' : ''}`}
                  onClick={() => handleRoomSelect(room.id)}
                >
                  <span>{room.name}</span>
                  <button 
                    className="leave-room-button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleLeaveRoom(room.id);
                    }}
                  >
                    Leave
                  </button>
                </div>
              ))
            )}
          </div>

          <div className="room-actions">
            <div className="create-room">
              <h4>Create a New Room</h4>
              <div className="create-room-form">
                <input
                  type="text"
                  placeholder="Room name"
                  value={newRoom}
                  onChange={(e) => setNewRoom(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleCreateRoom()}
                />
                <button 
                  className="create-button"
                  onClick={handleCreateRoom}
                >
                  Create
                </button>
              </div>
            </div>

            <div className="join-room">
              <h4>Join a Room</h4>
              <div className="join-room-form">
                <input
                  type="text"
                  placeholder="Enter room code"
                  value={joinRoomCode}
                  onChange={(e) => setJoinRoomCode(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleJoinRoom()}
                />
                <button 
                  className="join-button"
                  onClick={handleJoinRoom}
                >
                  Join
                </button>
              </div>
            </div>
          </div>
        </div>

        {selectedRoom && (
          <div className="room-details">
            <h3>{selectedRoom.name}</h3>
            
            <div className="room-code-section">
              <h4>Room Join Code</h4>
              <div className="room-code">
                <span>{roomCode}</span>
                <button
                  className="copy-button"
                  onClick={() => {
                    navigator.clipboard.writeText(roomCode);
                    showNotification('Room code copied to clipboard!', 'success');
                  }}
                >
                  Copy
                </button>
              </div>
              <p className="hint">Share this code with others to invite them to your room</p>
            </div>
            
            <div className="room-members">
              <h4>Room Members</h4>
              {roomMembers.length === 0 ? (
                <p>No members in this room yet.</p>
              ) : (
                <div className="member-list">
                  {roomMembers.map(member => (
                    <div key={member.id} className="member-item">
                      <div className="avatar">
                        {member.fullName.charAt(0).toUpperCase()}
                      </div>
                      <span>{member.fullName}</span>
                      {member.id !== user.id && selectedRoom.createdBy === user.id && (
                        <button
                          className="remove-member-button"
                          onClick={() => handleRemoveUserFromRoom(member.id)}
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            {selectedRoom.createdBy === user.id && availableUsers.length > 0 && (
              <div className="add-members">
                <h4>Add Members</h4>
                <select 
                  className="user-select"
                  onChange={(e) => {
                    if (e.target.value) {
                      handleAddUserToRoom(e.target.value);
                      e.target.value = '';
                    }
                  }}
                >
                  <option value="">Select a user to add...</option>
                  {availableUsers.map(user => (
                    <option key={user.id} value={user.id}>
                      {user.fullName} ({user.email})
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default RoomManagement;