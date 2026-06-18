document.addEventListener('DOMContentLoaded', () => {
    // State Variables
    let allNotes = [];
    let currentFilterType = 'all';
    let currentSearchQuery = '';
    let selectedNote = null;

    // DOM Elements
    const btnRefresh = document.getElementById('btn-refresh');
    const spinnerIcon = document.getElementById('spinner-icon');
    const syncStatusText = document.getElementById('status-text');
    const notesGrid = document.getElementById('notes-grid');
    const zeroState = document.getElementById('zero-state');
    const searchInput = document.getElementById('search-input');
    const filterTags = document.querySelectorAll('.filter-tag');
    const notesCountBadge = document.getElementById('notes-count-badge');
    
    // Stats elements
    const statTotal = document.getElementById('stat-total');
    const statFeatures = document.getElementById('stat-features');

    // Modal elements
    const tweetModal = document.getElementById('tweet-modal');
    const modalClose = document.getElementById('modal-close');
    const tweetTextarea = document.getElementById('tweet-textarea');
    const btnTweetCancel = document.getElementById('btn-tweet-cancel');
    const btnTweetPost = document.getElementById('btn-tweet-post');
    const charCounter = document.getElementById('char-counter');
    const charWarning = document.getElementById('char-warning');
    const progressCircle = document.getElementById('progress-ring-circle');
    
    // Modal preview elements
    const previewTypeBadge = document.getElementById('preview-type-badge');
    const previewDate = document.getElementById('preview-date');
    const previewText = document.getElementById('preview-text');

    // Circle properties for progress ring
    const radius = 12;
    const circumference = 2 * Math.PI * radius;
    if (progressCircle) {
        progressCircle.style.strokeDasharray = `${circumference} ${circumference}`;
        progressCircle.style.strokeDashoffset = circumference;
    }

    // Initialize the App
    fetchReleaseNotes(false);

    // Event Listeners
    btnRefresh.addEventListener('click', () => {
        fetchReleaseNotes(true);
    });

    searchInput.addEventListener('input', (e) => {
        currentSearchQuery = e.target.value.toLowerCase().trim();
        renderNotes();
    });

    filterTags.forEach(tag => {
        tag.addEventListener('click', () => {
            filterTags.forEach(t => t.classList.remove('active'));
            tag.classList.add('active');
            currentFilterType = tag.getAttribute('data-type');
            renderNotes();
        });
    });

    // Close Modal Events
    modalClose.addEventListener('click', closeModal);
    btnTweetCancel.addEventListener('click', closeModal);
    tweetModal.addEventListener('click', (e) => {
        if (e.target === tweetModal) closeModal();
    });

    // Handle Textarea input changes
    tweetTextarea.addEventListener('input', () => {
        updateComposerStatus();
    });

    // Handle Tweet Submission
    btnTweetPost.addEventListener('click', () => {
        const text = tweetTextarea.value.trim();
        if (getTwitterLength(text) > 280) {
            alert("Your tweet exceeds the 280-character limit!");
            return;
        }
        if (text.length === 0) {
            alert("Your tweet cannot be empty!");
            return;
        }
        const intentUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;
        window.open(intentUrl, '_blank', 'noopener,noreferrer');
        closeModal();
    });

    // Functions
    async function fetchReleaseNotes(forceRefresh = false) {
        // Toggle refresh button state
        btnRefresh.disabled = true;
        spinnerIcon.classList.add('loading');
        const prevStatusText = syncStatusText.textContent;
        syncStatusText.textContent = "Syncing with Google Cloud...";
        document.querySelector('.status-indicator').classList.add('loading');

        try {
            const url = forceRefresh ? '/api/notes?refresh=true' : '/api/notes';
            const response = await fetch(url);
            
            if (!response.ok) {
                throw new Error(`Server returned status ${response.status}`);
            }

            const data = await response.json();
            allNotes = data.updates || [];
            
            // Format status time
            const lastSync = new Date(data.cached_at * 1000);
            const formattedTime = lastSync.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
            syncStatusText.textContent = `Synced at ${formattedTime}`;
            
            // Calculate and show stats
            calculateStats();
            
            // Render notes
            renderNotes();

        } catch (error) {
            console.error("Error fetching release notes:", error);
            syncStatusText.textContent = "Sync failed. Offline mode active.";
            
            // If we have no notes showing, display zero state with error
            if (allNotes.length === 0) {
                notesGrid.innerHTML = '';
                zeroState.classList.remove('hidden');
                zeroState.querySelector('h3').textContent = "Connection Failure";
                zeroState.querySelector('p').textContent = "We encountered an issue fetching release notes. Check your server logs or try again.";
            }
        } finally {
            btnRefresh.disabled = false;
            spinnerIcon.classList.remove('loading');
            document.querySelector('.status-indicator').classList.remove('loading');
        }
    }

    function calculateStats() {
        statTotal.textContent = allNotes.length;
        const featuresCount = allNotes.filter(n => n.type === 'Feature').length;
        statFeatures.textContent = featuresCount;
    }

    function renderNotes() {
        // Clear grid
        notesGrid.innerHTML = '';
        
        // Filter notes
        const filteredNotes = allNotes.filter(note => {
            const matchesType = currentFilterType === 'all' || note.type === currentFilterType;
            
            const matchesSearch = currentSearchQuery === '' || 
                note.date.toLowerCase().includes(currentSearchQuery) ||
                note.type.toLowerCase().includes(currentSearchQuery) ||
                note.text.toLowerCase().includes(currentSearchQuery);
                
            return matchesType && matchesSearch;
        });

        // Update count badge
        notesCountBadge.textContent = `${filteredNotes.length} item${filteredNotes.length !== 1 ? 's' : ''} found`;

        if (filteredNotes.length === 0) {
            zeroState.classList.remove('hidden');
            return;
        }

        zeroState.classList.add('hidden');

        // Render card elements
        filteredNotes.forEach(note => {
            const card = document.createElement('article');
            card.className = `note-card card-${note.type.toLowerCase()}`;
            card.setAttribute('data-id', note.id);

            // Determine badge class
            const badgeClass = `badge badge-${note.type.toLowerCase()}`;

            card.innerHTML = `
                <div class="card-header">
                    <div class="card-meta">
                        <span class="${badgeClass}">${note.type}</span>
                        <span class="card-date">${note.date}</span>
                    </div>
                    <button class="card-select-btn" title="Select to Tweet">
                        <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.6 5.6 4.1 9 4-.9-4.2 4-6.6 7-3.8 1.1 0 3-1.2 3-1.2z"/>
                        </svg>
                    </button>
                </div>
                <div class="card-body">
                    ${note.html}
                </div>
                <div class="card-footer">
                    <a href="${note.link}" target="_blank" rel="noopener noreferrer" class="btn-origin">
                        <span>Original notes</span>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14L21 3" stroke-linecap="round" stroke-linejoin="round"/>
                        </svg>
                    </a>
                    <button class="btn btn-tweet btn-action-tweet">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                        </svg>
                        <span>Tweet</span>
                    </button>
                </div>
            `;

            // Event Listeners for action buttons inside the card
            const tweetBtn = card.querySelector('.btn-action-tweet');
            const selectBtn = card.querySelector('.card-select-btn');
            
            const handleTweetInit = () => {
                openComposer(note);
            };

            tweetBtn.addEventListener('click', handleTweetInit);
            selectBtn.addEventListener('click', handleTweetInit);

            notesGrid.appendChild(card);
        });
    }

    // Composer Modal Functions
    function openComposer(note) {
        selectedNote = note;
        
        // Configure Preview Details
        previewTypeBadge.textContent = note.type;
        previewTypeBadge.className = `preview-badge badge-${note.type.toLowerCase()}`;
        previewDate.textContent = note.date;
        previewText.textContent = note.text;
        
        // Customize Preview Card left border highlight
        const previewBox = document.querySelector('.update-preview-box');
        previewBox.className = 'update-preview-box';
        previewBox.classList.add(`type-${note.type}`);

        // Construct default elegant tweet draft
        // Format: BigQuery Update [June 17, 2026] - Feature: <truncated text> <link>
        const header = `BigQuery [${note.date}] - ${note.type}: `;
        const link = note.link;
        
        // X shortens all URLs to 23 characters. Spacing takes 2 characters.
        // Ellipses take 3 characters. Total characters left for main text: 280 - header_len - 23 - 5
        const availableTextChars = 280 - header.length - 23 - 5;
        
        let draftText = note.text;
        if (draftText.length > availableTextChars) {
            draftText = draftText.slice(0, availableTextChars) + '...';
        }
        
        const finalDraft = `${header}${draftText} ${link}`;
        
        // Populate textarea
        tweetTextarea.value = finalDraft;
        
        // Display Modal
        tweetModal.classList.remove('hidden');
        tweetTextarea.focus();
        
        // Calculate initial length status
        updateComposerStatus();
    }

    function closeModal() {
        tweetModal.classList.add('hidden');
        selectedNote = null;
    }

    // Counts text length taking into account X/Twitter URL counting mechanism
    function getTwitterLength(text) {
        // Regex matches http:// and https:// URLs up to spaces
        const urlRegex = /https?:\/\/[^\s]+/g;
        // Replace all URL occurrences with a string of 23 'x' characters
        const plainText = text.replace(urlRegex, 'x'.repeat(23));
        return plainText.length;
    }

    function updateComposerStatus() {
        const text = tweetTextarea.value;
        const len = getTwitterLength(text);
        const charsLeft = 280 - len;
        
        // Update counter numbers
        charCounter.textContent = charsLeft;
        
        // Update text classes and progress indicator
        charCounter.classList.remove('warning', 'danger');
        charWarning.classList.add('hidden');
        btnTweetPost.disabled = false;
        
        if (len > 280) {
            charCounter.classList.add('danger');
            charWarning.classList.remove('hidden');
            btnTweetPost.disabled = true;
        } else if (len >= 260) {
            charCounter.classList.add('warning');
        }

        // Animating the progress circle
        const ratio = Math.min(len, 280) / 280;
        const offset = circumference - (ratio * circumference);
        progressCircle.style.strokeDashoffset = offset;

        // Change color of circle stroke
        if (len > 280) {
            progressCircle.style.stroke = '#ef4444'; // Red
        } else if (len >= 260) {
            progressCircle.style.stroke = '#f59e0b'; // Amber
        } else {
            progressCircle.style.stroke = '#1d9bf0'; // Twitter Blue
        }
    }
});
