import { createSlice } from "@reduxjs/toolkit";

const initialState = [];

const cartSlice = createSlice({
    name : "cart",
    initialState,
    reducers : {
        addItems : (state, action) => {
            state.push(JSON.parse(JSON.stringify(action.payload))); // Deep clone to ensure serializability
        },

        removeItem: (state, action) => {
            return state.filter(item => item.id != action.payload);
        },

        removeAllItems: (state) => {
            return [];
        },
        incrementQuantity: (state, action) => {
            const item = state.find(item => item.id === action.payload);
            if (item) {
                item.quantity += 1;
                item.price = item.pricePerQuantity * item.quantity;
            }
        },
        decrementQuantity: (state, action) => {
            const item = state.find(item => item.id === action.payload);
            if (item) {
                item.quantity -= 1;
                item.price = item.pricePerQuantity * item.quantity;
                if (item.quantity <= 0) {
                    return state.filter(item => item.id !== action.payload);
                }
            }
        },
        setCart: (state, action) => {
            return action.payload;
        }
    }
})

export const getTotalPrice = (state) => state.cart.reduce((total, item) => total + item.price, 0);
export const { addItems, removeItem, removeAllItems, setCart } = cartSlice.actions;
export const { incrementQuantity, decrementQuantity } = cartSlice.actions; // Export new actions
export default cartSlice.reducer;