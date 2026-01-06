import React, { useState, useRef, useEffect } from 'react';

const Chatbot = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState([
        { role: 'ai', text: 'Hi! I’m here to help you understand the Zero Hunger platform.' }
    ]);
    const [input, setInput] = useState('');
    const messagesEndRef = useRef(null);

    const knowledgeBase = {
        overview: "The Zero Hunger platform is created to reduce food waste and help people who are hungry by connecting food donors, food receivers, and volunteers through a single digital system. It's built for social good and does not focus on profit.",
        whoCanUse: "The platform has three main types of users: Donors (restaurants, organizers, individuals), Receivers (people/groups in need), and Volunteers (verified individuals who collect and deliver food).",
        howToDonate: "1. Log in to the platform.\n2. Go to the 'Donate Food' section.\n3. Enter details (type, quantity, location).\n4. Submit the request for volunteers to see.",
        allowedFood: "Allowed: Fresh, unused, and untouched surplus food from restaurants, events, or households.\nNot Allowed: Leftover food from plates, partially eaten food, expired food, or food stored for too long.",
        howToReceive: "People in need can use the 'Receive Food' section to request based on availability. The platform connects them with nearby donations.",
        volunteer: "Verified volunteers collect food from donors and deliver it to receivers within safe time limits while following hygiene guidelines.",
        safety: "Food safety is a top priority. Plate leftovers and expired food are strictly rejected. Downloads must be collected and delivered within safe time limits.",
        cost: "The Zero Hunger platform is completely free for everyone. It exists only for social impact.",
    };

    const getResponse = (query) => {
        const q = query.toLowerCase().trim();

        // Greetings
        if (/^(hi|hello|hey|heyy|hii|good morning|good evening)$/.test(q)) {
            return "Hello! 👋 How can I help you with the Zero Hunger platform today?";
        }

        // Rude language (Basic check)
        const rudeWords = ['bad', 'stupid', 'idiot', 'shut up', 'hate'];
        if (rudeWords.some(word => q.includes(word))) {
            return "Let’s keep things respectful. I can help you with information about the platform.";
        }

        // Platform related questions
        if (q.includes('donate') || q.includes('how to give') || q.includes('share food')) {
            return knowledgeBase.howToDonate;
        }
        if (q.includes('receive') || q.includes('get food') || q.includes('need food')) {
            return knowledgeBase.howToReceive;
        }
        if (q.includes('volunteer') || q.includes('deliver') || q.includes('collector')) {
            return knowledgeBase.volunteer;
        }
        if (q.includes('what is') || q.includes('about') || q.includes('overview') || q.includes('platform')) {
            return knowledgeBase.overview;
        }
        if (q.includes('safety') || q.includes('hygiene') || q.includes('rules') || q.includes('expired') || q.includes('leftover')) {
            return knowledgeBase.safety + " " + knowledgeBase.allowedFood;
        }
        if (q.includes('cost') || q.includes('free') || q.includes('charge')) {
            return knowledgeBase.cost;
        }
        if (q.includes('who') && (q.includes('use') || q.includes('join'))) {
            return knowledgeBase.whoCanUse;
        }

        // Short or unclear
        if (q.length < 5 || q === 'why' || q === 'how' || q === 'what') {
            return "Could you please tell me a bit more so I can help you better?";
        }

        // Unrelated
        return "I’m here to help only with questions related to the Zero Hunger platform. I can help with questions about donating food, receiving food, safety rules, or volunteers.";
    };

    const handleSend = () => {
        if (!input.trim()) return;

        const userMessage = { role: 'user', text: input };
        setMessages(prev => [...prev, userMessage]);

        const responseText = getResponse(input);
        const aiMessage = { role: 'ai', text: responseText };

        setTimeout(() => {
            setMessages(prev => [...prev, aiMessage]);
        }, 500);

        setInput('');
    };

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    return (
        <div className="fixed bottom-5 right-5 z-50 flex flex-col items-end">
            {isOpen && (
                <div className="mb-4 w-80 sm:w-96 h-[450px] bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-gray-100 animate-in fade-in slide-in-from-bottom-4 duration-300">
                    <div className="bg-orange-500 p-4 text-white flex justify-between items-center shadow-md">
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
                                🤖
                            </div>
                            <h3 className="font-semibold text-lg">Help Assistant</h3>
                        </div>
                        <button
                            onClick={() => setIsOpen(false)}
                            className="text-white hover:text-gray-200 transition-colors p-1"
                        >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50/50">
                        {messages.map((m, i) => (
                            <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                <div className={`max-w-[80%] p-3 rounded-2xl shadow-sm text-sm ${m.role === 'user'
                                        ? 'bg-orange-600 text-white rounded-tr-none'
                                        : 'bg-white text-gray-800 rounded-tl-none border border-gray-100'
                                    }`}>
                                    {m.text}
                                </div>
                            </div>
                        ))}
                        <div ref={messagesEndRef} />
                    </div>

                    <div className="p-4 border-t border-gray-100 bg-white">
                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                                placeholder="Type a message..."
                                className="flex-1 p-2 border border-gray-200 rounded-lg focus:outline-none focus:border-orange-500 text-sm"
                            />
                            <button
                                onClick={handleSend}
                                className="bg-orange-500 text-white p-2 rounded-lg hover:bg-orange-600 transition-all shadow-md active:scale-95"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                                </svg>
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`w-14 h-14 rounded-full shadow-lg flex items-center justify-center transition-all duration-300 transform hover:scale-110 active:scale-90 ${isOpen ? 'bg-gray-100 text-gray-600 rotate-90' : 'bg-orange-500 text-white'
                    }`}
            >
                {isOpen ? (
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                ) : (
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                    </svg>
                )}
            </button>
        </div>
    );
};

export default Chatbot;
