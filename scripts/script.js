import { marked } from 'https://cdn.jsdelivr.net/npm/marked@15.0.7/+esm'
import dompurify from 'https://cdn.jsdelivr.net/npm/dompurify@3.2.4/+esm'

const deleteButton = document.getElementById("deleteButton");

const messagesContainer = document.getElementById('messagesContainer');

const userInput = document.getElementById('userInput');

const sendButtonContainer = document.getElementById('sendButtonContainer');

const sendButton = document.getElementById('sendButton');

let conversationHistory = [];

let maxMessages = 20;

function parseMarkdown(text) {

    const rawHTML = marked(text);

    return dompurify.sanitize(rawHTML, { FORBID_ATTR: ['style'] });

}

function adjustHistory() {

    while (conversationHistory.length > maxMessages) {

        conversationHistory.shift();

    }

}

function addMessage(role, content) {

    const messageDiv = document.createElement('div');

    messageDiv.className = `message ${role}`;

    messageDiv.textContent = content;

    messagesContainer.appendChild(messageDiv);

    messagesContainer.scrollTop = messagesContainer.scrollHeight;

    return messageDiv;

}

async function sendMessage() {

    const userMessage = userInput.value;

    if (!userMessage) return;

    conversationHistory.push({ role: 'user', content: userMessage });

    addMessage('user', userMessage);

    userInput.value = '';

    userInput.style.height = 'auto';

    sendButtonContainer.classList.remove('expanded');

    adjustHistory();

    const responseElement = addMessage('assistant', '');

    try {

        const response = await fetch('/api/proxy', {

            method: 'POST',

            headers: { 'Content-Type': 'application/json' },

            body: JSON.stringify({ messages: conversationHistory })

        });

        const reader = response.body.getReader();

        const decoder = new TextDecoder();

        let responseText = '';

        while (true) {

            const { done, value } = await reader.read();

            if (done) break;

            const chunk = decoder.decode(value);

            responseText += chunk;

            responseElement.innerHTML = parseMarkdown(responseText);

        }

        conversationHistory.push({ role: 'assistant', content: responseText });

        adjustHistory();

    } catch (error) {

        responseElement.textContent = 'Error: ' + error.message;

        console.error(error);

    }

}

userInput.addEventListener('input', function () {

    this.style.height = 'auto';

    const newHeight = Math.min(this.scrollHeight, 200);

    this.style.height = newHeight + 'px';

    sendButtonContainer.classList.toggle('expanded', newHeight > 54);

});

userInput.addEventListener('keydown', (e) => {

    if (e.key === 'Enter' && !e.shiftKey) {

        e.preventDefault();

        sendMessage();

    }

});

deleteButton.addEventListener("click", () => {

    conversationHistory = [];

    messagesContainer.innerHTML = '';

});

sendButton.addEventListener('click', sendMessage);