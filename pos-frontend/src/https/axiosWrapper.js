import axios from "axios";

const defaultHeader = {
  "Content-Type": "application/json",
  Accept: "application/json",
};

export const axiosWrapper = axios.create({
  baseURL:
    import.meta.env.VITE_BACKEND_URL ||
    (import.meta.env.PROD
      ? 'restaurant-management-tau-sable.vercel.app'
      : 'restaurant-management-tau-sable.vercel.app'),
  withCredentials: true,
  headers: { ...defaultHeader },
});
