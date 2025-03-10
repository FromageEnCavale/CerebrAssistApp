// Marked.js
/*import { marked } from 'https://cdn.jsdelivr.net/npm/marked@15.0.7/+esm';*/

import dompurify from 'https://cdn.jsdelivr.net/npm/dompurify@3.2.4/+esm';

const deleteButton = document.getElementById("deleteButton");

const messagesContainer = document.getElementById('messagesContainer');

const userInput = document.getElementById('userInput');

const sendButtonContainer = document.getElementById('sendButtonContainer');

const sendButton = document.getElementById('sendButton');

let conversationHistory = [];

let maxCharacters = 8000;

function parseMarkdown(text) {

    // Marked.js
    /*const rawHTML = marked(text);*/

    // New
    /*const paragraphs = text.split(/\n\s*\n/);*/

    // 1. Gestion des blocs de code multi-lignes (entre triple backticks)
    text = text.replace(/```([\s\S]*?)```/g, function(match, codeContent) {
        return `<pre><code>${codeContent}</code></pre>`;
    });

    // 2. Titres (Headers) : de "# Titre" à "###### Titre"
    // On ajoute un saut de ligne ("\n") à la fin pour forcer la séparation avec le paragraphe suivant
    text = text.replace(/^(#{1,6})\s+(.*)$/gm, function(match, hashes, title) {
        const level = hashes.length;
        return `<h${level}>${title}</h${level}>\n`;
    });

    // 3. Règles horizontales (Horizontal rules) : '---' ou '***'
    text = text.replace(/^\s*(\*{3,}|-{3,})\s*$/gm, '<hr>');

    // 4. Blockquotes (Citations) : lignes commençant par '>'
    text = text.replace(/^\s*>+\s?(.*)$/gm, '<blockquote>$1</blockquote>');

    // 5. Listes non ordonnées :
    //    - Convertit les lignes débutant par '-', '+' ou '*' en éléments de liste <li>
    text = text.replace(/^(?:-|\+|\*)\s+(.*)$/gm, '<li>$1</li>');
    //    - Enveloppe les éléments <li> consécutifs dans une balise <ul>
    text = text.replace(/((<li>.*<\/li>\n?)+)/g, function(match) {
        return `<ul>\n${match}\n</ul>`;
    });

    // 6. Listes ordonnées :
    //    - Convertit les lignes commençant par un numéro suivi d'un point en <li>
    text = text.replace(/^\d+\.\s+(.*)$/gm, '<li>$1</li>');
    //    - Enveloppe les éléments <li> consécutifs dans une balise <ol>, sauf s'ils sont déjà dans une <ul>
    text = text.replace(/((<li>.*<\/li>\n?)+)/g, function(match) {
        if (match.includes('<ul>')) return match;
        return `<ol>\n${match}\n</ol>`;
    });

    // 7. Code inline : texte entouré par un seul backtick `code`
    text = text.replace(/`([^`]+)`/g, '<code>$1</code>');

    // 8. Texte en gras : **gras** ou __gras__
    text = text.replace(/(\*\*|__)(.*?)\1/g, '<strong>$2</strong>');

    // 9. Texte en italique : *italique* ou _italique_
    text = text.replace(/(\*|_)(.*?)\1/g, '<em>$2</em>');

    // 10. Liens : [texte](url)
    text = text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');

    // 11. Images : ![alt](url)
    text = text.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" />');

    // 12. Gestion des paragraphes :
    //     Découpe le texte en utilisant deux retours à la ligne consécutifs,
    //     puis enveloppe chaque bloc dans une balise <p> si ce n'est pas déjà un élément block-level.
    const paragraphs = text.split(/\n\s*\n/);
    text = paragraphs.map(p => {
        const trimmed = p.trim();
        if (trimmed === '') {
            return ''; // Ignorer les paragraphes vides
        } else if (/^(<h\d>|<ul>|<ol>|<pre>|<blockquote>|<hr>)/.test(trimmed)) {
            return trimmed; // Conserver les éléments de bloc existants
        } else {
            return `<p>${trimmed}</p>`; // Envelopper le contenu dans une balise <p>
        }
    }).join('\n');

    // New
    const rawHTML = paragraphs.map(paragraph => `<p>${paragraph}</p>`).join('');

    return dompurify.sanitize(rawHTML, { FORBID_ATTR: ['style'] });

}

function calculateHistorySize(history) {

    return history.reduce((total, message) => {

        return total + message.role.length + message.content.length;

    }, 0);

}

function adjustHistory() {

    while (conversationHistory.length > 1 && calculateHistorySize(conversationHistory) > maxCharacters) {

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

const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

userInput.addEventListener('keydown', (e) => {

    if (isMobile) return;

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