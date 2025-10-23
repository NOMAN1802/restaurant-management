import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

const API_BASE_URL = (import.meta.env.VITE_BACKEND_URL || 'restaurant-management-tau-sable.vercel.app') + '/api';

export const orderApi = createApi({
  reducerPath: 'orderApi',
  baseQuery: fetchBaseQuery({
    baseUrl: API_BASE_URL,
    credentials: 'include',
  }),
  tagTypes: ['Order'],
  endpoints: (builder) => ({
    getOrder: builder.query({
      query: (id) => `/order/${id}`,
      providesTags: (result, error, id) => [{ type: 'Order', id }],
    }),
    getOrders: builder.query({
      query: () => '/order',
      providesTags: ['Order'],
    }),
    createOrder: builder.mutation({
      query: (body) => ({
        url: 'order',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Order'],
    }),
    updateOrder: builder.mutation({
      query: ({ orderId, ...updateData }) => ({
        url: `/order/${orderId}`,
        method: 'PUT',
        body: updateData,
      }),
      invalidatesTags: (result, error, { orderId }) => [{ type: 'Order', id: orderId }, 'Order'],
    }),
    deleteOrder: builder.mutation({
      query: (id) => ({
        url: `order/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Order'],
    }),
    addItemToOrder: builder.mutation({
      query: ({ orderId, items, orderType, table, bills }) => ({
        url: `/order/${orderId}/items`,
        method: 'PUT',
        body: { items, orderType, table, bills },
      }),
      invalidatesTags: (result, error, { orderId }) => [{ type: 'Order', id: orderId }, 'Order'],
    }),
    updateOrderItems: builder.mutation({
      query: ({ orderId, ...updateData }) => ({
        url: `/order/${orderId}`,
        method: 'PATCH',
        body: updateData,
      }),
      invalidatesTags: (result, error, { orderId }) => [{ type: 'Order', id: orderId }, 'Order'],
    }),
  }),
});

export const {
  useGetOrderQuery,
  useGetOrdersQuery,
  useCreateOrderMutation,
  useUpdateOrderMutation,
  useDeleteOrderMutation,
  useAddItemToOrderMutation,
  useUpdateOrderItemsMutation,
} = orderApi;