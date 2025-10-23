import React, { useState, useEffect } from "react"; // Import useEffect
import { useDispatch, useSelector } from "react-redux";
import { formatDate, getAvatarName } from "../../utils";
import { enqueueSnackbar } from "notistack";
import { setCustomer } from "../../redux/slices/customerSlice";

const CustomerInfo = () => {
  const [dateTime, setDateTime] = useState(new Date());
  const customerData = useSelector((state) => state.customer);
  const dispatch = useDispatch();

  const [customerNameInput, setCustomerNameInput] = useState("");
  const [customerPhoneInput, setCustomerPhoneInput] = useState("");
  const [guestsInput, setGuestsInput] = useState(0);
  const [isEditing, setIsEditing] = useState(false); // New state for edit mode

  // Synchronize local state with Redux customerData
  useEffect(() => {
    if (customerData.name) {
      setCustomerNameInput(customerData.name);
      setCustomerPhoneInput(customerData.phone);
      setGuestsInput(customerData.guests);
      setIsEditing(false); // Not editing if data is pre-filled
    } else {
      // If no customer data, reset inputs and allow editing
      setCustomerNameInput("");
      setCustomerPhoneInput("");
      setGuestsInput(0);
      setIsEditing(true);
    }
  }, [customerData]);

  const handleAddCustomer = () => {
    if (customerData.orderType === 'Take Away' || (customerNameInput && customerPhoneInput && guestsInput > 0)) {
      dispatch(setCustomer({
        name: customerNameInput || "Take Away Customer",
        phone: customerPhoneInput,
        guests: guestsInput,
        orderId: customerData.orderId || `ORD${Date.now().toString().slice(-6)}`, // Use existing orderId or generate new
        table: customerData.table, // Preserve existing table
        orderType: customerData.orderType, // Preserve existing orderType
      }));
      setIsEditing(false); // Exit edit mode after confirming
      enqueueSnackbar("Customer confirmed successfully!", { variant: "success" });
    } else {
      enqueueSnackbar("Please fill all customer details!", { variant: "warning" });
    }
  };

  return (
    <div className="bg-white p-6">
      {(!customerData.name || isEditing) ? ( // Show inputs if no customerData or in edit mode
        <div className="space-y-4">
          <div className="text-center mb-6">
            <h2 className="text-xl font-bold text-gray-900 mb-2">Customer Information</h2>
            <p className="text-gray-600 text-sm">Please provide customer details to continue</p>
          </div>
          
          <div className="space-y-4">
            <div>
              <label htmlFor="customerName" className="block text-sm font-medium text-gray-700 mb-2">
                Customer Name *
              </label>
              <input
                type="text"
                id="customerName"
                placeholder="Enter customer name"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-colors"
                value={customerNameInput}
                onChange={(e) => setCustomerNameInput(e.target.value)}
              />
            </div>
            
            <div>
              <label htmlFor="customerPhone" className="block text-sm font-medium text-gray-700 mb-2">
                Customer Phone *
              </label>
              <input
                type="tel"
                id="customerPhone"
                placeholder="Enter phone number"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-colors"
                value={customerPhoneInput}
                onChange={(e) => setCustomerPhoneInput(e.target.value)}
              />
            </div>
            
            {customerData.orderType !== 'Take Away' && (
            <div>
              <label htmlFor="guests" className="block text-sm font-medium text-gray-700 mb-2">
                Number of Guests *
              </label>
              <input
                type="number"
                id="guests"
                placeholder="Enter number of guests"
                min="1"
                max="20"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-colors"
                value={guestsInput}
                onChange={(e) => setGuestsInput(Number(e.target.value))}
              />
            </div>
            )}
            
            <button
              onClick={handleAddCustomer}
              className="w-full bg-orange-600 text-white py-3 px-4 rounded-lg font-semibold hover:bg-orange-700 transition-colors shadow-sm"
            >
              Confirm Customer
            </button>
          </div>
        </div>
      ) : ( // Display customer info if customerData exists and not editing
        <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-orange-100 text-orange-600 w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg">
                {getAvatarName(customerData.name) || "CN"}
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">
                  {customerData.name}
                </h3>
                <p className="text-sm text-gray-600">
                  {customerData.phone} • {customerData.guests} guests
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Table: {customerData.table?.tableNo || "N/A"} • {formatDate(dateTime)}
                </p>
              </div>
            </div>
            <button 
              onClick={() => setIsEditing(true)} // Set edit mode on click
              className="text-sm text-orange-600 hover:text-orange-700 font-medium"
            >
              Edit
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomerInfo;
