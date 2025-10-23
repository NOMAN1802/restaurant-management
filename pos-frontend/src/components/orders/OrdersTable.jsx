import React, { useState } from 'react';
import { MdPayment, MdDelete, MdPrint, MdTableBar } from 'react-icons/md';
import { FaCheckDouble, FaEdit, FaCircle } from 'react-icons/fa'; // Import FaPlus and FaCircle
import Table from '../ui/Table';
import Tag from '../ui/Tag';
import Button from '../ui/Button';
import { formatDateAndTime, getAvatarName } from '../../utils/index';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { deleteOrder } from '../../https/index';
import { enqueueSnackbar } from 'notistack';
import { Select, Tooltip } from 'antd'; // Import Tooltip
import useMediaQuery from '../../hooks/useMediaQuery';
import OrderCard from './OrderCard';
import { useNavigate } from "react-router-dom"; // Import useNavigate
import Modal from '../shared/Modal'; // Import Modal
import { useSelector } from 'react-redux';

const OrdersTable = ({ orders = [], loading = false, onViewDetails, handleStatusChange, onPrint }) => {
  const user = useSelector((state) => state.user);
  const queryClient = useQueryClient();
  const [currentPage, setCurrentPage] = useState(1);
  const [ordersPerPage] = useState(10);
  const navigate = useNavigate(); // Initialize useNavigate
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState(null);

  const deleteOrderMutation = useMutation({
    mutationFn: deleteOrder,
    onSuccess: () => {
      enqueueSnackbar("Order deleted successfully!", { variant: "success" });
      queryClient.invalidateQueries(["orders"]);
      hideDeleteModal();
    },
    onError: (error) => {
      console.error("Error deleting order:", error);
      enqueueSnackbar(error.response?.data?.message || "Failed to delete order!", { variant: "error" });
      hideDeleteModal();
    },
  });

  const showDeleteModal = (orderId) => {
    setSelectedOrderId(orderId);
    setDeleteModalVisible(true);
  };

  const hideDeleteModal = () => {
    setSelectedOrderId(null);
    setDeleteModalVisible(false);
  };

  const handleDeleteOrder = () => {
    if (selectedOrderId) {
      deleteOrderMutation.mutate(selectedOrderId);
    }
  };

  // Sort orders in descending order by date (newest first)
  const sortedOrders = [...orders].sort((a, b) => {
    return new Date(b.createdAt) - new Date(a.createdAt);
  });

  // Pagination Logic
  const indexOfLastOrder = currentPage * ordersPerPage;
  const indexOfFirstOrder = indexOfLastOrder - ordersPerPage;
  const currentOrders = sortedOrders.slice(indexOfFirstOrder, indexOfLastOrder);

  const totalPages = Math.ceil(orders.length / ordersPerPage);

  const paginate = (pageNumber) => setCurrentPage(pageNumber);

  const getStatusTag = (status, orderId) => {
    const statusConfig = {
      'In Progress': { color: 'warning', icon: <FaCircle className="text-xs" /> },
      'Ready': { color: 'success', icon: <FaCheckDouble className="text-xs" /> },
      'Completed': { color: 'success', icon: <FaCheckDouble className="text-xs" /> },
      'Pending': { color: 'info', icon: <FaCircle className="text-xs" /> },
    };

    const config = statusConfig[status] || { color: 'default', icon: <FaCircle className="text-xs" /> };
    
    return (
      <Select
        value={status}
        onChange={(value) => handleStatusChange({ orderId: orderId, orderStatus: value })}
        style={{ width: 120, borderColor: '#d9d9d9' }}
        options={[
          { value: 'In Progress', label: <span className="text-yellow-600">In Progress</span> },
          { value: 'Ready', label: <span className="text-green-600">Ready</span> },
          { value: 'Completed', label: <span className="text-blue-600">Completed</span> },
        ]}
      />
    );
  };

  const columns = [
    {
      title: 'Customer',
      key: 'customer',
      width: '100px',
      render: (record) => (
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg flex items-center justify-center text-white font-bold text-sm">
            {record.customerDetails?.serialNumber?.substring(0, 2) || 'UN'}
          </div>
          <div>
            <div className="font-medium text-slate-900">#{record.customerDetails?.serialNumber || 'Unknown'}</div>
            <div className="text-xs text-slate-500">
              Guests: {record.customerDetails?.guests || 'N/A'}
            </div>
          </div>
        </div>
      ),
      sorter: true,
    },
    
    {
      title: 'Table',
      key: 'table',
      width: '50px',
      render: (record) => {
        // Extract table info from seats array
        const tableInfo = record.seats && record.seats.length > 0 && record.seats[0].tableId 
          ? record.seats[0].tableId 
          : null;
        
        return (
          <div className="flex items-center gap-1 text-slate-700">
            {tableInfo ? (
              <>
                <MdTableBar className="text-slate-400" />
                <span className="font-medium">Table {tableInfo.tableNo}</span>
              </>
            ) : record.orderType === 'Take Away' ? (
              <span className="font-medium text-slate-500">Take Away</span>
            ) : (
              <span className="font-medium text-slate-500">No Table</span>
            )}
          </div>
        );
      },
      sorter: true,
    },
   
    {
      title: 'Status',
      key: 'orderStatus',
      width: '100px',
      render: (record) => getStatusTag(record.orderStatus, record._id),
      sorter: true,
    },
    {
      title: 'Order Date',
      key: 'orderDate',
      width: '100px',
      render: (record) => (
        <div className="text-slate-700">
          <div className="font-medium">{formatDateAndTime(record.orderDate).split(' ')[0]}</div>
          <div className="text-xs text-slate-500">{formatDateAndTime(record.orderDate).split(' ')[1]}</div>
        </div>
      ),
      sorter: true,
    },
    {
      title: 'Total Amount',
      key: 'total',
      width: '50px',
      render: (record) => (
        <div className="text-left">
          <div className="font-bold text-slate-900">৳{record.bills?.totalWithDiscount?.toFixed(2) || '0.00'}</div>
          {record.bills?.couponCode && (
            <div className="text-xs text-green-600">
              -{record.bills.couponCode}
            </div>
          )}
        </div>
      ),
      sorter: true,
    },
    {
      title: 'Payment Status',
      key: 'isPaid',
      width: '50px',
      render: (record) => (
        <Tag color={record.isPaid ? 'green' : 'red'}>
          {record.isPaid ? 'Paid' : 'Unpaid'}
        </Tag>
      ),
      sorter: true,
    },
    {
      title: 'Actions',
      key: 'actions',
      width: '100px',
      className: 'sticky right-0 bg-white',
      render: (record) => (
        <div className="flex items-center gap-2">
          {/* Add Items Button */}
          {user.role !== 'Staff' && !record.isPaid && (
            <Tooltip title="Edit Item">
              <Button
                size="sm"
                variant="outline"
                onClick={() => navigate(`/menu?orderId=${record._id}`)}
                icon={<FaEdit />}
                className="text-blue-500 hover:text-blue-600"
              />
            </Tooltip>
          )}

          {user.role !== 'Staff' && record.orderStatus === 'Completed' && !record.isPaid && (
            <Tooltip title="Payment">
              <Button
                size="sm"
                variant="primary"
                onClick={() => onViewDetails(record)}
                icon={<MdPayment />}
              />
            </Tooltip>
          )}

          <Tooltip title="Print">
            <Button
              size="sm"
              variant="outline"
              onClick={() => onPrint(record)}
              icon={<MdPrint />}
              className="text-slate-500 hover:text-blue-600"
            />
          </Tooltip>

          {/* Delete Button */}
          {!record.isPaid && (
            <Tooltip title="Delete">
              <Button
                size="sm"
                variant="danger"
                onClick={() => showDeleteModal(record._id)}
                icon={<MdDelete />}
              />
            </Tooltip>
          )}
        </div>
      ),
    },
  ];

  const isMobile = useMediaQuery('(max-width: 768px)');

  // Function to handle opening order details or navigating to menu for adding items
  const handleViewDetailsOrAddItems = (order, addItemsMode = false) => {
    if (addItemsMode) {
      navigate(`/menu?orderId=${order._id}`); // Navigate to menu with orderId
    } else {
      onViewDetails(order);
    }
  };

  // Transform data for table
  const tableData = orders.map(order => ({
    key: order._id,
    ...order,
  }));

  if (isMobile) {
    return (
      <div className="bg-white rounded-lg p-4 shadow-sm">
        {currentOrders.map(order => (
          <OrderCard
            key={order._id}
            order={order}
            handleStatusChange={handleStatusChange}
            onPrint={onPrint}
            onViewDetails={(orderInfo) => onViewDetails(orderInfo)} // Keep original onViewDetails for mobile
            onAddItems={(orderInfo) => handleViewDetailsOrAddItems(orderInfo, true)} // Use new handler for adding items
            onDeleteOrder={showDeleteModal}
          />
        ))}
        <div className="flex justify-center mt-4">
          <button
            onClick={() => paginate(currentPage - 1)}
            disabled={currentPage === 1}
            className="px-4 py-2 mx-1 rounded-lg bg-gray-200 text-gray-700 hover:bg-gray-300 disabled:opacity-50"
          >
            Previous
          </button>
          {Array.from({ length: totalPages }, (_, i) => (
            <button
              key={i + 1}
              onClick={() => paginate(i + 1)}
              className={`px-4 py-2 mx-1 rounded-lg ${currentPage === i + 1 ? "bg-blue-600 text-white" : "bg-gray-200 text-gray-700 hover:bg-gray-300"}`}
            >
              {i + 1}
            </button>
          ))}
          <button
            onClick={() => paginate(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="px-4 py-2 mx-1 rounded-lg bg-gray-200 text-gray-700 hover:bg-gray-300 disabled:opacity-50"
          >
            Next
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg p-4 shadow-sm">
      <div className="overflow-x-auto relative">
        <Table
          columns={columns}
          data={currentOrders}
          loading={loading}
          pagination={false}
          pageSize={10}
          className="min-w-full shadow-sm"
        />
      </div>
      <div className="flex justify-center mt-4">
        <button
          onClick={() => paginate(currentPage - 1)}
          disabled={currentPage === 1}
          className="px-4 py-2 mx-1 rounded-lg bg-gray-200 text-gray-700 hover:bg-gray-300 disabled:opacity-50"
        >
          Previous
        </button>
        {Array.from({ length: totalPages }, (_, i) => (
          <button
            key={i + 1}
            onClick={() => paginate(i + 1)}
            className={`px-4 py-2 mx-1 rounded-lg ${currentPage === i + 1 ? "bg-blue-600 text-white" : "bg-gray-200 text-gray-700 hover:bg-gray-300"}`}
          >
            {i + 1}
          </button>
        ))}
        <button
          onClick={() => paginate(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="px-4 py-2 mx-1 rounded-lg bg-gray-200 text-gray-700 hover:bg-gray-300 disabled:opacity-50"
        >
          Next
        </button>
      </div>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={deleteModalVisible}
        onClose={hideDeleteModal}
        title="Confirm Deletion"
        description="Are you sure you want to delete this order? This action cannot be undone."
      >
        <div className="flex justify-end gap-4 mt-4">
          <Button variant="outline" onClick={hideDeleteModal}>
            Cancel
          </Button>
          <Button
            variant="danger"
            onClick={handleDeleteOrder}
            loading={deleteOrderMutation.isLoading}
          >
            Delete
          </Button>
        </div>
      </Modal>
    </div>
  );
};

export default OrdersTable;