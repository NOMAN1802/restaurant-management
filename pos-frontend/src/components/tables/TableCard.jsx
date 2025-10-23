import React, { useState } from "react";
import { MdTableBar, MdPeople, MdAccessTime, MdChair } from "react-icons/md";
import { useNavigate } from "react-router-dom";
import { getAvatarName, getBgColor } from "../../utils";
import { useDispatch, useSelector } from "react-redux";
import { updateTable, setPendingTableSelection } from "../../redux/slices/customerSlice";
import Card from "../ui/Card";
import Button from "../ui/Button";
import { enqueueSnackbar } from "notistack";

const TableCard = ({ id, name, status, initials, seats, seatDetails = [], currentOrders = [], onSelectionComplete }) => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const customerData = useSelector((state) => state.customer);
  const [selectedSeats, setSelectedSeats] = useState([]);

  const occupiedSeats = seatDetails.filter(s => s.status === 'Booked').length;
  const isFullyBooked = occupiedSeats === seats;
  const isPartiallyBooked = occupiedSeats > 0 && occupiedSeats < seats;
  const availableSeats = seats - occupiedSeats;

  const handleSeatClick = (seat) => {
    if (seat.status === 'Booked') return;

    setSelectedSeats(prev =>
      prev.find(s => s.seatNumber === seat.seatNumber)
        ? prev.filter(s => s.seatNumber !== seat.seatNumber)
        : [...prev, { tableId: id, seatNumber: seat.seatNumber }]
    );
  };

  const handleConfirmSelection = () => {
    if (selectedSeats.length === 0) {
      enqueueSnackbar("Please select at least one seat!", { variant: "warning" });
      return;
    }

    // Check if customer data exists
    if (!customerData.serialNumber) {
      // Store selected seats and table info in Redux
      const tableSelection = {
        table: { tableId: id, tableNo: name },
        seats: selectedSeats
      };
      
      dispatch(setPendingTableSelection(tableSelection));
      enqueueSnackbar("Seats selected! Please create an order to proceed.", { variant: "info" });
      
      // Navigate to home to create order
      navigate('/');
      return;
    }

    // Check if order type is Dine In
    if (customerData.orderType !== 'Dine In') {
      enqueueSnackbar("Table selection is only available for Dine In orders!", { variant: "warning" });
      return;
    }

    // Validate guest count vs selected seats
    if (customerData.guests && selectedSeats.length < customerData.guests) {
      enqueueSnackbar(`You have ${customerData.guests} guests but only selected ${selectedSeats.length} seats. Please select ${customerData.guests - selectedSeats.length} more seat(s).`, { variant: "warning" });
      return;
    }

    // Validate that we don't select more seats than guests (optional warning)
    if (customerData.guests && selectedSeats.length > customerData.guests) {
      enqueueSnackbar(`You selected ${selectedSeats.length} seats for ${customerData.guests} guests. This is allowed but may incur extra charges.`, { variant: "info" });
    }

    dispatch(updateTable({ seats: selectedSeats, table: { tableId: id, tableNo: name } }));
    if(onSelectionComplete) {
      onSelectionComplete();
    }
    navigate(`/menu`);
  };

  const statusConfig = {
    Available: {
      color: "bg-green-100 text-green-700 border-green-200",
      icon: "text-green-500",
      bgColor: "hover:bg-green-50"
    },
    "Partial Booked": {
      color: "bg-yellow-100 text-yellow-700 border-yellow-200",
      icon: "text-yellow-500",
      bgColor: "hover:bg-yellow-50"
    },
    Booked: {
      color: "bg-orange-100 text-orange-700 border-orange-200",
      icon: "text-orange-500",
      bgColor: "bg-orange-50"
    }
  };

  const config = statusConfig[status] || statusConfig.Available;

  return (
    <Card
      variant="default"
      className={`transition-all duration-200`}
    >
      <div className="text-center">
        {/* Table Info */}
        <div className="mb-4">
          <h3 className="text-lg font-bold text-slate-900 mb-1">
            Table {name}
          </h3>
          <div className="flex items-center justify-center gap-1 text-slate-600 mb-2">
            <MdPeople size={16} />
            <span className="text-sm">
              {occupiedSeats > 0 ? `${occupiedSeats}/${seats} seats` : `${seats} seats`}
            </span>
          </div>
          {isPartiallyBooked && (
            <div className="text-xs text-yellow-600 font-medium">
              {availableSeats} seats available
            </div>
          )}
        </div>

        {/* Seats */}
        <div className="grid grid-cols-4 gap-2 mb-4">
          {seatDetails.map(seat => {
            const isSelected = selectedSeats.find(s => s.seatNumber === seat.seatNumber);
            const isBooked = seat.status === 'Booked';
            return (
              <div
                key={seat.seatNumber}
                onClick={() => handleSeatClick(seat)}
                className={`p-2 rounded-lg flex flex-col items-center justify-center cursor-pointer transition-colors ${
                  isBooked ? 'bg-orange-200 text-orange-600 cursor-not-allowed' :
                  isSelected ? 'bg-blue-500 text-white' :
                  'bg-green-100 text-green-600 hover:bg-green-200'
                }`}
              >
                <MdChair size={20} />
                <span className="text-xs font-semibold">{seat.seatNumber}</span>
              </div>
            );
          })}
        </div>

        {/* Status Badge */}
        <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${config.color} mb-4`}>
          <div className={`w-2 h-2 rounded-full mr-2 ${isFullyBooked ? "bg-orange-500" : isPartiallyBooked ? "bg-yellow-500" : "bg-green-500"
            }`}></div>
          {status}
        </div>

        {/* Guest Info */}
        {customerData.guests && customerData.orderType === 'Dine In' && (
          <div className="mb-3 p-2 bg-blue-50 rounded-lg border border-blue-200">
            <p className="text-xs text-blue-700 font-medium">
              Guests: {customerData.guests} | Selected: {selectedSeats.length} seats
            </p>
            {selectedSeats.length < customerData.guests && (
              <p className="text-xs text-orange-600 mt-1">
                Please select {customerData.guests - selectedSeats.length} more seat(s)
              </p>
            )}
          </div>
        )}

        {/* Action Button */}
        {!isFullyBooked && (
          <Button
            variant="primary"
            size="sm"
            className="w-full"
            onClick={handleConfirmSelection}
            disabled={selectedSeats.length === 0 || (customerData.guests && selectedSeats.length < customerData.guests)}
          >
            {customerData.guests && selectedSeats.length < customerData.guests 
              ? `Select ${customerData.guests - selectedSeats.length} More Seats`
              : `Confirm Selection (${selectedSeats.length})`
            }
          </Button>
        )}
         {isFullyBooked && (
          <div className="text-center py-2">
            <p className="text-sm text-slate-500">Fully occupied</p>
          </div>
        )}
      </div>
    </Card>
  );
};

export default TableCard;