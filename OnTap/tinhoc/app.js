class QuizApp {
    constructor() {
        this.questions = [];
        this.filteredQuestions = [];
        this.currentQuestionIndex = 0;
        this.settings = {
            module: 'all',
            mode: 'practice',
            filter: 'all',
            view: 'single',
            shuffleQuestions: true,
            shuffleOptions: false,
            showImages: true,
            showAnswers: true
        };
        this.stats = {
            totalAnswered: 0,
            correctAnswers: 0,
            questionHistory: {},
            flaggedQuestions: new Set()
        };
        this.sessionAnswers = new Set(); // Theo dõi câu đã trả lời trong session hiện tại
        
        this.init();
    }

    async init() {
        console.log('QuizApp initializing...');
        await this.loadQuestions();
        this.loadSettings();
        this.loadStats();
        this.setupEventListeners();
        this.updateUI();
        console.log('QuizApp initialized successfully');
    }

    async loadQuestions() {
        try {
            const response = await fetch('questions.js');
            const content = await response.text();
            // Extract questions array from export statement
            const questionsMatch = content.match(/export const questions = (.*);/s);
            if (questionsMatch) {
                this.questions = JSON.parse(questionsMatch[1]);
                console.log(`Loaded ${this.questions.length} questions`);
            }
        } catch (error) {
            console.error('Error loading questions:', error);
            // Fallback to JSON file
            try {
                const response = await fetch('questions.json');
                this.questions = await response.json();
                console.log(`Loaded ${this.questions.length} questions from JSON`);
            } catch (jsonError) {
                console.error('Error loading JSON questions:', jsonError);
                this.showError('Không thể tải câu hỏi. Vui lòng thử lại.');
            }
        }
    }

    loadSettings() {
        const saved = localStorage.getItem('quizSettings');
        if (saved) {
            this.settings = { ...this.settings, ...JSON.parse(saved) };
        }
    }

    saveSettings() {
        localStorage.setItem('quizSettings', JSON.stringify(this.settings));
    }

    loadStats() {
        const saved = localStorage.getItem('quizStats');
        if (saved) {
            const loadedStats = JSON.parse(saved);
            this.stats = { 
                ...this.stats, 
                ...loadedStats,
                flaggedQuestions: new Set(loadedStats.flaggedQuestions || [])
            };
        }
    }

    saveStats() {
        const statsToSave = {
            ...this.stats,
            flaggedQuestions: Array.from(this.stats.flaggedQuestions)
        };
        localStorage.setItem('quizStats', JSON.stringify(statsToSave));
    }

    setupEventListeners() {
        console.log('Setting up event listeners...');
        
        // Navigation
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const panel = e.currentTarget.dataset.panel;
                this.showPanel(panel);
            });
        });

        // Universal Settings Handler
        document.querySelectorAll('.setting-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const type = e.currentTarget.dataset.type;
                const value = e.currentTarget.dataset.value;
                
                // Remove active from siblings
                document.querySelectorAll(`[data-type="${type}"]`).forEach(b => b.classList.remove('active'));
                e.currentTarget.classList.add('active');
                
                // Update settings
                this.settings[type] = value;
                this.saveSettings();
                
                console.log(`Settings updated: ${type} = ${value}`);
            });
        });

        // Checkbox Options
        document.getElementById('shuffle-questions')?.addEventListener('change', (e) => {
            this.settings.shuffleQuestions = e.target.checked;
            this.saveSettings();
            console.log('Shuffle questions:', e.target.checked);
        });

        document.getElementById('show-images')?.addEventListener('change', (e) => {
            this.settings.showImages = e.target.checked;
            this.saveSettings();
            console.log('Show images:', e.target.checked);
        });



        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
                e.currentTarget.classList.add('active');
                this.settings.filter = e.currentTarget.dataset.filter;
                this.saveSettings();
            });
        });

        // Checkboxes
        document.getElementById('show-images').addEventListener('change', (e) => {
            this.settings.showImages = e.target.checked;
            this.saveSettings();
            if (this.currentView === 'quiz') {
                this.renderQuestion();
            }
        });

        // Quiz controls with debug
        const startBtn = document.getElementById('start-quiz');
        const quickBtn = document.getElementById('quick-start');
        
        console.log('Start button found:', !!startBtn);
        console.log('Quick button found:', !!quickBtn);
        
        if (startBtn) {
            startBtn.addEventListener('click', (e) => {
                console.log('Start button clicked!');
                e.preventDefault();
                try {
                    this.startQuiz();
                } catch (error) {
                    console.error('Error starting quiz:', error);
                }
            });
        }

        if (quickBtn) {
            quickBtn.addEventListener('click', (e) => {
                console.log('Quick start button clicked!');
                e.preventDefault();
                try {
                    // Quick start with default settings
                    this.settings = {
                        ...this.settings,
                        mode: 'practice',
                        module: 'all',
                        shuffleQuestions: true,
                        showImages: true
                    };
                    this.startQuiz();
                } catch (error) {
                    console.error('Error with quick start:', error);
                }
            });
        }

        // Navigation buttons (bottom)
        document.getElementById('prev-btn-bottom').addEventListener('click', () => {
            this.previousQuestion();
        });

        document.getElementById('next-btn-bottom').addEventListener('click', () => {
            this.nextQuestion();
        });

        document.getElementById('flag-btn').addEventListener('click', () => {
            this.toggleFlag();
        });

        document.getElementById('settings-btn').addEventListener('click', () => {
            this.showPanel('settings');
        });

        document.getElementById('reset-btn').addEventListener('click', () => {
            this.resetQuizProgress();
        });

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (this.currentView === 'quiz') {
                switch(e.key) {
                    case 'ArrowLeft':
                        e.preventDefault();
                        this.previousQuestion();
                        break;
                    case 'ArrowRight':
                        e.preventDefault();
                        this.nextQuestion();
                        break;
                    case '1':
                    case '2':
                    case '3':
                    case '4':
                        e.preventDefault();
                        this.selectOption(parseInt(e.key) - 1);
                        break;
                    case 'f':
                    case 'F':
                        e.preventDefault();
                        this.toggleFlag();
                        break;
                }
            }
        });
    }

    showPanel(panelName) {
        // Update navigation
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.panel === panelName);
        });

        // Show/hide panels
        document.querySelectorAll('.panel').forEach(panel => {
            panel.classList.add('hidden');
        });

        const targetPanel = document.getElementById(`${panelName}-panel`);
        if (targetPanel) {
            targetPanel.classList.remove('hidden');
        } else {
            console.error(`Panel not found: ${panelName}-panel`);
        }
        this.currentView = panelName;

        // Update content based on panel
        if (panelName === 'stats') {
            this.updateStats();
        } else if (panelName === 'settings') {
            this.updateSettingsUI();
        } else if (panelName === 'quiz') {
            // Ensure quiz is ready
            if (this.filteredQuestions.length > 0) {
                this.renderQuestion();
                this.updateQuizControls();
            }
        }
    }

    updateSettingsUI() {
        // Update active buttons with null checks
        const moduleBtn = document.querySelector(`[data-module="${this.settings.module}"]`);
        if (moduleBtn) moduleBtn.classList.add('active');
        
        const modeBtn = document.querySelector(`[data-mode="${this.settings.mode}"]`);
        if (modeBtn) modeBtn.classList.add('active');
        
        const viewBtn = document.querySelector(`[data-view="${this.settings.view}"]`);
        if (viewBtn) viewBtn.classList.add('active');
        
        const filterBtn = document.querySelector(`[data-filter="${this.settings.filter}"]`);
        if (filterBtn) filterBtn.classList.add('active');
        
        // Update checkboxes
        const showImagesCheckbox = document.getElementById('show-images');
        if (showImagesCheckbox) showImagesCheckbox.checked = this.settings.showImages;
        
        const shuffleQuestionsCheckbox = document.getElementById('shuffle-questions');
        if (shuffleQuestionsCheckbox) shuffleQuestionsCheckbox.checked = this.settings.shuffleQuestions;
    }

    filterQuestions() {
        console.log('Filtering questions...');
        console.log('Total questions:', this.questions.length);
        console.log('Filter settings:', this.settings);
        
        let filtered = [...this.questions];

        // Filter by module
        if (this.settings.module !== 'all') {
            const beforeFilter = filtered.length;
            filtered = filtered.filter(q => q.section === this.settings.module);
            console.log(`Module filter (${this.settings.module}): ${beforeFilter} → ${filtered.length}`);
        }

        // Filter by learning status
        if (this.settings.filter !== 'all') {
            filtered = filtered.filter(q => {
                const history = this.getQuestionHistory(q);
                switch (this.settings.filter) {
                    case 'unlearned':
                        return history.attempts === 0;
                    case 'weak':
                        return this.getQuestionStrength(q) === 'weak';
                    case 'strong':
                        return this.getQuestionStrength(q) === 'strong';
                    default:
                        return true;
                }
            });
        }

        // Remove questions with no options or answers if not showing answers
        filtered = filtered.filter(q => {
            return Object.keys(q.options).length >= 2 && q.answer;
        });

        this.filteredQuestions = filtered;
        console.log('Final filtered questions:', this.filteredQuestions.length);

        // Shuffle if random mode
        if (this.settings.shuffleQuestions || this.settings.mode === 'random') {
            this.shuffleArray(this.filteredQuestions);
            console.log('Questions shuffled');
        }
    }

    shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
    }

    startQuiz() {
        console.log('Starting quiz...');
        console.log('Current settings:', this.settings);
        
        // Xóa danh sách câu đã trả lời trong session trước
        this.sessionAnswers.clear();
        
        this.filterQuestions();
        console.log('Filtered questions:', this.filteredQuestions.length);
        
        if (this.filteredQuestions.length === 0) {
            console.error('No questions found after filtering');
            alert('Không có câu hỏi nào phù hợp với bộ lọc hiện tại.');
            return;
        }

        this.currentQuestionIndex = 0;
        console.log('Showing quiz panel...');
        this.showPanel('quiz');
        this.renderQuiz();
        console.log('Quiz started successfully');
    }

    renderQuiz() {
        if (this.settings.view === 'single') {
            this.renderSingleQuestion();
        } else {
            this.renderContinuousView();
        }
        this.updateQuizControls();
    }

    renderSingleQuestion() {
        document.getElementById('single-view').classList.remove('hidden');
        document.getElementById('continuous-view').classList.add('hidden');
        
        const question = this.filteredQuestions[this.currentQuestionIndex];
        if (!question) return;

        this.renderQuestion();
    }

    renderContinuousView() {
        document.getElementById('single-view').classList.add('hidden');
        document.getElementById('continuous-view').classList.remove('hidden');
        
        const container = document.getElementById('continuous-content');
        container.innerHTML = '';
        
        this.filteredQuestions.forEach((question, index) => {
            const questionDiv = document.createElement('div');
            questionDiv.className = 'continuous-question';
            questionDiv.innerHTML = this.generateQuestionHTML(question, index);
            container.appendChild(questionDiv);
        });
    }

    renderQuestion() {
        const question = this.filteredQuestions[this.currentQuestionIndex];
        if (!question) return;

        // Question text
        const questionText = document.getElementById('question-text');
        if (questionText) {
            questionText.innerHTML = this.processQuestionText(question.prompt);
        } else {
            console.error('Element question-text not found');
            return;
        }

        // Question image
        const imageContainer = document.getElementById('question-image');
        if (imageContainer) {
            imageContainer.innerHTML = '';
        } else {
            console.error('Element question-image not found');
        }
        
        if (this.settings.showImages && question.images && question.images.length > 0) {
            question.images.forEach(imagePath => {
                const img = document.createElement('img');
                img.src = imagePath;
                img.alt = 'Question image';
                img.style.maxWidth = '100%';
                img.style.height = 'auto';
                img.style.marginBottom = '1rem';
                imageContainer.appendChild(img);
            });
        }

        // Options
        const optionsContainer = document.getElementById('options-container');
        if (!optionsContainer) {
            console.error('Element options-container not found');
            return;
        }
        optionsContainer.innerHTML = '';
        
        const userAnswer = this.getUserAnswer(question);
        // Chỉ hiển thị kết quả nếu câu này đã được trả lời trong session hiện tại
        const questionId = this.getQuestionId(question);
        const answeredInSession = this.sessionAnswers.has(questionId);
        const showResult = answeredInSession;
        
        Object.entries(question.options).forEach(([letter, text], index) => {
            const option = document.createElement('div');
            option.className = 'option';
            option.dataset.letter = letter;
            
            // Chỉ hiển thị selected nếu câu này đã được trả lời trong session hiện tại
            if (answeredInSession && userAnswer === letter) {
                option.classList.add('selected');
            }
            
            if (showResult) {
                if (letter === question.answer) {
                    option.classList.add('correct');
                } else if (userAnswer === letter && letter !== question.answer) {
                    option.classList.add('incorrect');
                }
            }
            
            option.innerHTML = `
                <span class="option-letter">${letter}.</span>
                <span class="option-text">${this.processQuestionText(text)}</span>
            `;
            
            // Luôn cho phép click để chọn đáp án
            option.addEventListener('click', () => {
                this.selectOption(index, letter);
            });
            
            optionsContainer.appendChild(option);
        });

        // Answer section
        const answerSection = document.getElementById('answer-section');
        if (this.settings.showAnswers) {
            answerSection.classList.remove('hidden');
            document.getElementById('correct-answer').textContent = question.answer;
        } else {
            answerSection.classList.add('hidden');
        }
    }

    processQuestionText(text) {
        // Remove image references from text (images are handled separately in renderQuestion)
        text = text.replace(/\[HÌNH: ([^\]]+)\]/g, '');
        
        // Process LaTeX mathrm (for formatting like Ctrl, Alt, etc.)
        text = text.replace(/\\mathrm\{([^}]+)\}/g, '<strong>$1</strong>');
        
        // Process LaTeX arrows first (more specific patterns)
        text = text.replace(/\$\\rightarrow\$/g, '<span class="arrow">→</span>');
        text = text.replace(/\$\\leftarrow\$/g, '<span class="arrow">←</span>');
        text = text.replace(/\\rightarrow/g, '<span class="arrow">→</span>');
        text = text.replace(/\\leftarrow/g, '<span class="arrow">←</span>');
        
        // Process simple arrows
        text = text.replace(/\$->\$/g, '<span class="arrow">→</span>');
        text = text.replace(/\$<-\$/g, '<span class="arrow">←</span>');
        text = text.replace(/->/g, '<span class="arrow">→</span>');
        text = text.replace(/<-/g, '<span class="arrow">←</span>');
        
        // Process remaining LaTeX-like expressions and formulas
        text = text.replace(/\$([^$]+)\$/g, '<code class="formula">$1</code>');
        
        // Process bold text
        text = text.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
        
        // Process code/path formatting
        text = text.replace(/`([^`]+)`/g, '<code>$1</code>');
        
        // Process line breaks
        text = text.replace(/\n/g, '<br>');
        
        return text;
    }

    selectOption(index, letter) {
        const question = this.filteredQuestions[this.currentQuestionIndex];
        if (!question) return;

        // Update visual selection
        document.querySelectorAll('.option').forEach(opt => {
            opt.classList.remove('selected', 'correct', 'incorrect');
        });
        
        const selectedOption = document.querySelector(`[data-letter="${letter}"]`);
        selectedOption.classList.add('selected');
        
        // Record answer
        this.recordAnswer(question, letter);
        
        // Đánh dấu câu này đã được trả lời trong session hiện tại
        const questionId = this.getQuestionId(question);
        this.sessionAnswers.add(questionId);
        
        // Luôn hiển thị kết quả ngay sau khi chọn (trong session hiện tại)
        setTimeout(() => {
            this.showAnswerResult(question, letter);
        }, 500);
        
        this.updateStats();
    }

    showAnswerResult(question, userAnswer) {
        document.querySelectorAll('.option').forEach(opt => {
            const letter = opt.dataset.letter;
            if (letter === question.answer) {
                opt.classList.add('correct');
            } else if (letter === userAnswer && letter !== question.answer) {
                opt.classList.add('incorrect');
            }
        });
    }

    recordAnswer(question, answer) {
        const questionId = this.getQuestionId(question);
        
        if (!this.stats.questionHistory[questionId]) {
            this.stats.questionHistory[questionId] = {
                attempts: 0,
                correct: 0,
                incorrect: 0,
                lastAnswers: []
            };
        }
        
        const history = this.stats.questionHistory[questionId];
        
        // Luôn cập nhật câu trả lời cuối cùng (ghi đè)
        history.currentAnswer = answer;
        history.lastAnswer = {
            answer: answer,
            correct: answer === question.answer,
            timestamp: Date.now()
        };
        
        // Chỉ đếm attempts = 1 (lần cuối)
        history.attempts = 1;
        
        // Cập nhật correct/incorrect dựa trên lần cuối
        if (answer === question.answer) {
            history.correct = 1;
            history.incorrect = 0;
        } else {
            history.correct = 0;
            history.incorrect = 1;
        }
        this.saveStats();
    }

    getUserAnswer(question) {
        const questionId = this.getQuestionId(question);
        const history = this.stats.questionHistory[questionId];
        
        // Trả về câu trả lời hiện tại của session, không phải lịch sử
        if (history && history.currentAnswer) {
            return history.currentAnswer;
        }
        
        return null;
    }

    getQuestionHistory(question) {
        const questionId = this.getQuestionId(question);
        return this.stats.questionHistory[questionId] || {
            attempts: 0,
            correct: 0,
            incorrect: 0,
            lastAnswer: null
        };
    }

    getQuestionStrength(question) {
        const history = this.getQuestionHistory(question);
        
        if (history.attempts < 3) {
            return 'neutral';
        }
        
        // Check last 3 attempts
        const recentAnswers = history.lastAnswers.slice(-3);
        const correctCount = recentAnswers.filter(a => a.correct).length;
        
        if (correctCount >= 2) {
            return 'strong';
        } else if (recentAnswers.length - correctCount >= 2) {
            return 'weak';
        }
        
        return 'neutral';
    }

    getQuestionId(question) {
        return `${question.section}-${question.number}`;
    }

    previousQuestion() {
        if (this.currentQuestionIndex > 0) {
            this.currentQuestionIndex--;
            this.renderQuestion();
            this.updateQuizControls();
        }
    }

    nextQuestion() {
        if (this.currentQuestionIndex < this.filteredQuestions.length - 1) {
            this.currentQuestionIndex++;
            this.renderQuestion();
            this.updateQuizControls();
        }
    }

    toggleFlag() {
        const question = this.filteredQuestions[this.currentQuestionIndex];
        if (!question) return;
        
        const questionId = this.getQuestionId(question);
        
        if (this.stats.flaggedQuestions.has(questionId)) {
            this.stats.flaggedQuestions.delete(questionId);
        } else {
            this.stats.flaggedQuestions.add(questionId);
        }
        
        this.saveStats();
        this.updateQuizControls();
    }

    resetQuizProgress() {
        if (confirm('Bạn có muốn làm lại từ đầu không? (Thống kê sẽ được giữ lại)')) {
            // Reset chỉ tiến độ quiz hiện tại, không reset thống kê tổng thể
            this.currentQuestionIndex = 0;
            
            // Xóa danh sách câu đã trả lời trong session hiện tại
            this.sessionAnswers.clear();
            
            // Reset chỉ currentAnswer để có thể làm lại, giữ nguyên thống kê cuối cùng
            this.filteredQuestions.forEach(question => {
                const questionId = this.getQuestionId(question);
                if (this.stats.questionHistory[questionId]) {
                    // Chỉ xóa currentAnswer, giữ lại lastAnswer cho thống kê
                    delete this.stats.questionHistory[questionId].currentAnswer;
                }
            });
            
            // Trộn lại câu hỏi nếu có setting
            if (this.settings.shuffleQuestions) {
                this.shuffleArray(this.filteredQuestions);
            }
            
            // Cập nhật giao diện
            this.renderQuestion();
            this.updateQuizControls();
            
            console.log('Quiz reset - keeping stats intact');
        }
    }

    updateQuizControls() {
        const prevBtn = document.getElementById('prev-btn-bottom');
        const nextBtn = document.getElementById('next-btn-bottom');
        const flagBtn = document.getElementById('flag-btn');
        const counter = document.getElementById('question-counter');
        const progressFill = document.getElementById('progress-fill');
        
        // Update counter
        if (counter) counter.textContent = `${this.currentQuestionIndex + 1}/${this.filteredQuestions.length}`;
        
        // Update progress bar
        if (progressFill) {
            const progress = ((this.currentQuestionIndex + 1) / this.filteredQuestions.length) * 100;
            progressFill.style.width = `${progress}%`;
        }
        
        // Update navigation buttons
        if (prevBtn) prevBtn.disabled = this.currentQuestionIndex === 0;
        if (nextBtn) nextBtn.disabled = this.currentQuestionIndex === this.filteredQuestions.length - 1;
        
        // Update flag button
        const question = this.filteredQuestions[this.currentQuestionIndex];
        if (question) {
            const questionId = this.getQuestionId(question);
            flagBtn.classList.toggle('flagged', this.stats.flaggedQuestions.has(questionId));
        }
    }

    updateStats() {
        // Calculate current stats dynamically
        let totalAnswered = 0;
        let correctAnswers = 0;
        
        Object.values(this.stats.questionHistory).forEach(history => {
            if (history.lastAnswer) {
                totalAnswered += 1; // Chỉ đếm 1 lần cuối
                correctAnswers += history.correct; // 0 hoặc 1
            }
        });
        
        // Update header stats
        document.getElementById('progress-display').textContent = 
            `${this.currentQuestionIndex + 1}/${this.filteredQuestions.length}`;
        document.getElementById('score-display').textContent = `${correctAnswers}đ`;
        
        if (this.currentView !== 'stats') return;
        
        // Calculate stats
        const totalQuestions = this.questions.length;
        const answeredQuestions = Object.keys(this.stats.questionHistory).length;
        const accuracy = totalAnswered > 0 ? 
            Math.round((correctAnswers / totalAnswered) * 100) : 0;
        
        // Update stat cards
        document.getElementById('total-questions').textContent = totalQuestions;
        document.getElementById('answered-questions').textContent = answeredQuestions;
        document.getElementById('correct-answers').textContent = correctAnswers;
        document.getElementById('accuracy-rate').textContent = `${accuracy}%`;
        
        // Update module stats
        this.updateModuleStats();
        
        // Update question grid
        this.updateQuestionGrid();
    }

    updateModuleStats() {
        const moduleStats = document.getElementById('module-stats');
        moduleStats.innerHTML = '';
        
        const modules = ['IU07', 'IU08', 'IU09'];
        const moduleNames = {
            'IU07': 'Microsoft Word',
            'IU08': 'Microsoft Excel', 
            'IU09': 'Microsoft PowerPoint'
        };
        
        modules.forEach(module => {
            const moduleQuestions = this.questions.filter(q => q.section === module);
            const answeredCount = moduleQuestions.filter(q => {
                const questionId = this.getQuestionId(q);
                const history = this.stats.questionHistory[questionId];
                return history && history.lastAnswer;
            }).length;
            
            const div = document.createElement('div');
            div.className = 'module-stat';
            div.innerHTML = `
                <span>${moduleNames[module]}</span>
                <span>${answeredCount}/${moduleQuestions.length}</span>
            `;
            moduleStats.appendChild(div);
        });
    }

    updateQuestionGrid() {
        const questionGrid = document.getElementById('question-grid');
        questionGrid.innerHTML = '';
        
        this.questions.forEach(question => {
            const dot = document.createElement('div');
            dot.className = 'question-dot';
            dot.textContent = question.number;
            
            const history = this.getQuestionHistory(question);
            const strength = this.getQuestionStrength(question);
            
            if (!history.lastAnswer) {
                dot.classList.add('unanswered');
            } else {
                if (history.lastAnswer.correct) {
                    dot.classList.add('correct');
                } else {
                    dot.classList.add('incorrect');
                }
            }
            
            dot.addEventListener('click', () => {
                this.jumpToQuestion(question);
            });
            
            questionGrid.appendChild(dot);
        });
    }

    jumpToQuestion(question) {
        const index = this.filteredQuestions.findIndex(q => 
            this.getQuestionId(q) === this.getQuestionId(question)
        );
        
        if (index !== -1) {
            this.currentQuestionIndex = index;
            this.showPanel('quiz');
            this.renderQuiz();
        } else {
            // Question not in current filter, adjust settings
            this.settings.module = question.section;
            this.settings.filter = 'all';
            this.saveSettings();
            this.startQuiz();
            
            const newIndex = this.filteredQuestions.findIndex(q => 
                this.getQuestionId(q) === this.getQuestionId(question)
            );
            if (newIndex !== -1) {
                this.currentQuestionIndex = newIndex;
                this.renderQuiz();
            }
        }
    }

    updateUI() {
        this.showPanel('settings');
        this.updateSettingsUI();
    }

    showError(message) {
        alert(message); // Simple error display, could be improved with a modal
    }

    generateQuestionHTML(question, index) {
        let html = `
            <div class="question-header">
                <h3>Câu ${question.number} (${question.section})</h3>
            </div>
            <div class="question-text">${this.processQuestionText(question.prompt)}</div>
        `;
        
        if (this.settings.showImages && question.images && question.images.length > 0) {
            question.images.forEach(imagePath => {
                html += `<img src="${imagePath}" alt="Question image" style="max-width: 100%; height: auto; margin: 1rem 0;">`;
            });
        }
        
        html += '<div class="options-container">';
        Object.entries(question.options).forEach(([letter, text]) => {
            const isCorrect = letter === question.answer;
            const optionClass = this.settings.showAnswers && isCorrect ? 'option correct' : 'option';
            
            html += `
                <div class="${optionClass}">
                    <span class="option-letter">${letter}.</span>
                    <span class="option-text">${text}</span>
                </div>
            `;
        });
        html += '</div>';
        
        if (this.settings.showAnswers) {
            html += `
                <div class="answer-section">
                    <div class="correct-answer">
                        <i class="fas fa-check-circle"></i>
                        Đáp án: ${question.answer}
                    </div>
                </div>
            `;
        }
        
        return html;
    }
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded, initializing QuizApp...');
    try {
        window.quizApp = new QuizApp();
        console.log('QuizApp initialized successfully');
    } catch (error) {
        console.error('Error initializing QuizApp:', error);
    }
});

// Service Worker for offline functionality (optional)
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js')
            .then(registration => {
                console.log('SW registered: ', registration);
            })
            .catch(registrationError => {
                console.log('SW registration failed: ', registrationError);
            });
    });
}