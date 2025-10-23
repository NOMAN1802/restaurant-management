import React from 'react';
import { MdDelete, MdEdit, MdMoreVert } from 'react-icons/md';
import { FaEye } from 'react-icons/fa';
import Button from '../ui/Button';
import { Dropdown, Menu } from 'antd';

const ActiveOrderCard = ({ order, onStatusUpdate, onDeleteOrder, onViewDetails }) => {
    const getStatusColor = (status) => {
        switch (status) {
            case 'Pending': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
            case 'In Progress': return 'bg-orange-100 text-orange-700 border-orange-200';
            case 'Ready': return 'bg-blue-100 text-blue-700 border-blue-200';
            default: return 'bg-gray-100 text-gray-700 border-gray-200';
        }
    };

    const menu = (
        <Menu>
            <Menu.Item key="status-in-progress" onClick={() => onStatusUpdate(order._id, 'In Progress')}>
                In Progress
            </Menu.Item>
            <Menu.Item key="status-ready" onClick={() => onStatusUpdate(order._id, 'Ready')}>
                Ready
            </Menu.Item>
            <Menu.Item key="status-completed" onClick={() => onStatusUpdate(order._id, 'Completed')}>
                Completed
            </Menu.Item>
        </Menu>
    );

    return (
        <div className="bg-white rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between">
            <div>
                <div className="flex items-start justify-between mb-2">
                    <div>
                        <p className="font-semibold text-slate-900">
                            {order.table ? `Table ${order.table.tableNo}` : 'Take Away'}
                        </p>
                        <p className="text-sm text-slate-600">{order.customerDetails.name}</p>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(order.orderStatus)}`}>
                        {order.orderStatus}
                    </span>
                </div>
                <div className="text-sm text-slate-500 mb-3">
                    {order.items.length} items &bull; ৳{order.bills.totalWithDiscount?.toFixed(2)}
                </div>
            </div>
            <div className="flex items-center justify-end gap-2">
                <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onViewDetails(order)}
                    icon={<FaEye />}
                >
                    View
                </Button>
                <Dropdown overlay={menu} trigger={['click']}>
                    <Button
                        size="sm"
                        variant="outline"
                        icon={<MdEdit />}
                    >
                        Status
                    </Button>
                </Dropdown>
                {!order.isPaid && (
                    <Button
                        size="sm"
                        variant="danger"
                        onClick={() => onDeleteOrder(order._id)}
                        icon={<MdDelete />}
                    />
                )}
            </div>
        </div>
    );
};

export default ActiveOrderCard;
