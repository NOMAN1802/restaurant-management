import { createSlice } from "@reduxjs/toolkit";

const initialState = {
    orderId: "",
    serialNumber: "",
    guests: 0,
    table: null,
    seats: [],
    orderType: "Dine In",
    pendingTableSelection: null // For storing table selection before order creation
}


const customerSlice = createSlice({
    name : "customer",
    initialState,
    reducers : {
        setCustomer: (state, action) => {
            console.log("setCustomer action.payload:", action.payload);
            const { serialNumber, guests, table, orderType, orderId, seats } = action.payload;
            state.orderId = orderId || ""; 
            state.serialNumber = serialNumber || "";
            state.guests = guests;
            state.table = table || null;
            state.seats = seats || [];
            state.orderType = orderType || "Dine In";
        },

        removeCustomer: (state) => {
            state.guests = 0;
            state.table = null;
            state.seats = [];
        },

        updateTable: (state, action) => {
            state.table = action.payload.table;
            state.seats = action.payload.seats;
        },

        setOrderType: (state, action) => {
            state.orderType = action.payload;
        },

        setPendingTableSelection: (state, action) => {
            state.pendingTableSelection = action.payload;
        },

        clearPendingTableSelection: (state) => {
            state.pendingTableSelection = null;
        },

        applyPendingTableSelection: (state) => {
            if (state.pendingTableSelection) {
                state.table = state.pendingTableSelection.table;
                state.seats = state.pendingTableSelection.seats;
                state.pendingTableSelection = null;
            }
        }

    }
})

export const { setCustomer, removeCustomer, updateTable, setOrderType, setPendingTableSelection, clearPendingTableSelection, applyPendingTableSelection } = customerSlice.actions;
export default customerSlice.reducer;