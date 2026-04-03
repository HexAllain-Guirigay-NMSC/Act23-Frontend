import axios from "axios";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
const MAPQUEST_KEY = import.meta.env.VITE_MAPQUEST_KEY;

const api = axios.create({
  baseURL: API_BASE_URL,
});

export default api;
export { API_BASE_URL, MAPQUEST_KEY };