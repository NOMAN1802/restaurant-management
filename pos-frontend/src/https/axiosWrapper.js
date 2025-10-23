import axios from "axios";

const defaultHeader = {
  "Content-Type": "application/json",
  Accept: "application/json",
};

const backendUrl ='https://restaurant-management-tau-sable.vercel.app';

export const axiosWrapper = axios.create({
  baseURL: backendUrl,
  withCredentials: true,
  headers: { ...defaultHeader },
});

// Add request interceptor to ensure absolute URLs
axiosWrapper.interceptors.request.use((config) => {
  // Ensure the URL doesn't get concatenated incorrectly
  if (!config.url.startsWith('http')) {
    config.url = `${backendUrl}${config.url}`;
  }
  return config;
});
