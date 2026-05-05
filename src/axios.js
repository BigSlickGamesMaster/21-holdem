import axios from "axios";
import { removeToken } from "../src/helper/helper";
import { getCookie, ReactToastify } from "shared/utils";

function isLocalHostname(hostname = "") {
    return ["localhost", "127.0.0.1", "0.0.0.0"].includes(String(hostname).toLowerCase());
}

function getBrowserHostname() {
    if (typeof window === "undefined") return "";
    return window.location?.hostname || "";
}

function isValidApiEndpoint(url) {
    if (typeof url !== "string" || !url.trim()) return false;

    try {
        const parsedUrl = new URL(url);
        return parsedUrl.protocol === "http:" || parsedUrl.protocol === "https:";
    } catch {
        return false;
    }
}

export function getApiRoot(url = process.env.REACT_APP_API_ENDPOINT) {
    const configuredUrl = isValidApiEndpoint(url) ? url : "";

    if (!configuredUrl) return "";
    if (process.env.NODE_ENV !== "development") return configuredUrl.replace(/\/$/, "");

    const browserHostname = getBrowserHostname();
    if (!browserHostname || isLocalHostname(browserHostname)) return configuredUrl.replace(/\/$/, "");

    try {
        const parsedUrl = new URL(configuredUrl);
        return parsedUrl.toString().replace(/\/$/, "");
    } catch {
        return "";
    }
}

export function setUrl(url = process.env.REACT_APP_API_ENDPOINT, options = { prod: false }) {
    const resolvedUrl = getApiRoot(url);
    const configuredUrl = isValidApiEndpoint(resolvedUrl) ? resolvedUrl : "";
    const defaultUrl = "";

    if (options.prod) return configuredUrl || defaultUrl;
    if (process.env.NODE_ENV === "development") return configuredUrl || defaultUrl;
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
        const isGuestRoute = typeof window !== 'undefined' && window.location?.pathname?.startsWith('/guest');
        if (err?.code?.includes?.("ERR_NETWORK")) {
            ReactToastify("Network Error", "error");
            if (!isGuestRoute) {
                removeToken();
                setTimeout(() => {
                    window.location.href = "/login";
                }, 2200);
            }
            return Promise.reject(err);
        }
        if (err?.response?.status === 401) {
            if (!isGuestRoute) {
                removeToken();
                window.location.href = "/login";
            }
            return Promise.reject(err);
        }
        return Promise.reject(err);
    }
);

export default Axios;
