const crypto = require('crypto');

function generateSignature(payload, secret) {
    const rawBody = typeof payload === 'string' ? payload : JSON.stringify(payload);
    return crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
}

module.exports = {
    generateSignature
};
