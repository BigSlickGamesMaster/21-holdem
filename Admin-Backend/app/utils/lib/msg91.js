const querystring = require('querystring');

function Msg91() {
    this.verification = () => `6058334b492067241206f07d`; // `5df1f9e7d6fc0563916f3a24`;
    this.forgotPassword = () => `605893d5bc0f0541ab71c1b2`;
    this.loggingNewDevice = () => `6066fa692cb7e256f8632dcd`;
}

Msg91.prototype.sendOTP = function(type, body, callback) {
    // if (process.env.NODE_ENV !== 'prod') return callback();
    return new Promise((resolve, reject) => {
        const qstr = querystring.stringify({
            invisible: 1,
            otp: body.nOTP,
            authkey: process.env.MSG91_API_KEY,
            mobile: body.sMobile,
            template_id: type(body),
            otp_expiry: 10,
        });

        const options = {
            method: 'GET',
            hostname: 'api.msg91.com',
            port: null,
            path: `/api/v5/otp?${qstr}`,
            isSecure: true,
            headers: {
                'content-type': 'application/json',
            },
        };

        const data = { company_name: 'pokerjack' };

        _.request(data, options, (error, response) => {
            log.red('error ::', error);
            log.red('responnse ::', response);
            if (error) return callback ? callback(error) : reject(error);
            return callback ? callback(null, response) : resolve(response);
        });
    });
};

Msg91.prototype.verifyOTP = function(type, body, callback) {
    if (process.env.NODE_ENV !== 'prod') return callback();
    return new Promise((resolve, reject) => {
        const qstr = querystring.stringify({
            authkey: process.env.MSG91_API_KEY,
            mobile: body.sMobile.slice(3),
        });

        const options = {
            method: 'POST',
            hostname: 'api.msg91.com',
            port: null,
            path: `/api/v5/otp/verify?${qstr}`,
            headers: {},
        };

        const data = { company_name: 'pokerjack' };

        _.request(data, options, (error, response) => {
            if (error) return callback ? callback(error) : reject(error);
            return callback ? callback(null, response) : resolve(response);
        });
    });
};

Msg91.prototype.send = function(type, body, callback) {
    if (process.env.NODE_ENV !== 'prod') return callback();
    return new Promise((resolve, reject) => {
        const options = {
            method: 'POST',
            hostname: 'api.msg91.com',
            path: '/api/v2/sendsms?country=91',
            headers: {
                authkey: process.env.MSG91_API_KEY,
                'content-type': 'application/json',
            },
        };

        const data = { sender: 'SOCKET', route: '4', country: '91', sms: [{ message: type(body), to: [body.sMobile.slice(3)] }] };

        _.request(data, options, (error, response) => {
            if (error) return callback ? callback(error) : reject(error);
            return callback ? callback(null, response) : resolve(response);
        });
    });
};

module.exports = new Msg91();
