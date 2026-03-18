const _ = {};

_.randomFromArray = (arr = []) => {
    return arr[Math.floor(Math.random() * arr.length)];
}

_.sumArray = (arr = []) => {
    return arr.reduce((acc, cur) => acc + cur, 0);
}

_.averageArray = (arr = []) => {
    return _.sumArray(arr) / arr.length;
}

_.maxArray = (arr = []) => {
    return Math.max(...arr);
}

_.minArray = (arr = []) => {
    return Math.min(...arr);
}

_.min = (...args) => {
    return Math.min(...args);
}
_.max = (...args) => {
    return Math.max(...args);
}

_.shuffleArray = (arr = []) => {
    return arr.sort(() => Math.random() - 0.5);
}

_.randomBetween = (min = 0, max = 0) => {
    return Math.floor(Math.random() * (max - min + 1) + min);
}

_.delay = (ttl = 0) => new Promise((resolve) => setTimeout(resolve, ttl));

_.appendZero = (number) => {
    return number < 10 ? '0' + number : number;
};

_.isEmail = (email) => {
    const regeX = /[a-z0-9._%+-]+@[a-z0-9-]+[.]+[a-z]{2,5}$/;
    return !regeX.test(email);
};

_.getFirstCapital = (string = '') => {
    const strings = string.split(' ');
    const map = [];
    for (const str of strings) {
        if (str == '') continue;
        map.push(str[0].toUpperCase() + str.substring(1));
    }
    return map.join(' ');
};
_.appendSuffix = (string = '', length = 8, suffix = '..') => {
    return string.length > length ? string.substring(0, length) + suffix : string;
};

_.appendMoneySymbolFront = (amount, symbol = '₹') => {
    return symbol + amount;
};

_.appendMoneySymbolBack = (amount, symbol = '₹') => {
    return amount + symbol;
};

_.formatCurrency = (amount = 0) => {
    if (amount >= 1000000000) {
        return (amount / 1000000000).toFixed(1) + 'B';
    } else if (amount >= 1000000) {
        return (amount / 1000000).toFixed(1) + 'M';
    } else if (amount >= 1000) {
        return (amount / 1000).toFixed(1) + 'K';
    } else {
        return amount.toFixed(1);
    }
};

_.formatCurrencyWithComa = (amount = 0) => {
    if (amount > 99999) {
        return _.formatCurrency(amount);
    }
    const amountStr = amount.toString();
    const [integerPart, decimalPart] = amountStr.split('.');
    const formattedInteger = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    const formattedAmount = decimalPart ? `${formattedInteger}.${decimalPart.slice(0, 2)}` : formattedInteger;
    return formattedAmount;
};

_.getSeats = (mySeat = 0) => {
    const aSeats = [0, 1, 2, 3, 4, 5, 6, 7, 8];
    if (mySeat === 0) return aSeats;
    const firstPart = aSeats.slice(mySeat);
    const secondPart = aSeats.slice(0, mySeat);
    const rearrangedSeats = [...firstPart, ...secondPart];
    return rearrangedSeats;
}
_.copyToClipboard = (text) => {
    const tempInput = document.createElement("input");
    tempInput.value = text;
    document.body.appendChild(tempInput);
    tempInput.select();
    document.execCommand("copy");
    document.body.removeChild(tempInput);
    console.log("Copied to clipboard!");
}

export default _;