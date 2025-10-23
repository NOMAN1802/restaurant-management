import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

export const userManagementApi = createApi({
    reducerPath: 'userManagementApi',
    baseQuery: fetchBaseQuery({
        baseUrl: 'restaurant-management-tau-sable.vercel.app/api/',
        credentials: 'include',
    }),
    endpoints: (builder) => ({
        getAllUsers: builder.query({
            query: () => 'users',
            providesTags: ['Users'],
        }),
        getSingleUser: builder.query({
            query: (id) => `users/${id}`,
            providesTags: (result, error, id) => [{ type: 'Users', id }],
        }),
        updateUser: builder.mutation({
            query: ({ id, ...body }) => ({
                url: `users/${id}`,
                method: 'PUT',
                body,
            }),
            invalidatesTags: ['Users'],
        }),
        deleteUser: builder.mutation({
            query: (id) => ({
                url: `users/${id}`,
                method: 'DELETE',
            }),
            invalidatesTags: ['Users'],
        }),
    }),
});

export const {
    useGetAllUsersQuery,
    useGetSingleUserQuery,
    useUpdateUserMutation,
    useDeleteUserMutation,
} = userManagementApi;
