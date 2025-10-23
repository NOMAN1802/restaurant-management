import React from 'react';
import { MdTableBar, MdPeople, MdAccessTime } from 'react-icons/md';
import Table from '../ui/Table';
import Tag from '../ui/Tag';
import Button from '../ui/Button';
import { getAvatarName, getBgColor } from "../../utils";

const TablesTable = ({ tables = [], loading = false, customerData = {}, onSelectTable }) => {

  const getStatusTag = (status) => {
    const statusConfig = {
      'Available': { color: 'success', icon: <MdTableBar className="text-xs" /> },
      'Partial Booked': { color: 'warning', icon: <MdPeople className="text-xs" /> },
      'Booked': { color: 'error', icon: <MdPeople className="text-xs" /> },
    };

    const config = statusConfig[status] || { color: 'default', icon: <MdTableBar className="text-xs" /> };

    return (
      <Tag color={config.color} icon={config.icon}>
        {status}
      </Tag>
    );
  };

  const columns = [
    {
      title: 'Table',
      key: 'tableNo',
      width: '120px',
      render: (record) => (
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center">
            <MdTableBar className="text-slate-600 text-lg" />
          </div>
          <div>
            <div className="font-bold text-slate-900">Table {record.tableNo}</div>
          </div>
        </div>
      ),
      sorter: true,
    },
    {
      title: 'Seats',
      key: 'seats',
      width: '120px',
      render: (record) => {
        const occupied = record.seatDetails ? record.seatDetails.filter(s => s.status === 'Booked').length : 0;
        return (
          <div className="flex items-center gap-1 text-slate-700">
            <MdPeople className="text-slate-400" />
            <span className="font-medium">
              {occupied > 0 ? `${occupied}/${record.seats}` : record.seats}
            </span>
          </div>
        )
      },
      sorter: true,
    },
    {
      title: 'Status',
      key: 'status',
      width: '120px',
      render: (record) => getStatusTag(record.status),
      sorter: true,
    },
    {
      title: 'Current Customer',
      key: 'customer',
      width: '200px',
      render: (record) => {
        const customerName = record?.currentOrder?.customerDetails?.name;

        if (!customerName || record.status === 'Available') {
          return (
            <span className="text-slate-400 italic">No customer</span>
          );
        }

        return (
          <div className="flex items-center gap-3">
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-white font-semibold text-xs"
              style={{ backgroundColor: getBgColor() }}
            >
              {getAvatarName(customerName)}
            </div>
            <div>
              <div className="font-medium text-slate-900">{customerName}</div>
              <div className="text-xs text-slate-500 flex items-center gap-1">
                <MdAccessTime className="text-xs" />
                Active
              </div>
            </div>
          </div>
        );
      },
    },
    {
      title: 'Actions',
      key: 'actions',
      width: '160px',
      render: (record) => {
        const canSelectTable = (record.status === 'Available' || record.status === 'Partial Booked');
        return (
          <div className="flex items-center gap-2">
            {canSelectTable ? (
              customerData?.guests && customerData?.orderType === 'Dine In' ? (() => {
                const availableSeats = record.seatDetails?.filter(seat => seat.status === 'Available').length || 0;
                const hasEnoughSeats = availableSeats >= customerData.guests;
                
                return (
                  <Button
                    size="sm"
                    variant={hasEnoughSeats ? "primary" : "ghost"}
                    disabled={!hasEnoughSeats}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      console.log('Auto-select table for guests:', customerData.guests);
                      onSelectTable(record, 'auto');
                    }}
                    className={!hasEnoughSeats ? "opacity-50 cursor-not-allowed" : ""}
                  >
                    {hasEnoughSeats 
                      ? `Select Table (${customerData.guests} seats)`
                      : `Need ${customerData.guests - availableSeats} more seats`
                    }
                  </Button>
                );
              })() : (
                <Button
                  size="sm"
                  variant="primary"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    console.log('Select Seats button clicked for table:', record);
                    onSelectTable(record);
                  }}
                >
                  Select Seats
                </Button>
              )
            ) : (
              <Button
                size="sm"
                variant="ghost"
                disabled
                className="opacity-50 cursor-not-allowed"
              >
                {record.status === 'Booked' ? 'Occupied' : 'Not Available'}
              </Button>
            )}
          </div>
        );
      },
    },
  ];

  // Transform data for table
  const tableData = tables.map(table => ({
    key: table._id,
    ...table,
  }));

  return (
    <Table
      columns={columns}
      data={tableData}
      loading={loading}
      pagination={true}
      pageSize={12}
      className="shadow-sm"
      onRowClick={(record) => {
        const canSelectTableFromRow = (record.status === 'Available' || record.status === 'Partial Booked');
        if (canSelectTableFromRow) {
          console.log('Row clicked for table:', record);
          onSelectTable(record, 'manual');
        }
      }}
    />
  );
};

export default TablesTable;