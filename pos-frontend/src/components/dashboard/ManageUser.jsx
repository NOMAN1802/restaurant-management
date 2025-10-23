import React, { useState } from 'react';
import { useGetAllUsersQuery, useUpdateUserMutation, useDeleteUserMutation } from '../../redux/api/userManagementApi';
import Table from '../ui/Table';
import Button from '../ui/Button';
import Modal from '../shared/Modal';
import { Select, message } from 'antd';

const ManageUser = () => {
    const { data: usersData, isLoading, isError } = useGetAllUsersQuery();
    const [updateUser] = useUpdateUserMutation();
    const [deleteUser] = useDeleteUserMutation();

    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [selectedUser, setSelectedUser] = useState(null);

    const handleDelete = (user) => {
        if (!user) return;
        setSelectedUser(user);
        setIsDeleteModalOpen(true);
    };

    const handleRoleChange = async (user, newRole) => {
        if (!user) return;
        try {
            await updateUser({ id: user._id, role: newRole }).unwrap();
            message.success(`User ${user.name || 'Unknown'} is now a ${newRole}`);
        } catch (error) {
            message.error(error.data.message || `Failed to update user ${user.name || 'Unknown'}`);
        }
    };

    const confirmDelete = async () => {
        if (!selectedUser) return;
        try {
            await deleteUser(selectedUser._id).unwrap();
            setIsDeleteModalOpen(false);
            message.success('User deleted successfully');
        } catch (error) {
            message.error(error.data.message || 'Failed to delete user');
        }
    };

    const columns = [
        {
            title: 'Name',
            key: 'name',
            render: (user) => user?.name || 'N/A',
        },
        {
            title: 'Email',
            key: 'email',
            render: (user) => user?.email || 'N/A',
        },
        {
            title: 'Role',
            key: 'role',
            render: (user) => user?.role || 'N/A',
        },
        {
            title: 'Actions',
            key: 'actions',
            render: (user) => (
                <div className="flex gap-2">
                    <Select
                        value={user?.role}
                        onChange={(value) => handleRoleChange(user, value)}
                        style={{ width: 120 }}
                        disabled={user?.role === 'Admin'}
                    >
                        <Select.Option value="Admin">Admin</Select.Option>
                        <Select.Option value="Staff">Staff</Select.Option>
                        <Select.Option value="Cashier">Cashier</Select.Option>
                    </Select>
                    <Button
                        size="sm"
                        variant="danger"
                        onClick={() => handleDelete(user)}
                        disabled={user?.role === 'Admin'}
                    >
                        Delete
                    </Button>
                </div>
            ),
        },
    ];

    if (isLoading) return <div>Loading...</div>;
    if (isError) return <div>Error fetching users</div>;
    if (!usersData || !usersData.data) return <div>No users data available</div>;

    return (
        <div>
            <h1 className="text-2xl font-bold mb-4">Manage Users</h1>
            <Table columns={columns} data={usersData.data} />

            {isDeleteModalOpen && (
                <Modal isOpen={isDeleteModalOpen} onClose={() => setIsDeleteModalOpen(false)} title="Delete User">
                    <div className="flex flex-col gap-4">
                        <p>Are you sure you want to delete {selectedUser.name}?</p>
                        <div className="flex justify-end gap-4">
                            <Button variant="outline" onClick={() => setIsDeleteModalOpen(false)}>
                                Cancel
                            </Button>
                            <Button variant="danger" onClick={confirmDelete}>
                                Delete
                            </Button>
                        </div>
                    </div>
                </Modal>
            )}
        </div>
    );
};

export default ManageUser;
