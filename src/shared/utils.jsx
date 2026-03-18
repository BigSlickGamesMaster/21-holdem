import { Bounce, toast } from "react-toastify"

export const parseParams = (params = '') => {
    const urlParams = new URLSearchParams(params)
    const array = [
        'size',
        'search',
        'pageNumber',
        'aFilters',
        'aStatusFiltersInput',
        'aStatus',
        'aCountryFilter',
        'aRoleFilter',
        'aCodeFilters',
        'eDesignationFilter',
        'aCategoryFilters',
        'aTagFilters',
        'aFilter',
        'eState',
        'aState',
        'aTeamTagFilters',
        'aVenueTagFilters',
        'aSeriesFilters',
        'aAuthorsFilters',
        'aType',
        'eGender',
        'eType',
        "eCategory",
        "userType"
    ]
    const value = Object.fromEntries(urlParams.entries())
    Object.keys(value).forEach((key) => {
        if (array.includes(key)) {
            value[key] = value[key].split(',')
        }
    })
    return value
}

export const appendParams = (value) => {
    // const params = parseParams(location.search)
    // const data = { ...params, ...value }
    // Object.keys(data).filter((e) => (data[e] === '' || !data[e].toString().length) && delete data[e])
    // window.history.pushState({}, null, `${location.pathname}?${new URLSearchParams(data).toString()}`)
}

export const range = (start, end) => {
    const length = end - start + 1
    return Array.from({ length }, (_, index) => index + start)
}

export const ReactToastify = (msg, type, customId) => {
    switch (type) {
        case 'success':
            toast.success(msg, {
                position: "top-right",
                autoClose: 2000,
                hideProgressBar: false,
                closeOnClick: true,
                pauseOnHover: false,
                draggable: true,
                theme: "light",
                transition: Bounce,
            })
            break;
        case 'error':
            toast.error(msg, {
                position: "top-right",
                autoClose: 2000,
                hideProgressBar: false,
                closeOnClick: true,
                pauseOnHover: false,
                draggable: true,
                theme: "light",
                transition: Bounce,
                toastId: customId
            })
            break;
        default:
            break;
    }
}

export function formatMilliseconds(ms) {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    const remainingMinutes = minutes % 60;
    const remainingSeconds = seconds % 60;

    const formattedHours = hours > 0 ? `${hours}h ` : '';
    const formattedMinutes = remainingMinutes > 0 ? `${remainingMinutes}m ` : '';
    const formattedSeconds = remainingSeconds > 0 ? `${remainingSeconds}s` : '';

    return `${formattedHours}${formattedMinutes}${formattedSeconds}`.trim();
}

export function setCookie(name, value, days) {
    let expires = "";
    if (days) {
        const date = new Date();
        date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
        expires = "; expires=" + date.toUTCString();
    }
    document.cookie = name + "=" + (value || "") + expires + "; path=/";
}

export function getCookie(name) {
    const nameEQ = name + "=";
    const ca = document.cookie.split(';');
    for (let i = 0; i < ca.length; i++) {
        let c = ca[i];
        while (c.charAt(0) === ' ') c = c.substring(1, c.length);
        if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length, c.length);
    }
    return null;
}

export function removeCookie(name) {
    document.cookie = name + '=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT;';
}

export function formatIndianNumber(amount) {
    // Convert the number to a string with up to 2 decimal places
    let numStr = parseFloat(amount).toFixed(2);

    // Split the number into whole and decimal parts
    let parts = numStr.split('.');
    let wholePart = parts[0];
    let decimalPart = parts[1] === '00' ? '' : '.' + parts[1]; // Show decimal part only if it's not .00

    // Format the whole part according to Indian numbering system
    let lastThreeDigits = wholePart.slice(-3);
    let otherDigits = wholePart.slice(0, -3);

    if (otherDigits !== '') {
        lastThreeDigits = ',' + lastThreeDigits;
    }

    let indianFormattedNumber = otherDigits.replace(/\B(?=(\d{2})+(?!\d))/g, ',') + lastThreeDigits;

    // Return the formatted number with the optional decimal part
    return indianFormattedNumber + decimalPart;
}

export function formatDate(dateString) {
    if (dateString === undefined) return '-'
    const date = new Date(dateString);
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    const month = monthNames[date.getMonth()];
    const day = date.getDate();
    const year = date.getFullYear();
    let hours = date.getHours();

    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12 || 12;

    const minutes = date.getMinutes().toString().padStart(2, '0');
    const formattedDate = `${month} ${day}, ${year} ${hours}:${minutes} ${ampm}`;

    return formattedDate;
}