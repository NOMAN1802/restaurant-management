import React, { useEffect } from 'react';
import logo from '../../assets/images/logo.jpg';

const PrintableOrderSummary = ({ orderInfo }) => {
  useEffect(() => {
    const originalTitle = document.title;
    document.title = 'Order Summary';
    return () => {
      document.title = originalTitle;
    };
  }, [orderInfo]);

  // Format currency with Bangladeshi Taka symbol
  const formatCurrency = (amount) => {
    return `৳${parseFloat(amount).toFixed(2)}`;
  };

  // Determine payment status styling
  const getPaymentStatusStyle = (isPaid) => {
    return isPaid 
      ? "bg-green-100 text-green-800 border-green-300" 
      : "bg-yellow-100 text-yellow-800 border-yellow-300";
  };

  // Determine payment status text
  const getPaymentStatusText = (isPaid) => {
    return isPaid ? "PAID" : "UNPAID";
  };

  return (
    <div className="printable-order-summary bg-white text-gray-800 font-sans p-6 text-base">
      {/* Restaurant Header */}
      <div className="text-center border-b-2 border-gray-300 pb-4">
        <img src={logo} alt="Restaurant Logo" className="mx-auto mb-3" style={{maxWidth: '80px', height: 'auto'}} />
        <h1 className="text-4xl font-bold">Kacchi Express</h1>
        <p className="text-xl font-semibold text-gray-600">The Taste of Traditional Kacchi</p>
        <p className="text-base text-gray-500 mt-2 font-semibold">
          Nowapara, Abhaynagar, Jessore<br />
          Phone: +880 1922315967 | Email: kacchi.express@gmail.com
        </p>
      </div>

      {/* Order Summary Title */}
      <div className="text-center my-6">
        <h2 className="text-3xl font-bold tracking-wider">ORDER SUMMARY</h2>
        <p className="text-lg text-gray-600 font-semibold">Thank you for your order!</p>
      </div>

      {/* Payment Status Banner - Always visible with different styling based on payment status */}
      <div className={`mb-6 p-3 border rounded-md text-center ${getPaymentStatusStyle(orderInfo.isPaid)}`}>
        <span className="font-bold text-lg">Status: {getPaymentStatusText(orderInfo.isPaid)}</span>
      </div>

      {/* Order Information */}
      <div className="grid grid-cols-2 gap-4 text-base mb-6">
        <div>
          <p><strong>Order ID:</strong> {Math.floor(new Date(orderInfo.orderDate).getTime())}</p>
          <p><strong>Date:</strong> {new Date(orderInfo.orderDate).toLocaleDateString()}</p>
        </div>
        <div className="text-right">
          <p><strong>Time:</strong> {new Date(orderInfo.orderDate).toLocaleTimeString()}</p>
          <p><strong>Table:</strong> {(() => {
            const tableInfo = orderInfo.seats && orderInfo.seats.length > 0 && orderInfo.seats[0].tableId 
              ? orderInfo.seats[0].tableId 
              : null;
            return tableInfo ? `Table ${tableInfo.tableNo}` : orderInfo.orderType === 'Take Away' ? 'Take Away' : 'N/A';
          })()}</p>
        </div>
      </div>

      {/* Customer Information */}
      <div className="border-t border-gray-300 pt-4 mb-6">
        <h3 className="text-xl font-semibold mb-2">Customer Details</h3>
        <div className="text-base">
          <p><strong>Customer ID:</strong> #{orderInfo.customerDetails.serialNumber || 'N/A'}</p>
          <p><strong>Order Type:</strong> {orderInfo.customerDetails.orderType || 'N/A'}</p>
          {orderInfo.customerDetails.orderType === 'Dine In' && (
            <p><strong>Guests:</strong> {orderInfo.customerDetails.guests || 'N/A'}</p>
          )}
        </div>
      </div>

      {/* Items Table */}
      <div className="border-t border-gray-300 pt-4 mb-6">
        <h3 className="text-xl font-semibold mb-2">Items Ordered</h3>
        <table className="w-full text-base">
          <thead>
            <tr className="border-b-2 border-gray-300">
              <th className="text-left pb-2">Item</th>
              <th className="text-center pb-2">Qty</th>
              <th className="text-right pb-2">Price</th>
              <th className="text-right pb-2">Total</th>
            </tr>
          </thead>
          <tbody>
            {orderInfo.items.map((item, index) => (
              <tr key={index} className="border-b border-gray-200">
                <td className="py-2">{item.name}</td>
                <td className="text-center">{item.quantity}</td>
                <td className="text-right">{formatCurrency(item.price / item.quantity)}</td>
                <td className="text-right">{formatCurrency(item.price)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Bill Summary */}
      <div className="border-t border-gray-300 pt-4 text-base">
        <div className="flex justify-between mb-1">
          <span>Subtotal:</span>
          <span>{formatCurrency(orderInfo.bills.total)}</span>
        </div>
        {orderInfo.bills.couponCode && (
          <div className="flex justify-between mb-1 text-red-600">
            <span>Discount ({orderInfo.bills.couponCode}):</span>
            <span>-{formatCurrency(orderInfo.bills.discountAmount)}</span>
          </div>
        )}
        <div className="flex justify-between font-bold text-xl border-t-2 border-gray-300 pt-2 mt-2">
          <span>TOTAL:</span>
          <span>{formatCurrency(orderInfo.bills.totalWithDiscount)}</span>
        </div>
      </div>

      {/* Payment Information - Different content based on payment status */}
      <div className="border-t border-gray-300 pt-4 mt-6">
        <h3 className="text-xl font-semibold mb-2">Payment Details</h3>
        <div className="text-base">
          {orderInfo.isPaid ? (
            <>
              <p><strong>Payment Method:</strong> {orderInfo.paymentMethod}</p>
              <p><strong>Payment Date:</strong> {new Date(orderInfo.paymentDate || orderInfo.orderDate).toLocaleString()}</p>
              <p><strong>Status:</strong> <span className="font-bold text-green-600">PAID</span></p>
            </>
          ) : (
            <>
              <p><strong>Payment Status:</strong> <span className="font-bold text-yellow-600">PENDING</span></p>
              <p><strong>Amount Due:</strong> {formatCurrency(orderInfo.bills.totalWithDiscount)}</p>
              <p className="italic mt-2">Please complete payment to finalize your order.</p>
            </>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="text-center border-t-2 border-gray-300 pt-6 mt-6 text-sm text-gray-500">
        <p className="text-lg font-semibold">Thank you for dining with us!</p>
        <p>Please visit us again soon.</p>
        <p className="font-bold mt-2">Powered by: {orderInfo?.restaurant?.name || 'Bytespate Limited'}</p>
      </div>
    </div>
  );
};

export default PrintableOrderSummary;