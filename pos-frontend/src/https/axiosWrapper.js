import axios from "axios";

const defaultHeader = {
  "Content-Type": "application/json",
  Accept: "application/json",
};

export const axiosWrapper = axios.create({
  baseURL: import.meta.env.VITE_BACKEND_URL || 'https://restaurant-management-mlm6.vercel.app',
  withCredentials: true,
  headers: { ...defaultHeader },
});
