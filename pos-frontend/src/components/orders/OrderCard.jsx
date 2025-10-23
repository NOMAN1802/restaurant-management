import React from 'react';
import { MdPayment, MdDelete, MdPrint, MdTableBar } from 'react-icons/md';
import { FaCheckDouble, FaCircle, FaEdit } from 'react-icons/fa';
import Tag from '../ui/Tag';
import Button from '../ui/Button';
import { formatDateAndTime, getAvatarName } from '../../utils/index';
import { Select, Tooltip } from 'antd';
import { useSelector } from 'react-redux';

const OrderCard = ({ order, handleStatusChange, onPrint, onViewDetails, onDeleteOrder, onAddItems }) => {
  const user = useSelector((state) => state.user);

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

  return (
    <div className="bg-white rounded-lg p-4 shadow-sm mb-4">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg flex items-center justify-center text-white font-bold text-sm">
            {order.customerDetails?.serialNumber?.substring(0, 2) || 'UN'}
          </div>
          <div>
            <div className="font-medium text-slate-900">#{order.customerDetails?.serialNumber || 'Unknown'}</div>
            <div className="text-xs text-slate-500">
              Guests: {order.customerDetails?.guests || 'N/A'}
            </div>
          </div>
        </div>
        <div className="text-right">
          <div className="font-bold text-slate-900">৳{order.bills.totalWithDiscount?.toFixed(2)}</div>
          {order.bills.couponCode && (
            <div className="text-xs text-green-600">
              -{order.bills.couponCode}
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-y-1 gap-x-2 text-sm mb-2">
        <div>
          <p className="text-slate-500">Order Type</p>
          <Tag color={order.orderType === 'Dine In' ? 'blue' : 'green'}>{order.orderType}</Tag>
        </div>
        <div>
          <p className="text-slate-500">Table</p>
          <div className="flex items-center gap-1 text-slate-700">
            {(() => {
              // Extract table info from seats array
              const tableInfo = order.seats && order.seats.length > 0 && order.seats[0].tableId 
                ? order.seats[0].tableId 
                : null;
              
              return tableInfo ? (
                <>
                  <MdTableBar className="text-slate-400" />
                  <span className="font-medium">Table {tableInfo.tableNo}</span>
                </>
              ) : order.orderType === 'Take Away' ? (
                <span className="font-medium text-slate-500">Take Away</span>
              ) : (
                <span className="font-medium text-slate-500">No Table</span>
              );
            })()}
          </div>
        </div>
        <div>
          <p className="text-slate-500">Items</p>
          <span className="font-medium text-slate-700">{order.items.length}</span>
        </div>
        <div>
          <p className="text-slate-500">Order Date</p>
          <div className="text-slate-700">
            <div className="font-medium">{formatDateAndTime(order.orderDate).split(' ')[0]}</div>
            <div className="text-xs text-slate-500">{formatDateAndTime(order.orderDate).split(' ')[1]}</div>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between mb-3">
        <p className="text-slate-500">Status</p>
        {getStatusTag(order.orderStatus, order._id)}
      </div>

      <div className="flex items-center justify-end gap-2">
        {/* Add Items Button */}
        {user.role !== 'Staff' && !order.isPaid && (
          <Tooltip title="Edit Item">
            <Button
              size="sm"
              variant="outline"
              onClick={() => onAddItems(order)}
              icon={<FaEdit />}
              className="text-blue-500 hover:text-blue-600"
            />
          </Tooltip>
        )}

        {user.role !== 'Staff' && order.orderStatus === 'Completed' && !order.isPaid && (
          <Tooltip title="Payment">
            <Button
              size="sm"
              variant="primary"
              onClick={() => onViewDetails(order)}
              icon={<MdPayment />}
            />
          </Tooltip>
        )}
        
        <Tooltip title="Print">
          <Button
            size="sm"
            variant="outline"
            onClick={() => onPrint(order)}
            icon={<MdPrint />}
            className="text-slate-500 hover:text-blue-600"
          />
        </Tooltip>

        {!order.isPaid && (
          <Tooltip title="Delete">
            <Button
              size="sm"
              variant="danger"
              onClick={() => onDeleteOrder(order._id)}
              icon={<MdDelete />}
            />
          </Tooltip>
        )}
      </div>
    </div>
  );
};

export default OrderCard;