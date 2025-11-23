/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useState, useEffect, ChangeEvent, FormEvent } from 'react';
import { db } from '@/lib/firebase';
import {
  collection,
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  query,
  where,
} from 'firebase/firestore';
import { useAuth } from '@/app/context/AuthContext';

// Define the Volunteer data structure
interface Volunteer {
  id: string;
  name: string;
  hours?: string;
  role?: string;
  logs?: string;
}

// Define the shape of the data being edited
type EditedData = Omit<Volunteer, 'id'>;

const PencilIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.5L14.732 3.732z" />
  </svg>
);

const TrashIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
)


export default function CharityVolunteers() {
  const { user, loading } = useAuth();
  const [volunteers, setVolunteers] = useState<Volunteer[]>([]);
  const [editingVolunteerId, setEditingVolunteerId] = useState<string | null>(null);
  const [editedData, setEditedData] = useState<EditedData>({ name: '', hours: '', role: '', logs: '' });

  // State for the new volunteer form
  const [newVolunteerName, setNewVolunteerName] = useState("");
  const [newVolunteerHours, setNewVolunteerHours] = useState("");
  const [newVolunteerRole, setNewVolunteerRole] = useState("");
  const [newVolunteerLogs, setNewVolunteerLogs] = useState("");


  useEffect(() => {
    if (!user) return;

    const q = query(collection(db, "volunteers"), where("foodbankId", "==", user.uid));

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const volunteersData = querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          name: data.name || '',
          hours: data.hours || '',
          role: data.role || '',
          logs: data.logs || '',
        };
      });
      setVolunteers(volunteersData as Volunteer[]);
    });

    return () => unsubscribe();
  }, [user]);

  const handleEdit = (volunteer: Volunteer) => {
    setEditingVolunteerId(volunteer.id);
    setEditedData({
      name: volunteer.name,
      hours: volunteer.hours || "",
      role: volunteer.role || "",
      logs: volunteer.logs || "",
    });
  };

  const handleCancel = () => {
    setEditingVolunteerId(null);
    setEditedData({ name: '', hours: '', role: '', logs: '' });
  };

  const handleSave = async (volunteerId: string) => {
    const volunteerRef = doc(db, "volunteers", volunteerId);
    try {
      await updateDoc(volunteerRef, editedData);
      setEditingVolunteerId(null);
      setEditedData({ name: '', hours: '', role: '', logs: '' });
    } catch (error: any) {
      console.error("Error updating volunteer: ", error);
      alert(`Error updating volunteer: ${error.message}`)
    }
  };

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setEditedData((prev) => ({ ...prev, [name]: value }));
  };

  const handleAddVolunteer = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user) {
        alert("You must be logged in to add volunteers.");
        return;
    }
    if (!newVolunteerName) {
        alert("Volunteer name cannot be empty.");
        return;
    }

    try {
        await addDoc(collection(db, "volunteers"), {
            name: newVolunteerName,
            hours: newVolunteerHours,
            role: newVolunteerRole,
            logs: newVolunteerLogs,
            foodbankId: user.uid,
        });
        // Reset form
        setNewVolunteerName("");
        setNewVolunteerHours("");
        setNewVolunteerRole("");
        setNewVolunteerLogs("");
    } catch (error: any) {
        console.error("Error adding volunteer: ", error)
        alert(`Error adding volunteer: ${error.message}`)
    }
  }

  const handleDelete = async (volunteerId: string) => {
    const volunteerRef = doc(db, "volunteers", volunteerId);
    try {
        await deleteDoc(volunteerRef);
    } catch (error: any) {
        console.error("Error deleting volunteer: ", error);
        alert(`Error deleting volunteer: ${error.message}`)
    }
  }

  if (loading) {
    return <div className="text-center p-8">Loading...</div>;
  }

  if (!user) {
    return <div className="text-center p-8">Please log in to manage your volunteers.</div>;
  }

  return (
    <div>
        {/* Add Volunteer Form */}
        <div className="bg-white rounded-3xl p-6 shadow-soft border border-slate-100 mb-8">
            <h3 className="font-display text-xl font-bold mb-4 text-nb-ink">Add New Volunteer</h3>
            <form onSubmit={handleAddVolunteer} className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
                <div className="md:col-span-2">
                    <label className="block text-sm font-bold text-slate-500 mb-1">Name</label>
                    <input type="text" value={newVolunteerName} onChange={(e) => setNewVolunteerName(e.target.value)} placeholder="e.g. John D." className="w-full border rounded-lg px-3 py-2" required/>
                </div>
                <div>
                    <label className="block text-sm font-bold text-slate-500 mb-1">Role</label>
                    <input type="text" value={newVolunteerRole} onChange={(e) => setNewVolunteerRole(e.target.value)} placeholder="e.g. Driver" className="w-full border rounded-lg px-3 py-2" />
                </div>
                 <div>
                    <label className="block text-sm font-bold text-slate-500 mb-1">Hours</label>
                    <input type="text" value={newVolunteerHours} onChange={(e) => setNewVolunteerHours(e.target.value)} placeholder="e.g. 12-5PM" className="w-full border rounded-lg px-3 py-2" />
                </div>
                <button type="submit" className="bg-nb-blue text-white font-bold py-2 px-4 rounded-lg hover:bg-nb-blue-dark transition-colors h-10">Add Volunteer</button>
            </form>
        </div>


        <div className="bg-white rounded-3xl p-6 shadow-soft border border-slate-100 h-max overflow-x-auto">
        <table className="w-full text-left">
            <thead>
            <tr className="border-b border-slate-200">
                <th className="p-4">Name</th>
                <th className="p-4">Hours</th>
                <th className="p-4">Role</th>
                <th className="p-4">Logs</th>
                <th className="p-4"></th>
            </tr>
            </thead>
            <tbody>
            {volunteers.map((volunteer) => (
                <tr key={volunteer.id} className="border-b border-slate-100">
                {editingVolunteerId === volunteer.id ? (
                    <>
                    <td className="p-2">
                        <input type="text" name="name" value={editedData.name} onChange={handleChange} className="border rounded px-2 py-1 w-full"/>
                    </td>
                    <td className="p-2">
                        <input type="text" name="hours" value={editedData.hours} onChange={handleChange} className="border rounded px-2 py-1 w-full"/>
                    </td>
                    <td className="p-2">
                        <input type="text" name="role" value={editedData.role} onChange={handleChange} className="border rounded px-2 py-1 w-full"/>
                    </td>
                    <td className="p-2">
                        <input type="text" name="logs" value={editedData.logs} onChange={handleChange} className="border rounded px-2 py-1 w-full"/>
                    </td>
                    <td className="p-2 flex space-x-2">
                        <button onClick={() => handleSave(volunteer.id)} className="text-green-500 hover:text-green-600 p-1">Save</button>
                        <button onClick={handleCancel} className="text-red-500 hover:text-red-600 p-1">Cancel</button>
                    </td>
                    </>
                ) : (
                    <>
                    <td className="p-4 flex items-center">
                        <div className="w-10 h-10 bg-slate-200 rounded-full border-2 border-white shadow-sm mr-3"></div>
                        {volunteer.name}
                    </td>
                    <td className="p-4">{volunteer.hours || ""}</td>
                    <td className="p-4">{volunteer.role || ""}</td>
                    <td className="p-4">{volunteer.logs || ""}</td>
                    <td className="p-4 flex space-x-2">
                        <button onClick={() => handleEdit(volunteer)} className="text-slate-400 hover:text-nb-blue">
                            <PencilIcon />
                        </button>
                        <button onClick={() => handleDelete(volunteer.id)} className="text-slate-400 hover:text-red-500">
                            <TrashIcon />
                        </button>
                    </td>
                    </>
                )}
                </tr>
            ))}
            </tbody>
        </table>
        </div>
    </div>
  );
}
