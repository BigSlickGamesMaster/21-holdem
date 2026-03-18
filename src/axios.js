import axios from "axios";
import { removeToken } from "../src/helper/helper";
import { getCookie, ReactToastify } from "shared/utils";

const DEFAULT_DEV_API_ENDPOINT = "http://localhost:4000";

function isValidApiEndpoint(url) {
    if (typeof url !== "string" || !url.trim()) return false;

    try {
        const parsedUrl = new URL(url);
        return parsedUrl.protocol === "http:" || parsedUrl.protocol === "https:";
    } catch {
        return false;
    }
}

export function setUrl(url = process.env.REACT_APP_API_ENDPOINT, options = { prod: false }) {
    const configuredUrl = isValidApiEndpoint(url) ? url : "";
    const defaultUrl = process.env.NODE_ENV === "development" ? DEFAULT_DEV_API_ENDPOINT : "";

    if (options.prod) return configuredUrl || defaultUrl;
    if (process.env.NODE_ENV === "development") return configuredUrl || DEFAULT_DEV_API_ENDPOINT;
    return configuredUrl || defaultUrl;
}

const Axios = axios.create({
    // just set prod to true for using production server
    baseURL: setUrl(process.env.REACT_APP_API_ENDPOINT, { prod: false }),
    
});

Axios.interceptors.request.use(
    (req) => {
        const token = getCookie("sAuthToken");
        if (!req.headers.Authorization && token) {
            req.headers.Authorization = token;
            return req;
        }
        return req;
    },
    (err) => {
        return Promise.reject(err);
    }
);
Axios.interceptors.response.use(
    (res) => {
        return res;
    },
    (err) => {
        if (err?.code?.includes?.("ERR_NETWORK")) {
            ReactToastify("Network Error", "error");
            removeToken();
            setTimeout(() => {
                window.location.href = "/login";
            }, 2200);
            return Promise.reject(err);
        }
        if (err?.response?.status === 401) {
            removeToken();
            window.location.href = "/login";
            return Promise.reject(err);
        }
        return Promise.reject(err);
    }
);

export default Axios;
