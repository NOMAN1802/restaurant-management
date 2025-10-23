import React, { useRef } from "react";
import { MdPrint, MdClose, MdReceipt } from "react-icons/md";
import Button from "../ui/Button";
import Card from "../ui/Card";
import PrintableOrderSummary from "./PrintableOrderSummary";

const OrderSummaryModal = ({ orderInfo, setShowOrderSummary }) => {
  const summaryRef = useRef(null);
  
  const handlePrint = () => {
    const printContent = summaryRef.current;
    if (printContent) {
      // Create a hidden iframe for printing
      const iframe = document.createElement('iframe');
      iframe.style.position = 'absolute';
      iframe.style.top = '-10000px';
      iframe.style.left = '-10000px';
      iframe.style.width = '0px';
      iframe.style.height = '0px';
      iframe.style.border = 'none';
      
      document.body.appendChild(iframe);
      
      // Get the summary HTML content
      const summaryHTML = printContent.innerHTML;
      
      // Create the complete HTML document for printing
      const printDocument = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Order Summary</title>
          <style>
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }
            
            body {
              font-family: 'Arial', sans-serif;
              font-size: 12pt;
              line-height: 1.4;
              color: #000;
              background: #fff;
              padding: 20px;
            }
            
            .printable-order-summary {
              background: white;
              color: #333;
              font-family: Arial, sans-serif;
              padding: 0;
            }
            
            .text-center { text-align: center; }
            .text-left { text-align: left; }
            .text-right { text-align: right; }
            .font-bold { font-weight: bold; }
            .text-4xl { font-size: 2.25rem; }
            .text-3xl { font-size: 1.875rem; }
            .text-2xl { font-size: 1.5rem; }
            .text-xl { font-size: 1.25rem; }
            .text-lg { font-size: 1.125rem; }
            .text-base { font-size: 1rem; }
            .text-sm { font-size: 0.875rem; }
            
            .mx-auto { margin-left: auto; margin-right: auto; }
            .my-6 { margin-top: 1.5rem; margin-bottom: 1.5rem; }
            .mt-2 { margin-top: 0.5rem; }
            .mb-1 { margin-bottom: 0.25rem; }
            .mb-2 { margin-bottom: 0.5rem; }
            .mb-3 { margin-bottom: 0.75rem; }
            .mb-6 { margin-bottom: 1.5rem; }
            .mt-6 { margin-top: 1.5rem; }
            .p-3 { padding: 0.75rem; }
            .p-6 { padding: 1.5rem; }
            .pt-2 { padding-top: 0.5rem; }
            .pt-4 { padding-top: 1rem; }
            .pt-6 { padding-top: 1.5rem; }
            .pb-2 { padding-bottom: 0.5rem; }
            .pb-4 { padding-bottom: 1rem; }
            .py-2 { padding-top: 0.5rem; padding-bottom: 0.5rem; }
            
            .border { border-width: 1px; }
            .border-t { border-top-width: 1px; }
            .border-b { border-bottom-width: 1px; }
            .border-t-2 { border-top-width: 2px; }
            .border-b-2 { border-bottom-width: 2px; }
            .border-gray-200 { border-color: #e5e7eb; }
            .border-gray-300 { border-color: #d1d5db; }
            .rounded-md { border-radius: 0.375rem; }
            
            .bg-white { background-color: #ffffff; }
            .bg-green-100 { background-color: #d1fae5; }
            .bg-yellow-100 { background-color: #fef3c7; }
            
            .text-gray-500 { color: #6b7280; }
            .text-gray-600 { color: #4b5563; }
            .text-gray-800 { color: #1f2937; }
            .text-green-600 { color: #059669; }
            .text-green-800 { color: #065f46; }
            .text-yellow-600 { color: #d97706; }
            .text-yellow-800 { color: #92400e; }
            .text-red-600 { color: #dc2626; }
            
            .grid { display: grid; }
            .grid-cols-2 { grid-template-columns: repeat(2, minmax(0, 1fr)); }
            .gap-4 { gap: 1rem; }
            
            .flex { display: flex; }
            .justify-between { justify-content: space-between; }
            
            .w-full { width: 100%; }
            .italic { font-style: italic; }
            
            table {
              width: 100%;
              border-collapse: collapse;
            }
            
            th, td {
              padding: 0.5rem;
              text-align: left;
            }
            
            th {
              font-weight: bold;
            }
          </style>
        </head>
        <body>
          <div class="print-container">
            ${summaryHTML}
          </div>
          <script>
            // Print and close
            window.onload = function() {
              window.print();
              window.parent.postMessage('print-complete', '*');
            };
          </script>
        </body>
        </html>
      `;
      
      // Write content to iframe and print
      const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
      iframeDoc.open();
      iframeDoc.write(printDocument);
      iframeDoc.close();
      
      // Listen for print completion
      const handleMessage = (event) => {
        if (event.data === 'print-complete') {
          document.body.removeChild(iframe);
          window.removeEventListener('message', handleMessage);
        }
      };
      
      window.addEventListener('message', handleMessage);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex justify-center items-center z-50 p-4">
      <Card className="w-full max-w-4xl max-h-[90vh] overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200 bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
              <MdReceipt className="text-blue-600 text-xl" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">Order Summary</h2>
              <p className="text-sm text-slate-600">Order #{Math.floor(new Date(orderInfo.orderDate).getTime())}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="primary"
              size="sm"
              onClick={handlePrint}
              icon={<MdPrint />}
            >
              Print Summary
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowOrderSummary(false)}
              icon={<MdClose />}
            >
              Close
            </Button>
          </div>
        </div>

        {/* Summary Content */}
        <div className="overflow-y-auto max-h-[calc(90vh-120px)] custom-scrollbar">
          <div className="p-6">
            <div ref={summaryRef}>
              <PrintableOrderSummary orderInfo={orderInfo} />
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="border-t border-slate-200 p-4 bg-slate-50">
          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-600">
              {orderInfo.isPaid ? (
                <span className="flex items-center gap-2 text-green-600">
                  <MdReceipt />
                  Payment completed - Order is paid
                </span>
              ) : (
                <span className="text-yellow-600">Payment pending - Order is not yet paid</span>
              )}
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default OrderSummaryModal;