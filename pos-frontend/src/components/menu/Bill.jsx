import React, { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { getTotalPrice, removeAllItems } from "../../redux/slices/cartSlice";
import {
  addOrder,
  processCashPayment,
  updateTable,
  applyCoupon,
} from "../../https/index";
import { enqueueSnackbar } from "notistack";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { removeCustomer, setCustomer } from "../../redux/slices/customerSlice";
import Invoice from "../invoice/Invoice";
import OrderSummaryModal from "../invoice/OrderSummaryModal";
import { addNotification } from "../../redux/slices/notificationSlice";
import { useUpdateOrderItemsMutation, useGetOrderQuery } from "../../redux/api/orderApi"; // Import new mutations and query
import { useNavigate } from "react-router-dom"; // Import useNavigate

const Bill = ({ orderId = null }) => { // Accept orderId as prop
  const dispatch = useDispatch();
  const queryClient = useQueryClient(); // Initialize useQueryClient
  const navigate = useNavigate(); // Initialize useNavigate

  const { serialNumber, guests, table, orderType, seats, orderId: customerOrderId } = useSelector((state) => state.customer);
  const cartData = useSelector((state) => state.cart);
  const total = useSelector(getTotalPrice);

  const [paymentMethod, setPaymentMethod] = useState("Cash");
  const [showInvoice, setShowInvoice] = useState(false);
  const [showOrderSummary, setShowOrderSummary] = useState(false);
  const [orderInfo, setOrderInfo] = useState(null); // This will hold the *newly created* order info for payment/invoice

  // Fetch order details if orderId is provided (for existing orders)
  const { data: fetchedOrderData, isLoading: isOrderLoading } = useGetOrderQuery(orderId, {
    skip: !orderId, // Skip query if no orderId is provided
  });
  useEffect(() => {
    if (orderId && fetchedOrderData && fetchedOrderData?.data) {
      setOrderInfo(fetchedOrderData.data?.data);
      if (fetchedOrderData.data?.data) {
        const loadedOrder = fetchedOrderData.data.data;
        console.log("Loading order data:", loadedOrder);
        console.log("Order table field:", loadedOrder.table);
        console.log("Order seats field:", loadedOrder.seats);
        
        // Derive table info: prefer loadedOrder.table, otherwise use first seat's populated tableId
        let tableInfo = loadedOrder.table || null;
        console.log("Initial tableInfo from loadedOrder.table:", tableInfo);
        
        // If table is not set or doesn't have tableNo, try to get it from seats
        if ((!tableInfo || !tableInfo.tableNo) && Array.isArray(loadedOrder.seats) && loadedOrder.seats.length > 0) {
          const firstSeat = loadedOrder.seats[0];
          console.log("First seat:", firstSeat);
          console.log("First seat tableId type:", typeof firstSeat.tableId);
          
          // If seats were populated with table documents, tableId will be an object
          if (firstSeat.tableId && typeof firstSeat.tableId === 'object') {
            tableInfo = {
              _id: firstSeat.tableId._id || firstSeat.tableId.id || null,
              tableNo: firstSeat.tableId.tableNo || firstSeat.tableId.name || null,
            };
            console.log("Extracted tableInfo from populated seat:", tableInfo);
          } else if (firstSeat.tableId) {
            // fallback to id-only (we'll need to fetch the table separately)
            console.log("Seat has tableId but not populated:", firstSeat.tableId);
            tableInfo = { _id: firstSeat.tableId };
          }
        }
        
        console.log("Final tableInfo to be set:", tableInfo);
        console.log("Seats to be set:", loadedOrder.seats);

        dispatch(setCustomer({
          serialNumber: loadedOrder.customerDetails?.serialNumber || "",
          guests: loadedOrder.customerDetails?.guests || 0,
          table: tableInfo,
          seats: loadedOrder.seats || [],
          orderType: loadedOrder.orderType || "Dine In",
          orderId: loadedOrder._id || "",
        }));
      }
    }
  }, [orderId, fetchedOrderData, dispatch]);

  const [couponCodeInput, setCouponCodeInput] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [discountAmount, setDiscountAmount] = useState(0);
  const [totalWithDiscount, setTotalWithDiscount] = useState(total);

  const [isPaymentProcessing, setIsPaymentProcessing] = useState(false);

  // Update totalWithDiscount when total or discountAmount changes
  React.useEffect(() => {
    setTotalWithDiscount(total - discountAmount);
  }, [total, discountAmount]);

  const handleApplyCoupon = async () => {
    try {
      const { data } = await applyCoupon({
        code: couponCodeInput,
        totalAmount: total,
      });
      enqueueSnackbar(data.message, { variant: "success" });
      setAppliedCoupon(data.couponCode);
      setDiscountAmount(data.discountAmount);
      setTotalWithDiscount(data.totalWithDiscount);
    } catch (error) {
      console.error("Error applying coupon:", error);
      enqueueSnackbar(error.response?.data?.message || "Failed to apply coupon!", { variant: "error" });
      setAppliedCoupon(null);
      setDiscountAmount(0);
      setTotalWithDiscount(total);
    }
  };

  // Mutation for creating a new order
  const createOrderMutation = useMutation({
    mutationFn: (reqData) => addOrder(reqData),
    onSuccess: (resData) => {
      const { data } = resData.data;
      setOrderInfo(data);

      enqueueSnackbar("Order Placed! Redirecting to home page...", {
        variant: "success",
      });
      dispatch(addNotification({
        message: `Order #${data._id.substring(0, 8)} placed successfully!`, type: "success"
      }));

      // Reset cart and customer data, then redirect to home page
      setTimeout(() => {
        dispatch(removeAllItems());
        dispatch(removeCustomer());
        navigate("/orders"); // Redirect to orders page
      }, 1500);
    },
    onError: (error) => {
      console.error("Error placing order:", error.response);
      enqueueSnackbar(error.response?.data?.message || "Failed to place order!", { variant: "error" });
      dispatch(addNotification({
        message: `Failed to place order: ${error.response?.data?.message || "Unknown error"}`, type: "error"
      }));
    },
  });

  // Mutation for adding items to an existing order
  const [updateOrderItems, { isLoading: isUpdatingItems }] = useUpdateOrderItemsMutation();

  const handleUpdateOrder = async () => {
    if (cartData.length === 0) {
      enqueueSnackbar("Cart is empty! Please add items.", { variant: "warning" });
      return;
    }

    if (!serialNumber) {
      enqueueSnackbar("Please provide customer serial number!", { variant: "warning" });
      return;
    }

    // For Dine In orders, check if seats are selected
    if (orderType === 'Dine In' && (!seats || seats.length === 0)) {
      enqueueSnackbar("Please select seats for Dine In order!", { variant: "warning" });
      return;
    }

    try {
      const payload = {
        orderId,
        items: cartData,
        orderType,
        table,
        seats: orderType === 'Dine In' ? seats : [],
        customerDetails: {
          serialNumber,
          guests,
        },
        bills: { // Include bill details for coupon application
          total: total,
          couponCode: appliedCoupon,
          discountAmount: discountAmount,
          totalWithDiscount: totalWithDiscount,
        },
      };
      const response = await updateOrderItems(payload).unwrap();
      enqueueSnackbar(response.message || "Order updated successfully!", { variant: "success" });
      dispatch(addNotification({
        message: `Order #${orderId.substring(0, 8)} updated successfully!`, type: "success"
      }));
      dispatch(removeAllItems()); // Re-enabled after debugging
      dispatch(removeCustomer()); // Re-enabled after debugging
      queryClient.invalidateQueries(["order", orderId]); // Invalidate specific order query
      queryClient.invalidateQueries(["orders"]); // Invalidate all orders query
      navigate("/orders"); // Redirect to orders page
    } catch (error) {
      console.error("Error adding items to order:", error);
      enqueueSnackbar(error.data?.message || "Failed to update order!", { variant: "error" });
      dispatch(addNotification({
        message: `Failed to update Order #${orderId.substring(0, 8)}: ${error.data?.message || "Unknown error"}`, type: "error"
      }));
    }
  };

  const handleCreateOrder = async () => {
    if (cartData.length === 0) {
      enqueueSnackbar("Cart is empty! Please add items.", { variant: "warning" });
      return;
    }
    // Check if serial number is provided
    if (!serialNumber) {
      enqueueSnackbar("Please provide customer serial number!", { variant: "warning" });
      return;
    }

    // Check if order type is selected
    if (!orderType) {
      enqueueSnackbar("Please select an order type (Dine In or Take Away)!", { variant: "warning" });
      return;
    }

    // For Dine In orders, check if seats are selected
    if (orderType === 'Dine In' && (!seats || seats.length === 0)) {
      enqueueSnackbar("Please select seats for Dine In order!", { variant: "warning" });
      return;
    }

    // Place the order
    const orderData = {
      customerDetails: {
        serialNumber, // Add serialNumber field
        name: "", // Assuming name is not directly from customer slice, or needs to be added
        phone: "", // Assuming phone is not directly from customer slice, or needs to be added
        guests,
      },
      orderStatus: "In Progress",
      orderType,
      bills: {
        total: total,
        couponCode: appliedCoupon,
        discountAmount: discountAmount,
        totalWithDiscount: totalWithDiscount,
      },
      items: cartData,
      seats: orderType === 'Dine In' ? seats : [],
    };
    console.log('Creating order with data:', orderData);
    console.log('Customer data from Redux:', { serialNumber, guests, orderType, seats, table });
    createOrderMutation.mutate(orderData);
  };

  const handlePlaceOrder = () => {
    if (orderId) {
      handleUpdateOrder();
    } else {
      handleCreateOrder();
    }
  };

  const handleProcessPayment = async () => {
    setIsPaymentProcessing(true);
    try {
      const { data } = await processCashPayment({
        amount: totalWithDiscount.toFixed(2),
        orderId: orderInfo._id,
      });
      enqueueSnackbar(data.message, { variant: "success" });
      dispatch(addNotification({
        message: `Payment processed for Order #${orderInfo._id.substring(0, 8)}!`, type: "success"
      }));
      setOrderInfo((prev) => ({ ...prev, isPaid: true, paymentMethod: "Cash" }));
      setShowInvoice(true); // Show invoice after successful payment

      // Update table status to 'Available' and clear orderId after successful payment
      tableUpdateMutation.mutate({
        tableId: customerData.table._id,
        status: "Available",
        orderId: null,
      }, {
        onSuccess: () => queryClient.invalidateQueries(["tables"]),
      });

      dispatch(removeAllItems());
      dispatch(removeCustomer());
    } catch (error) {
      console.error("Error processing payment:", error.response);
      enqueueSnackbar(error.response?.data?.message || "Payment failed!", { variant: "error" });
      dispatch(addNotification({
        message: `Payment failed for Order #${orderInfo._id.substring(0, 8)}: ${error.response?.data?.message || "Unknown error"}`, type: "error"
      }));
    } finally {
      setIsPaymentProcessing(false);
    }
  };

  const isOrderCompleted = orderInfo && orderInfo.orderStatus === "Completed";
  const isOrderReady = orderInfo && orderInfo.orderStatus === "Ready";
  const isOrderInProgress = orderInfo && orderInfo.orderStatus === "In Progress";
  const isOrderPaid = orderInfo && orderInfo.isPaid;

  const canProcessPayment = orderInfo && !isOrderPaid && (isOrderCompleted || isOrderReady || isOrderInProgress);
  const canPrintReceipt = orderInfo && (isOrderCompleted || isOrderReady || isOrderInProgress || isOrderPaid);
  const showActionButtons = orderInfo && (isOrderCompleted || isOrderReady || isOrderInProgress);

  return (
    <div className="bg-white p-3 lg:p-4">
      <div className="flex items-center justify-between px-1 lg:px-2 mb-2">
        <p className="text-xs text-gray-600 font-medium">
          Items({cartData.length})
        </p>
        <h1 className="text-gray-800 text-sm lg:text-base font-bold">
          ৳{total.toFixed(2)}
        </h1>
      </div>

      <div className="hidden lg:block">
        <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-0 sm:justify-between px-1 lg:px-2 mb-2">
          <input
            type="text"
            placeholder="Enter Coupon Code"
            className="bg-gray-50 text-gray-800 px-3 py-2 rounded-lg w-full sm:mr-2 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent text-sm"
            value={couponCodeInput}
            onChange={(e) => setCouponCodeInput(e.target.value)}
          // disabled={orderId !== null} // Enable coupon for existing orders
          />
          <button
            onClick={handleApplyCoupon}
            className="bg-blue-600 px-3 py-2 rounded-lg text-white font-semibold w-full sm:w-auto hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
          // disabled={orderId !== null} // Enable coupon for existing orders
          >
            Apply
          </button>
        </div>
      </div>

      {appliedCoupon && (
        <div className="flex items-center justify-between px-1 lg:px-2 mb-2">
          <p className="text-xs text-gray-600 font-medium">Discount ({appliedCoupon})</p>
          <h1 className="text-gray-800 text-sm lg:text-base font-bold">- ৳{discountAmount.toFixed(2)}</h1>
        </div>
      )}



      <div className="flex items-center justify-between px-1 lg:px-2 mb-3">
        <p className="text-sm lg:text-base text-gray-800 font-semibold">
          Total
        </p>
        <h1 className="text-gray-900 text-lg lg:text-xl font-bold">
          ৳{totalWithDiscount.toFixed(2)}
        </h1>
      </div>

      <div className="px-1 lg:px-2">
        <button
          onClick={handlePlaceOrder}
          className="bg-orange-600 px-4 py-3 w-full rounded-lg text-white font-semibold text-base lg:text-lg hover:bg-orange-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
          disabled={isUpdatingItems || (!orderId && createOrderMutation.isLoading)}
        >
          {orderId ? (isUpdatingItems ? "Updating Order..." : "Update Order") : (createOrderMutation.isLoading ? "Placing Order..." : "Place Order")}
        </button>
      </div>

      {showActionButtons && (
        <div className="flex flex-col gap-2 px-1 lg:px-2 mt-3">
          <button
            onClick={() => setShowOrderSummary(true)}
            className="bg-green-600 px-4 py-2 w-full rounded-lg text-white font-semibold text-sm lg:text-base hover:bg-green-700 transition-colors"
          >
            View Order Summary
          </button>
          <button
            onClick={() => setShowInvoice(true)}
            className="bg-blue-600 px-4 py-2 w-full rounded-lg text-white font-semibold text-sm lg:text-base hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          // disabled={!canPrintReceipt}
          >
            Print Receipt
          </button>
          <button
            onClick={handleProcessPayment}
            className="bg-orange-600 px-4 py-2 w-full rounded-lg text-white font-semibold text-sm lg:text-base hover:bg-orange-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={!canProcessPayment || isPaymentProcessing}
          >
            {isPaymentProcessing ? "Processing..." : "Process Payment"}
          </button>
        </div>
      )}

      {showInvoice && (
        <Invoice orderInfo={orderInfo} setShowInvoice={setShowInvoice} />
      )}

      {showOrderSummary && (
        <OrderSummaryModal orderInfo={orderInfo} setShowOrderSummary={setShowOrderSummary} />
      )}
    </div>
  );
};

export default Bill;