import React, { useState, useEffect } from "react";
import { MdTableBar, MdPeople, MdAccessTime } from "react-icons/md";
import { IoArrowBackOutline } from "react-icons/io5";
import BottomNav from "../components/shared/BottomNav";
import TablesTable from "../components/tables/TablesTable";
import PageLayout from "../components/layout/PageLayout";
import Button from "../components/ui/Button";
import Card from "../components/ui/Card";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { getTables } from "../https";
import { useNavigate, useLocation } from "react-router-dom"; // Import useLocation
import { enqueueSnackbar } from "notistack";
import { useDispatch, useSelector } from "react-redux"; // Import useDispatch and useSelector
import { setCustomer, setOrderType, updateTable } from "../redux/slices/customerSlice"; // Import setCustomer, setOrderType, and updateTable
import Modal from "../components/shared/Modal";
import TableCard from "../components/tables/TableCard";

const FilterButton = ({ active, onClick, children, count }) => (
  <Button
    variant={active ? "primary" : "ghost"}
    size="sm"
    onClick={onClick}
    className={`relative ${active ? "" : "text-slate-600 hover:text-slate-900"}`}
  >
    {children}
    {count !== undefined && (
      <span className={`ml-2 px-2 py-0.5 text-xs rounded-full ${active ? "bg-white/20" : "bg-slate-200 text-slate-600"
        }`}>
        {count}
      </span>
    )}
  </Button>
);

const StatsCard = ({ title, value, icon: Icon, color = "orange" }) => {
  const colorClasses = {
    orange: "bg-orange-100 text-orange-600",
    green: "bg-green-100 text-green-600",
    blue: "bg-blue-100 text-blue-600",
    red: "bg-red-100 text-red-600",
  };

  return (
    <Card className="text-center">
      <div className={`w-12 h-12 ${colorClasses[color]} rounded-xl flex items-center justify-center mx-auto mb-3`}>
        <Icon size={24} />
      </div>
      <p className="text-2xl font-bold text-slate-900 mb-1">{value}</p>
      <p className="text-sm text-slate-600">{title}</p>
    </Card>
  );
};

const Tables = () => {
  const [status, setStatus] = useState("all");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTable, setSelectedTable] = useState(null);
  const navigate = useNavigate();
  const location = useLocation(); // Initialize useLocation
  const dispatch = useDispatch(); // Initialize useDispatch
  const customerData = useSelector((state) => state.customer); // Get customerData from Redux

  const handleSelectTable = (table, mode = 'manual') => {
    console.log('handleSelectTable called with:', table, 'mode:', mode);
    if (table.status === "Booked") return;
    
    if (mode === 'auto' && customerData.guests) {
      // Auto-select seats based on guest count
      handleAutoSelectSeats(table);
    } else {
      // Manual seat selection via modal
      setSelectedTable(table);
      setIsModalOpen(true);
    }
  };

  const handleAutoSelectSeats = (table) => {
    const guestCount = customerData.guests;
    const availableSeats = table.seatDetails?.filter(seat => seat.status === 'Available') || [];
    
    if (availableSeats.length < guestCount) {
      enqueueSnackbar(`Not enough available seats! Table has ${availableSeats.length} available seats but you need ${guestCount}.`, { variant: "warning" });
      return;
    }

    // Auto-select the first N available seats
    const selectedSeats = availableSeats.slice(0, guestCount).map(seat => ({
      tableId: table._id,
      seatNumber: seat.seatNumber
    }));

    console.log('Auto-selected seats:', selectedSeats);
    
    // Update Redux with selected table and seats
    dispatch(updateTable({ 
      seats: selectedSeats, 
      table: { tableId: table._id, tableNo: table.tableNo } 
    }));
    
    enqueueSnackbar(`Table ${table.tableNo} selected with ${guestCount} seats automatically!`, { variant: "success" });
    
    // Navigate to menu
    navigate('/menu');
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedTable(null);
  };

  // Effect to set customer data from navigation state when component mounts
  useEffect(() => {
    if (location.state?.customerName) { // Always set if customer data is in location state
      dispatch(setCustomer({
        name: location.state.customerName,
        phone: location.state.customerPhone,
        guests: location.state.guests,
        orderType: location.state.orderType,
        table: null, // Table will be selected on this page
        orderId: location.state.orderId || customerData.orderId, // Pass orderId if available
      }));
      // Clear location state to prevent re-initializing on subsequent renders
      navigate(location.pathname, { replace: true, state: {} });
    }
    document.title = "Kacchi Express | Tables";
  }, [location.state, dispatch, navigate, location.pathname, customerData.orderId]); // Add customerData.orderId to dependencies

  const { data: resData, isError, isLoading } = useQuery({
    queryKey: ["tables"],
    queryFn: async () => {
      return await getTables();
    },
    placeholderData: keepPreviousData,
  });

  if (isError) {
    enqueueSnackbar("Something went wrong!", { variant: "error" });
  }

  const tables = resData?.data?.data || [];

  // Filter tables based on status
  const filteredTables = status === "all"
    ? tables
    : tables.filter(table => {
      if (status === "available") return table.status === "Available";
      if (status === "partially") return table.status === "Partial Booked";
      if (status === "booked") return table.status === "Booked";
      return true;
    });

  // Calculate stats
  const totalTables = tables.length;
  const fullyBookedTables = tables.filter(t => t.status === "Booked").length;
  const partiallyBookedTables = tables.filter(t => t.status === "Partial Booked").length;
  const availableTables = tables.filter(t => t.status === "Available").length;
  const totalSeats = tables.reduce((sum, table) => sum + (table.seats || 0), 0);
  const occupiedSeats = tables.reduce((sum, table) => {
    const occupied = table.seatDetails ? table.seatDetails.filter(s => s.status === 'Booked').length : 0;
    return sum + occupied;
  }, 0);
  const occupancyRate = totalSeats > 0 ? Math.round((occupiedSeats / totalSeats) * 100) : 0;

  const stats = [
    { title: "Total Tables", value: totalTables, icon: MdTableBar, color: "blue" },
    { title: "Available", value: availableTables, icon: MdTableBar, color: "green" },
    { title: "Partial Booked", value: partiallyBookedTables, icon: MdPeople, color: "yellow" },
    { title: "Fully Booked", value: fullyBookedTables, icon: MdPeople, color: "orange" },
    { title: "Seat Occupancy", value: `${occupancyRate}%`, icon: MdAccessTime, color: "red" },
  ];

  return (
    <div className="pb-20 bg-slate-50 min-h-screen">
      <PageLayout
        title="Table Management"
        subtitle="Monitor and manage your restaurant tables"
        headerActions={
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(-1)}
            icon={<IoArrowBackOutline />}
          >
            Back
          </Button>
        }
      >
        {/* Stats Overview */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
          {stats.map((stat, index) => (
            <StatsCard key={index} {...stat} />
          ))}
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h3 className="text-lg font-semibold text-slate-900 mb-1">Filter Tables</h3>
              <p className="text-sm text-slate-600">View tables by their current status</p>
            </div>
            <div className="flex items-center gap-2">
              <FilterButton
                active={status === "all"}
                onClick={() => setStatus("all")}
                count={totalTables}
              >
                All Tables
              </FilterButton>
              <FilterButton
                active={status === "available"}
                onClick={() => setStatus("available")}
                count={availableTables}
              >
                Available
              </FilterButton>
              <FilterButton
                active={status === "partially"}
                onClick={() => setStatus("partially")}
                count={partiallyBookedTables}
              >
                Partial Booked
              </FilterButton>
              <FilterButton
                active={status === "booked"}
                onClick={() => setStatus("booked")}
                count={fullyBookedTables}
              >
                Fully Booked
              </FilterButton>
            </div>
          </div>
        </Card>

        {/* Customer Info */}
        {customerData.serialNumber && (
          <Card className="mb-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-slate-900 mb-1">Current Order</h3>
                <p className="text-sm text-slate-600">
                  Serial: {customerData.serialNumber} | 
                  Type: {customerData.orderType} | 
                  Guests: {customerData.guests || 0}
                </p>
              </div>
              {customerData.orderType === 'Dine In' && (
                <div className="text-right">
                  <p className="text-sm font-medium text-orange-600">
                    Please select a table and {customerData.guests} seat(s)
                  </p>
                </div>
              )}
            </div>
          </Card>
        )}

        {/* Tables Table */}
        <div className="bg-white rounded-lg">
          <TablesTable
            tables={filteredTables}
            loading={isLoading}
            customerData={customerData} // Pass customerData to TablesTable
            onSelectTable={handleSelectTable} // Pass down the handler
          />
        </div>

        {/* Empty State */}
        {!isLoading && filteredTables.length === 0 && (
          <Card className="text-center py-12 mt-6">
            <MdTableBar className="text-slate-300 text-6xl mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-slate-900 mb-2">
              No {status !== "all" ? status : ""} tables found
            </h3>
            <p className="text-slate-600 mb-6">
              {status === "all"
                ? "No tables are currently set up in the system."
                : `No ${status} tables at the moment.`
              }
            </p>
            {status !== "all" && (
              <Button
                variant="outline"
                onClick={() => setStatus("all")}
              >
                View All Tables
              </Button>
            )}
          </Card>
        )}
      </PageLayout>
      <BottomNav />

      {isModalOpen && selectedTable && (
        <Modal
          title={`Select Seats for Table ${selectedTable.tableNo}`}
          onClose={handleCloseModal}
        >
          <TableCard
            id={selectedTable._id}
            name={selectedTable.tableNo}
            status={selectedTable.status}
            seats={selectedTable.seats}
            seatDetails={selectedTable.seatDetails}
            onSelectionComplete={handleCloseModal} // Close modal on completion
          />
        </Modal>
      )}
    </div>
  );
};

export default Tables;