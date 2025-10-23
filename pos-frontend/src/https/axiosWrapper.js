import axios from "axios";

const defaultHeader = {
  "Content-Type": "application/json",
  Accept: "application/json",
};

export const axiosWrapper = axios.create({
  baseURL:
    import.meta.env.VITE_BACKEND_URL ||
    (import.meta.env.PROD
      ? 'http://localhost:5000'
      : 'http://localhost:5000'),
  withCredentials: true,
  headers: { ...defaultHeader },
});
