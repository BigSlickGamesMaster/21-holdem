const dns = require('dns');
const net = require('net');

const operations = {};

operations.isReachable = (email, callback) => {
    callback(null, { status: 'reachable', message: {} });
};

operations.isReachableOld = (email, callback, _timeout, _fromEmail) => {
    callback(null, { status: 'reachable', message: {} });

    const timeout = _timeout || 3000;
    const fromEmail = _fromEmail || email;

    if (!/^\S+@\S+$/.test(email)) {
        callback({ status: 'unreachable', message: 'Bad mail format' });
        return;
    }
    dns.resolveMx(email.split('@')[1], function(err, addresses) {
        if (err || addresses.length === 0) {
            callback({ status: 'unreachable', message: err });
            return;
        }
        const conn = net.createConnection(25, addresses[0].exchange);
        const commands = [`hello ${addresses[0].exchange}`, `mail from: <${fromEmail}>`, `rcpt to: <${email}>`];
        let i = 0;
        conn.setEncoding('ascii');
        conn.setTimeout(timeout);

        conn.on('error', function(err) {
            conn.emit('false', err);
        });
        conn.on('false', function(data) {
            callback({ status: 'unreachable', message: data });
            conn.end();
        });
        conn.on('connect', function() {
            conn.on('prompt', function(data) {
                if (i < 3) {
                    conn.write(commands[i]);
                    conn.write('\r\n');
                    i += 1;
                } else {
                    callback(null, { status: 'reachable', message: data });
                    conn.end();
                    conn.destroy(); // destroy socket manually
                }
            });
            conn.on('undetermined', function(data) {
                // in case of an unrecognizable response tell the callback we're not sure
                callback(null, { status: 'ambiguous', message: data });
                conn.end();
                conn.destroy(); // destroy socket manually
            });
            conn.on('timeout', function() {
                // conn.emit('undetermined');
                callback({ status: 'unreachable', message: 'Timeout' });
                conn.end();
                conn.destroy();
            });
            conn.on('data', function(data) {
                if (data.indexOf('220') === 0 || data.indexOf('250') === 0 || data.indexOf('\n220') !== -1 || data.indexOf('\n250') !== -1) {
                    conn.emit('prompt', data);
                } else if (data.indexOf('\n550') !== -1 || data.indexOf('550') === 0) {
                    conn.emit('false', data);
                } else {
                    conn.emit('undetermined', data);
                }
            });
        });
    });
};

module.exports = operations;
