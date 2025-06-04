require('dotenv').config();

module.exports = {
    node: process.env.ELASTICSEARCH_NODE,
    auth: {
        apiKey: process.env.ELASTICSEARCH_API_KEY
    },
    tls: {
        rejectUnauthorized: false
    }
};