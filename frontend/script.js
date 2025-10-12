// DOM elements
const initialForm = document.getElementById('initialForm');
const startBtn = document.getElementById('startConsultationBtn');
const initialSymptoms = document.getElementById('symptoms');
const clearBtn = document.getElementById('clearBtn');

const questionsForm = document.getElementById('questionsForm');
const questionsContainer = document.getElementById('questionsList');
const submitAnswersBtn = document.getElementById('submitAnswersBtn');
const backToInitialBtn = document.getElementById('backBtn');

const resultsSection = document.getElementById('result');
const conditionsEl = document.getElementById('conditions');
const recommendationsEl = document.getElementById('recommendations');
const disclaimerEl = document.getElementById('disclaimer');

const historyListEl = document.getElementById('historyList');
const loadingEl = document.getElementById('loading');

// Global consultation state
let consultationState = {
    conversationId: null,
    initialSymptoms: '',
    questions: [],
    answers: [],
    isActive: false
};

console.log('Healthcare Consultation System loaded');

// Show/hide loading state
function showLoading(show) {
    loadingEl.classList.toggle('hidden', !show);
    startBtn.disabled = show;
    submitAnswersBtn.disabled = show;
}

// Show specific section and hide others
function showSection(sectionName) {
    // Hide all sections
    initialForm.classList.add('hidden');
    questionsForm.classList.add('hidden');
    resultsSection.classList.add('hidden');
    
    // Show the requested section
    switch(sectionName) {
        case 'initial':
            initialForm.classList.remove('hidden');
            break;
        case 'questions':
            questionsForm.classList.remove('hidden');
            break;
        case 'results':
            resultsSection.classList.remove('hidden');
            break;
    }
}

// Start consultation with initial symptoms
startBtn.addEventListener('click', async () => {
    const symptoms = initialSymptoms.value.trim();
    
    if (!symptoms) {
        alert('Please describe your symptoms before starting the consultation.');
        return;
    }
    
    showLoading(true);
    
    try {
        const response = await fetch('http://127.0.0.1:8000/analyze_symptoms', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                symptoms: symptoms,
                conversation_history: [],
                is_followup: false
            })
        });
        
        const rawText = await response.text();
        console.log('Start consultation response:', response.status, rawText);
        
        if (!response.ok) {
            throw new Error(rawText || `Server error: ${response.status}`);
        }
        
        let data;
        try {
            data = JSON.parse(rawText);
        } catch (parseError) {
            console.error('JSON parse error:', parseError);
            throw new Error('Invalid response from server');
        }
        
        console.log('Parsed response:', data);
        
        // Check response type and handle accordingly
        if (data.response_type === 'questions' && data.questions && data.questions.length > 0) {
            // Store consultation state
            consultationState = {
                conversationId: data.conversation_id || generateConversationId(),
                initialSymptoms: symptoms,
                questions: data.questions,
                answers: new Array(data.questions.length).fill(''),
                isActive: true
            };
            
            console.log('Consultation state initialized:', consultationState);
            renderQuestions(data.questions);
            showSection('questions');
        } else {
            // Direct to results if no questions or different response type
            renderResults(data);
            showSection('results');
        }
        
    } catch (error) {
        console.error('Consultation error:', error);
        alert('Error: ' + error.message);
    } finally {
        showLoading(false);
    }
});

// Generate a simple conversation ID
function generateConversationId() {
    return 'conv_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

// Render follow-up questions
function renderQuestions(questions) {
    questionsContainer.innerHTML = '';
    
    questions.forEach((question, index) => {
        const questionDiv = document.createElement('div');
        questionDiv.className = 'bg-white border border-gray-200 rounded-xl p-6 shadow-sm hover:shadow-md transition-all duration-300';
        
        questionDiv.innerHTML = `
            <label class="block text-sm font-medium text-gray-700 mb-3">
                ${index + 1}. ${question}
            </label>
            <textarea 
                id="answer_${index}" 
                rows="3" 
                class="w-full p-3 border border-gray-200 rounded-lg focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 transition-all duration-200"
                placeholder="Please provide your answer..."
                onchange="updateAnswer(${index}, this.value)"
            ></textarea>
        `;
        
        questionsContainer.appendChild(questionDiv);
    });
}

// Update answer in consultation state
function updateAnswer(index, value) {
    if (consultationState.isActive && consultationState.answers) {
        consultationState.answers[index] = value;
        console.log(`Answer ${index} updated:`, value);
    }
}

// Submit answers to follow-up questions
submitAnswersBtn.addEventListener('click', async () => {
    if (!consultationState.isActive || !consultationState.conversationId) {
        alert('No active consultation found. Please start a new consultation.');
        return;
    }
    
    // Collect and validate answers
    const answers = [];
    let hasEmptyAnswers = false;
    
    for (let i = 0; i < consultationState.questions.length; i++) {
        const answerEl = document.getElementById(`answer_${i}`);
        const answer = answerEl ? answerEl.value.trim() : '';
        
        if (!answer) {
            hasEmptyAnswers = true;
        }
        
        answers.push({
            question: consultationState.questions[i],
            answer: answer || 'No answer provided'
        });
    }
    
    if (hasEmptyAnswers) {
        const proceed = confirm('Some questions are not answered. Would you like to proceed anyway?');
        if (!proceed) return;
    }
    
    console.log('Submitting answers:', answers);
    console.log('Consultation state:', consultationState);
    
    showLoading(true);
    
    try {
        const response = await fetch('http://127.0.0.1:8000/analyze_symptoms', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                symptoms: consultationState.initialSymptoms,
                conversation_history: answers,
                is_followup: true
            })
        });
        
        const rawText = await response.text();
        console.log('Submit answers response:', response.status, rawText);
        
        if (!response.ok) {
            throw new Error(rawText || `Server error: ${response.status}`);
        }
        
        let data;
        try {
            data = JSON.parse(rawText);
        } catch (parseError) {
            console.error('JSON parse error:', parseError);
            throw new Error('Invalid response from server');
        }
        
        console.log('Assessment data:', data);
        renderResults(data);
        showSection('results');
        
        // Reset consultation state
        consultationState.isActive = false;
        
        await loadHistory(); // Refresh history
        
    } catch (error) {
        console.error('Submit answers error:', error);
        alert('Error: ' + error.message);
    } finally {
        showLoading(false);
    }
});

// Render final results
function renderResults(data) {
    console.log('Rendering results with data:', data);
    
    // Handle assessment format
    const assessment = data.assessment || data;
    
    // Clear existing content
    conditionsEl.innerHTML = '';
    recommendationsEl.innerHTML = '';
    
    // Render conditions
    if (assessment.possible_conditions && assessment.possible_conditions.length > 0) {
        conditionsEl.innerHTML = `
            <h3 class="text-lg font-semibold text-gray-800 mb-4">Possible Conditions</h3>
            <div class="space-y-3">
                ${assessment.possible_conditions.map(condition => {
                    const likelihoodColor = {
                        'high': 'bg-red-100 text-red-800 border-red-300',
                        'moderate': 'bg-yellow-100 text-yellow-800 border-yellow-300',
                        'low': 'bg-green-100 text-green-800 border-green-300'
                    }[condition.likelihood] || 'bg-gray-100 text-gray-800 border-gray-300';
                    
                    return `
                        <div class="p-4 bg-blue-50 rounded-lg border border-blue-200">
                            <div class="flex justify-between items-start mb-2">
                                <span class="font-semibold text-blue-900">${condition.condition}</span>
                                <span class="px-2 py-1 text-xs font-medium rounded-full ${likelihoodColor}">
                                    ${condition.likelihood} likelihood
                                </span>
                            </div>
                            <p class="text-sm text-blue-700">${condition.reasoning}</p>
                        </div>
                    `;
                }).join('')}
            </div>
        `;
    } else if (data.conditions && data.conditions.length > 0) {
        // Fallback for old format
        conditionsEl.innerHTML = `
            <h3 class="text-lg font-semibold text-gray-800 mb-4">Possible Conditions</h3>
            <div class="space-y-2">
                ${data.conditions.map(condition => `
                    <div class="p-3 bg-blue-50 rounded-lg border border-blue-200">
                        <span class="text-blue-800">${condition}</span>
                    </div>
                `).join('')}
            </div>
        `;
    } else {
        conditionsEl.innerHTML = '<p class="text-gray-600">No specific conditions identified.</p>';
    }
    
    // Prepare red flags HTML
    let redFlagsHtml = '';
    const redFlags = assessment.red_flags || data.red_flags;
    if (redFlags && redFlags.length > 0) {
        redFlagsHtml = `
            <div class="mt-6 p-4 bg-red-50 border-l-4 border-red-400 rounded-r-lg">
                <h4 class="text-lg font-semibold text-red-800 mb-3">⚠️ Seek Immediate Care If:</h4>
                <ul class="space-y-1">
                    ${redFlags.map(flag => `
                        <li class="flex items-start text-red-700">
                            <span class="text-red-600 mr-2">•</span>
                            ${flag}
                        </li>
                    `).join('')}
                </ul>
            </div>
        `;
    }
    
    // Render recommendations
    const recommendations = assessment.recommendations || data.recommendations;
    if (recommendations && recommendations.length > 0) {
        recommendationsEl.innerHTML = `
            <h3 class="text-lg font-semibold text-gray-800 mb-4">Recommendations</h3>
            <div class="space-y-2">
                ${recommendations.map(rec => `
                    <div class="p-3 bg-green-50 border border-green-200 rounded-lg">
                        <p class="text-green-800">${rec}</p>
                    </div>
                `).join('')}
            </div>
            ${redFlagsHtml}
        `;
    } else {
        recommendationsEl.innerHTML = `<p class="text-gray-600">No specific recommendations at this time.</p>${redFlagsHtml}`;
    }
    
    // Add when to seek care info
    const whenToSeekCare = assessment.when_to_seek_care;
    if (whenToSeekCare) {
        recommendationsEl.innerHTML += `
            <div class="mt-4 p-4 bg-yellow-50 border-l-4 border-yellow-400 rounded-r-lg">
                <h4 class="font-semibold text-yellow-800 mb-2">When to Seek Medical Care:</h4>
                <p class="text-yellow-700">${whenToSeekCare}</p>
            </div>
        `;
    }
    
    // Set disclaimer
    disclaimerEl.textContent = data.disclaimer || 
        'This consultation is for educational purposes only and is not a substitute for professional medical advice, diagnosis, or treatment.';
}

// Navigation buttons
backToInitialBtn.addEventListener('click', () => {
    showSection('initial');
    consultationState = {
        conversationId: null,
        initialSymptoms: '',
        questions: [],
        answers: [],
        isActive: false
    };
});

// Clear button functionality
clearBtn.addEventListener('click', () => {
    initialSymptoms.value = '';
    showSection('initial');
    consultationState = {
        conversationId: null,
        initialSymptoms: '',
        questions: [],
        answers: [],
        isActive: false
    };
});

// Load consultation history
async function loadHistory() {
    try {
        const response = await fetch('http://127.0.0.1:8000/history');
        const rawText = await response.text();
        console.log('History response:', response.status, rawText);
        
        if (!response.ok) {
            throw new Error(rawText || `Failed to load history: ${response.status}`);
        }
        
        let consultations;
        try {
            consultations = JSON.parse(rawText);
        } catch (parseError) {
            console.error('History JSON parse error:', parseError);
            throw new Error('Invalid history response');
        }
        
        if (!consultations || consultations.length === 0) {
            historyListEl.innerHTML = `
                <div class="text-center py-8">
                    <div class="text-gray-400 mb-2">
                        <svg class="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                        </svg>
                    </div>
                    <p class="text-gray-500 text-lg">No consultation history yet</p>
                    <p class="text-gray-400 text-sm mt-1">Start a consultation to see your history here</p>
                </div>
            `;
            return;
        }
        
        historyListEl.innerHTML = consultations.map(consultation => {
            // Handle assessment display
            let assessmentSummary = '';
            if (consultation.assessment && typeof consultation.assessment === 'object') {
                if (consultation.assessment.possible_conditions && consultation.assessment.possible_conditions.length > 0) {
                    const conditions = consultation.assessment.possible_conditions.map(c => c.condition || c).join(', ');
                    assessmentSummary = `<div class="text-sm text-gray-600 mt-2">
                        <strong>Conditions assessed:</strong> ${conditions}
                    </div>`;
                }
            } else if (typeof consultation.assessment === 'string') {
                assessmentSummary = `<div class="text-sm text-gray-600 mt-2">
                    <strong>Assessment:</strong> ${consultation.assessment.substring(0, 100)}...
                </div>`;
            }
            
            return `
                <div class="bg-white border border-gray-200 rounded-xl p-5 mb-4 hover:shadow-lg hover:border-blue-300 transition-all duration-300 cursor-pointer" onclick="expandConsultation(${consultation.id})">
                    <div class="flex justify-between items-start mb-3">
                        <div class="text-sm text-gray-500">
                            📅 ${new Date(consultation.created_at).toLocaleDateString()} at ${new Date(consultation.created_at).toLocaleTimeString()}
                        </div>
                        <span class="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-gradient-to-r from-blue-100 to-blue-200 text-blue-800 border border-blue-300">
                            💬 ${consultation.consultation_type || 'Medical Consultation'}
                        </span>
                    </div>
                    <div class="text-gray-800 mb-3 leading-relaxed">
                        <strong class="text-gray-900">Initial Symptoms:</strong>
                        <p class="mt-1 text-gray-700">${consultation.symptoms}</p>
                    </div>
                    ${assessmentSummary}
                    <div class="flex justify-between items-center mt-4 pt-3 border-t border-gray-100">
                        <span class="text-xs text-gray-500 bg-gray-50 px-2 py-1 rounded-md">
                            ❓ ${consultation.questions ? consultation.questions.length : 0} questions asked
                        </span>
                        <span class="text-xs text-blue-600 hover:text-blue-800 font-medium">
                            Click to view details →
                        </span>
                    </div>
                </div>
            `;
        }).join('');
        
    } catch (error) {
        console.error('Load history error:', error);
        historyListEl.innerHTML = `
            <div class="text-center py-8">
                <div class="text-red-400 mb-2">
                    <svg class="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"></path>
                    </svg>
                </div>
                <p class="text-red-500 text-lg">Unable to load consultation history</p>
                <p class="text-red-400 text-sm mt-1">Please check your connection and try again</p>
            </div>
        `;
    }
}

// Expand consultation details
function expandConsultation(consultationId) {
    // For now, just show an alert with the ID
    // You could implement a modal or expand the card to show full details
    alert(`Consultation ID: ${consultationId}\nClick functionality can be expanded to show full consultation details.`);
}

// Initialize the application
window.addEventListener('load', () => {
    showSection('initial');
    loadHistory();
});
