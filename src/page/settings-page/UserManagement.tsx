import { useEffect, useState } from "react";

import { collection, getDocs, doc, updateDoc } from "firebase/firestore";

import { db } from "../../firebase";
import { AppUser } from "../../model/model";

const UserManagement = () => {
  const [users, setUsers] = useState<(AppUser & { id: string })[]>([]);

  const fetchUsers = async () => {
    const querySnapshot = await getDocs(collection(db, "users"));
    const userList = querySnapshot.docs.map((d) => ({
      ...(d.data() as AppUser),
      id: d.id,
    }));
    setUsers(userList);
  };

  useEffect(() => {
    let isMounted = true;

    const loadUsers = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, "users"));
        const userList = querySnapshot.docs.map((d) => ({
          ...(d.data() as AppUser),
          id: d.id,
        }));

        if (isMounted) {
          setUsers(userList);
        }
      } catch (error) {
        console.error("Error fetching users:", error);
      }
    };

    loadUsers();

    return () => {
      isMounted = false;
    };
  }, []);

  const toggleApproval = async (id: string, currentStatus: boolean) => {
    await updateDoc(doc(db, "users", id), { isApproved: !currentStatus });
    fetchUsers(); // Refresh list
  };

  return (
    <div className="admin-section">
      <h3>User Management</h3>
      <div className="user-grid">
        {users.map((u) => (
          <div key={u.id} className="user-card">
            <span>
              {u.name} ({u.email})
            </span>
            <button
              className={u.isApproved ? "btn-approved" : "btn-pending"}
              onClick={() => toggleApproval(u.id, u.isApproved)}
            >
              {u.isApproved ? "Approved" : "Approve?"}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default UserManagement;
