import React from 'react';
import './ActiveUsers.css';

/**
 * Active Users Display Component
 */
const ActiveUsers = ({ users = [] }) => {
  return (
    <div className="active-users">
      <div className="users-count">
        👥 {users.length} {users.length === 1 ? 'user' : 'users'} online
      </div>
      {users.length > 0 && (
        <div className="users-list">
          {users.map((user, idx) => (
            <div key={idx} className="user-avatar" style={{ backgroundColor: user.color }} title={user.userName}>
              {user.userName.substring(0, 1).toUpperCase()}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ActiveUsers;
