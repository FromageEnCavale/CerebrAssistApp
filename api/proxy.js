import Cerebras from '@cerebras/cerebras_cloud_sdk';

const apiKey = process.env.API_KEY;

if (!apiKey) {

    throw new Error('API key not configured');

}

const cerebrasClient = new Cerebras({ apiKey });

export default async function handler(req, res) {

    if (req.method !== 'POST') {

        res.status(405).json({ error: 'Method not allowed' });

        return;

    }

    const { messages } = req.body;

    if (!messages) {

        res.status(400).json({ error: 'No messages provided' });

        return;

    }

    res.setHeader('Content-Type', 'text/plain; charset=utf-8');

    try {

        const stream = await cerebrasClient.chat.completions.create({

            messages,

            model: 'llama-3.3-70b',

            stream: true,

        });

        for await (const chunk of stream) {

            const content = chunk.choices[0]?.delta?.content || '';

            res.write(content);

        }

        res.end();

    } catch (error) {

        console.error(error);

        res.write(`Error: ${error.message}`);

        res.end();

    }

}