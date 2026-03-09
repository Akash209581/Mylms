
const axios = require('axios');

async function reproduce() {
    try {
        // Note: This won't work without cookies/auth, but I want to see if I can at least hit it
        const res = await axios.put('http://localhost:3001/question-bank/8', {
            type: 'PQ',
            topicNames: 'Arrays',
            difficulty: 'EASY',
            questionText: 'Test question',
            problemStatement: 'Test statement',
            allowedLanguages: ['Python']
        });
        console.log('Response:', res.status);
    } catch (err: any) {
        console.error('Reproduce failed:', err.response ? err.response.status : err.message);
        if (err.response) console.log('Data:', err.response.data);
    }
}

reproduce();
