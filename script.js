const firebaseConfig = {
    apiKey: "AIzaSyC3JbrOoBXTtDNH-7tDbCzT6tECKJCtdjE",
    authDomain: "hacked-wifi-3d8ac.firebaseapp.com",
    projectId: "hacked-wifi-3d8ac",
    storageBucket: "hacked-wifi-3d8ac.firebasestorage.app",
    messagingSenderId: "893227799683",
    appId: "1:893227799683:web:8e556a16a23c21ce4a77b6",
    measurementId: "G-1DXKC8TQQ7"
};

try {
    firebase.initializeApp(firebaseConfig);
} catch (e) {
    console.warn('Firebase init warning:', e);
}

const auth = firebase.auth();

auth.setPersistence(firebase.auth.Auth.Persistence.NONE)
    .then(() => {
        console.log('Auth persistence set to NONE - login required every time');
    })
    .catch((error) => {
        console.error('Error setting persistence:', error);
    });

const db = firebase.firestore();
const storage = firebase.storage();

let currentUser = null;
let currentUserProfile = null;
let currentUserRole = 'student';
let allStudents = [];

const authContainer = document.getElementById('authContainer');
const appContent = document.getElementById('appContent');
const authError = document.getElementById('authError');
const authSuccess = document.getElementById('authSuccess');
const authLoading = document.getElementById('authLoading');
const loginForm = document.getElementById('loginForm');
const signupForm = document.getElementById('signupForm');
const loginStudentId = document.getElementById('loginStudentId');
const loginPassword = document.getElementById('loginPassword');
const loginBtn = document.getElementById('loginBtn');
const signupStudentId = document.getElementById('signupStudentId');
const signupFirstName = document.getElementById('signupFirstName');
const signupLastName = document.getElementById('signupLastName');
const signupPassword = document.getElementById('signupPassword');
const signupBtn = document.getElementById('signupBtn');
const showSignup = document.getElementById('showSignup');
const showLogin = document.getElementById('showLogin');

const userDisplayName = document.getElementById('userDisplayName');
const headerProfilePic = document.getElementById('headerProfilePic');
const headerProfilePlaceholder = document.getElementById('headerProfilePlaceholder');
const userInfo = document.getElementById('userInfo');

const subjectListView = document.getElementById('subjectListView');
const projectDetailView = document.getElementById('projectDetailView');
const chatView = document.getElementById('chatView');
const profileView = document.getElementById('profileView');
const fabChatBtn = document.getElementById('fabChatBtn');

function showAuthError(msg) {
    authError.textContent = msg;
    authError.classList.add('show');
    authSuccess.classList.remove('show');
}

function showAuthSuccess(msg) {
    authSuccess.textContent = msg;
    authSuccess.classList.add('show');
    authError.classList.remove('show');
}

function setAuthLoading(loading) {
    if (loading) {
        authLoading.classList.add('show');
    } else {
        authLoading.classList.remove('show');
    }
}

function toggleForms(showLoginForm) {
    if (showLoginForm) {
        loginForm.style.display = 'block';
        signupForm.style.display = 'none';
        authError.classList.remove('show');
        authSuccess.classList.remove('show');
    } else {
        loginForm.style.display = 'none';
        signupForm.style.display = 'block';
        authError.classList.remove('show');
        authSuccess.classList.remove('show');
    }
}

function cleanStudentId(id) {
    return id.replace(/[-\s]/g, '');
}

function formatStudentId(id) {
    return id.trim();
}

function isValidStudentId(id) {
    const parts = id.split('-');
    if (parts.length !== 2) return false;
    const prefix = parts[0];
    if (prefix !== '24' && prefix !== '26') return false;
    if (!parts[1] || parts[1].length === 0) return false;
    return true;
}

signupBtn.addEventListener('click', async () => {
    const studentIdRaw = signupStudentId.value.trim();
    const firstName = signupFirstName.value.trim();
    const lastName = signupLastName.value.trim();
    const password = signupPassword.value.trim();

    if (!studentIdRaw) { showAuthError('Please enter your Student ID.'); return; }
    if (!isValidStudentId(studentIdRaw)) {
        showAuthError('ID does not exist in SAMS PORTAL');
        return;
    }
    const studentId = formatStudentId(studentIdRaw);

    if (!firstName) { showAuthError('Please enter your first name.'); return; }
    if (!lastName) { showAuthError('Please enter your last name.'); return; }
    if (!password || password.length < 6) { showAuthError('Password must be at least 6 characters.'); return; }

    try {
        const existing = await db.collection('users')
            .where('studentId', '==', studentId)
            .get();
        if (!existing.empty) {
            showAuthError('This Student ID is already registered.');
            return;
        }
    } catch (err) {
        showAuthError('Error checking ID: ' + err.message);
        return;
    }

    setAuthLoading(true);
    const email = cleanStudentId(studentId) + '@school.edu';

    try {
        const cred = await auth.createUserWithEmailAndPassword(email, password);
        const user = cred.user;

        await db.collection('users').doc(user.uid).set({
            studentId: studentId,
            firstName: firstName,
            lastName: lastName,
            fullName: firstName + ' ' + lastName,
            email: email,
            uid: user.uid,
            bio: '',
            profilePicture: '',
            role: 'student',
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        showAuthSuccess('Account created! Welcome, ' + firstName);
        setTimeout(() => authSuccess.classList.remove('show'), 2000);

        signupStudentId.value = '';
        signupFirstName.value = '';
        signupLastName.value = '';
        signupPassword.value = '';
        toggleForms(true);

    } catch (error) {
        console.error('Signup error:', error);
        showAuthError(error.message);
    } finally {
        setAuthLoading(false);
    }
});

loginBtn.addEventListener('click', async () => {
    const studentIdRaw = loginStudentId.value.trim();
    const password = loginPassword.value.trim();

    if (!studentIdRaw) { showAuthError('Please enter your Student ID.'); return; }
    if (!isValidStudentId(studentIdRaw)) {
        showAuthError('ID does not exist in SAMS PORTAL');
        return;
    }
    const studentId = formatStudentId(studentIdRaw);
    if (!password) { showAuthError('Please enter your password.'); return; }

    setAuthLoading(true);
    const email = cleanStudentId(studentId) + '@school.edu';

    try {
        await auth.signInWithEmailAndPassword(email, password);
        authSuccess.classList.remove('show');
        authError.classList.remove('show');
        loginStudentId.value = '';
        loginPassword.value = '';
    } catch (error) {
        console.error('Login error:', error);
        if (error.code === 'auth/user-not-found') {
            showAuthError('ID does not exist in SAMS PORTAL');
        } else if (error.code === 'auth/wrong-password') {
            showAuthError('Incorrect password.');
        } else {
            showAuthError(error.message);
        }
        setAuthLoading(false);
    }
});

auth.onAuthStateChanged(async (user) => {
    setAuthLoading(false);

    if (user) {
        currentUser = user;
        try {
            const doc = await db.collection('users').doc(user.uid).get();
            if (doc.exists) {
                currentUserProfile = doc.data();
                currentUserRole = currentUserProfile.role || 'student';
                updateHeaderUI();
                updateManagementButton();
            } else {
                const studentId = formatStudentId(user.email.replace('@school.edu', ''));
                await db.collection('users').doc(user.uid).set({
                    studentId: studentId,
                    firstName: 'Student',
                    lastName: '',
                    fullName: 'Student',
                    email: user.email,
                    uid: user.uid,
                    bio: '',
                    profilePicture: '',
                    role: 'student',
                    createdAt: firebase.firestore.FieldValue.serverTimestamp()
                });
                currentUserProfile = { studentId, firstName: 'Student' };
                currentUserRole = 'student';
                updateHeaderUI();
                updateManagementButton();
            }
        } catch (err) {
            console.error('Error fetching profile:', err);
        }

        authContainer.style.display = 'none';
        appContent.classList.add('show');

        await loadAllStudents();
        renderSubjects();

    } else {
        currentUser = null;
        currentUserProfile = null;
        currentUserRole = 'student';
        authContainer.style.display = 'flex';
        appContent.classList.remove('show');
        toggleForms(true);
        authError.classList.remove('show');
        authSuccess.classList.remove('show');
        setAuthLoading(false);
    }
});

function updateHeaderUI() {
    if (!currentUserProfile) return;
    userDisplayName.textContent = currentUserProfile.firstName || 'Student';

    if (currentUserProfile.profilePicture) {
        headerProfilePic.src = currentUserProfile.profilePicture;
        headerProfilePic.style.display = 'block';
        headerProfilePlaceholder.style.display = 'none';
    } else {
        headerProfilePic.style.display = 'none';
        headerProfilePlaceholder.style.display = 'block';
    }
}

function updateManagementButton() {
    const container = document.getElementById('managementButtonContainer');
    if (!container) return;
    const role = currentUserRole;
    if (role === 'admin' || role === 'developer' || role === 'teacher') {
        container.innerHTML = `<a href="panel.html" class="management-btn"><i class="fas fa-user-cog"></i> MANAGEMENT</a>`;
    } else {
        container.innerHTML = '';
    }
}

userInfo.addEventListener('click', () => {
    showView('profileView');
    loadProfile();
});

document.getElementById('logoutFromProfileBtn').addEventListener('click', async () => {
    try {
        await auth.signOut();
        showToast('Logged out successfully.', 'success');
        authContainer.style.display = 'flex';
        appContent.classList.remove('show');
        toggleForms(true);
        loginStudentId.value = '';
        loginPassword.value = '';
    } catch (error) {
        showToast('Logout failed: ' + error.message, 'error');
    }
});

showSignup.addEventListener('click', (e) => {
    e.preventDefault();
    toggleForms(false);
});
showLogin.addEventListener('click', (e) => {
    e.preventDefault();
    toggleForms(true);
});

loginPassword.addEventListener('keydown', (e) => { if (e.key === 'Enter') loginBtn.click(); });
signupPassword.addEventListener('keydown', (e) => { if (e.key === 'Enter') signupBtn.click(); });

const toastContainer = document.getElementById('toastContainer');

function showToast(message, type = 'info', duration = 3500) {
    const iconMap = { info: 'fa-circle-info', success: 'fa-check-circle', error: 'fa-exclamation-circle' };
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `<i class="fas ${iconMap[type] || iconMap.info}"></i> ${message}`;
    toastContainer.appendChild(toast);
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(20px)';
        toast.style.transition = 'all 0.2s ease';
        setTimeout(() => toast.remove(), 250);
    }, duration);
}

const RAW_COURSES = [
    { code: "INTCOM", teacher: "DAROY, KERRY ANN", units: 3.0, type: "LEC", section: "IT102A", room: "C-412",
        time: "08:00 Am - 09:00 Am", day: "MWF" },
    { code: "COPRO1", teacher: "CADUNGOG, QUENIE ANN", units: 3.0, type: "LEC", section: "IT102A",
        room: "C-DR303", time: "10:00 Am - 11:00 Am", day: "MW" },
    { code: "COPRO1", teacher: "CADUNGOG, QUENIE ANN", units: 3.0, type: "LAB", section: "IT102A",
        room: "C-3CL3", time: "11:00 Am - 12:00 Pm", day: "MWF" },
    { code: "COMPOP", teacher: "DAROY, KERRY ANN", units: 3.0, type: "LEC", section: "IT102A", room: "C-DR303",
        time: "10:30 Am - 11:30 Am", day: "TTh" },
    { code: "COMPOP", teacher: "DAROY, KERRY ANN", units: 3.0, type: "LAB", section: "IT102A", room: "C-3CL3",
        time: "11:30 Am - 01:00 Pm", day: "TTh" },
    { code: "JRIZAL", teacher: "CANDELARIO, JENNIFER", units: 3.0, type: "LEC", section: "IT102A", room: "C-412",
        time: "12:00 Pm - 01:00 Pm", day: "MWF" },
    { code: "SCITEC", teacher: "ORIENDO, PAUL JAY", units: 3.0, type: "LEC", section: "IT102A", room: "C-409",
        time: "07:00 Am - 08:00 Am", day: "MWF" },
    { code: "ENGFUN", teacher: "IBAÑEZ, GREECE", units: 3.0, type: "LEC", section: "IT102A", room: "C-406",
        time: "07:00 Am - 08:30 Am", day: "TTh" },
    { code: "PAFIT1", teacher: "NIALA JR., LEONIDES", units: 2.0, type: "LEC", section: "IT102A", room: "C-GYM2",
        time: "01:00 Pm - 03:00 Pm", day: "M" },
    { code: "NSTP01", teacher: "LONGINOS, JESUS JR.", units: 3.0, type: "LEC", section: "ELITE", room: "TBA",
        time: "5:00 Pm - 6:30 Pm", day: "Sat" }
];

const subjectsMap = {};
RAW_COURSES.forEach(c => {
    if (!subjectsMap[c.code]) {
        subjectsMap[c.code] = {
            code: c.code,
            teacher: c.teacher,
            types: [],
            schedule: []
        };
    }
    subjectsMap[c.code].types.push(c.type);
    subjectsMap[c.code].schedule.push({ time: c.time, day: c.day, room: c.room });
});
const SUBJECTS = Object.values(subjectsMap);

let currentSubject = null;
let projectsCache = {};
let currentTotalBytes = 0;
const MAX_BYTES = 5 * 1024 * 1024 * 1024;

const subjectListEl = document.getElementById('subjectList');
const subjectCount = document.getElementById('subjectCount');
const detailSubjectTitle = document.getElementById('detailSubjectTitle');
const detailTeacherTime = document.getElementById('detailTeacherTime');
const projectListEl = document.getElementById('projectList');
const backBtn = document.getElementById('backToSubjectsBtn');
const uploadBtn = document.getElementById('uploadProjectBtn');
const backFromChatBtn = document.getElementById('backFromChatBtn');
const chatBackToListBtn = document.getElementById('chatBackToListBtn');
const backFromProfileBtn = document.getElementById('backFromProfileBtn');

const modalOverlay = document.getElementById('modalOverlay');
const modalBody = document.getElementById('modalBody');
const modalCloseBtn = document.getElementById('modalCloseBtn');

const commentModalOverlay = document.getElementById('commentModalOverlay');
const commentModalBody = document.getElementById('commentModalBody');
const commentModalCloseBtn = document.getElementById('commentModalCloseBtn');

const newChatModalOverlay = document.getElementById('newChatModalOverlay');
const newChatModalBody = document.getElementById('newChatModalBody');
const newChatModalCloseBtn = document.getElementById('newChatModalCloseBtn');

const addMembersModalOverlay = document.getElementById('addMembersModalOverlay');
const addMembersModalBody = document.getElementById('addMembersModalBody');
const addMembersModalCloseBtn = document.getElementById('addMembersModalCloseBtn');

const chatListContainer = document.getElementById('chatListContainer');
const chatMessagesContainer = document.getElementById('chatMessagesContainer');
const chatUserList = document.getElementById('chatUserList');
const messagesList = document.getElementById('messagesList');
const chatHeader = document.getElementById('chatHeader');
const chatInputArea = document.getElementById('chatInputArea');
const chatMessageInput = document.getElementById('chatMessageInput');
const sendMessageBtn = document.getElementById('sendMessageBtn');

const profilePictureImg = document.getElementById('profilePictureImg');
const profilePicturePlaceholder = document.getElementById('profilePicturePlaceholder');
const profilePictureInput = document.getElementById('profilePictureInput');
const profileStudentId = document.getElementById('profileStudentId');
const profileFirstName = document.getElementById('profileFirstName');
const profileLastName = document.getElementById('profileLastName');
const profileBio = document.getElementById('profileBio');
const saveProfileBtn = document.getElementById('saveProfileBtn');

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function formatFileSize(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    const val = bytes / Math.pow(k, i);
    return parseFloat(val.toFixed(i === 0 ? 0 : 2)) + ' ' + sizes[i];
}

function setProjectLoading(loading) {
    if (loading) {
        projectListEl.innerHTML = `
            <div class="loading-container">
                <div class="spinner"></div>
                <p>Loading projects...</p>
            </div>
        `;
    }
}

function closeModal() {
    modalOverlay.classList.remove('active');
}
modalCloseBtn.addEventListener('click', closeModal);
modalOverlay.addEventListener('click', (e) => {
    if (e.target === modalOverlay) closeModal();
});

function closeCommentModal() {
    commentModalOverlay.classList.remove('active');
}
commentModalCloseBtn.addEventListener('click', closeCommentModal);
commentModalOverlay.addEventListener('click', (e) => {
    if (e.target === commentModalOverlay) closeCommentModal();
});

function closeNewChatModal() {
    newChatModalOverlay.classList.remove('active');
}
newChatModalCloseBtn.addEventListener('click', closeNewChatModal);
newChatModalOverlay.addEventListener('click', (e) => {
    if (e.target === newChatModalOverlay) closeNewChatModal();
});

function closeAddMembersModal() {
    addMembersModalOverlay.classList.remove('active');
}
addMembersModalCloseBtn.addEventListener('click', closeAddMembersModal);
addMembersModalOverlay.addEventListener('click', (e) => {
    if (e.target === addMembersModalOverlay) closeAddMembersModal();
});

document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        closeModal();
        closeCommentModal();
        closeNewChatModal();
        closeAddMembersModal();
    }
});

function showView(viewId) {
    [subjectListView, projectDetailView, chatView, profileView].forEach(el => {
        el.style.display = 'none';
    });
    if (viewId) {
        document.getElementById(viewId).style.display = 'block';
    }
    if (viewId !== 'chatView') {
        resetChatMobileView();
    }
}

function isMobile() {
    return window.innerWidth <= 768;
}

function resetChatMobileView() {
    if (isMobile()) {
        chatListContainer.style.display = 'flex';
        chatMessagesContainer.style.display = 'none';
        chatBackToListBtn.style.display = 'none';
    } else {
        chatListContainer.style.display = 'flex';
        chatMessagesContainer.style.display = 'flex';
        chatBackToListBtn.style.display = 'none';
        chatMessagesContainer.classList.remove('active');
    }
}

backBtn.addEventListener('click', () => {
    showView('subjectListView');
    currentSubject = null;
});

backFromChatBtn.addEventListener('click', () => {
    showView('subjectListView');
    if (window._unsubscribeMessages) {
        window._unsubscribeMessages();
        window._unsubscribeMessages = null;
    }
    resetChatMobileView();
});

chatBackToListBtn.addEventListener('click', () => {
    chatListContainer.style.display = 'flex';
    chatMessagesContainer.style.display = 'none';
    chatBackToListBtn.style.display = 'none';
    chatMessagesContainer.classList.remove('active');
    chatHeader.innerHTML = '';
    messagesList.innerHTML = '';
    chatInputArea.style.display = 'none';
    if (window._unsubscribeMessages) {
        window._unsubscribeMessages();
        window._unsubscribeMessages = null;
    }
});

backFromProfileBtn.addEventListener('click', () => {
    showView('subjectListView');
});

fabChatBtn.addEventListener('click', () => {
    if (chatView.style.display === 'none') {
        showView('chatView');
        resetChatMobileView();
        renderChatList();
    } else {
        showView('subjectListView');
        if (window._unsubscribeMessages) {
            window._unsubscribeMessages();
            window._unsubscribeMessages = null;
        }
        resetChatMobileView();
    }
});

function renderSubjects() {
    subjectListEl.innerHTML = '';
    SUBJECTS.forEach(subject => {
        const card = document.createElement('div');
        card.className = 'subject-card';
        const typesStr = subject.types.join(' / ');
        const scheduleStr = subject.schedule.map(s => `${s.time} ${s.day}`).join(' | ');
        card.innerHTML = `
            <div class="subject-code">${escapeHtml(subject.code)}</div>
            <div class="subject-teacher"><i class="fas fa-chalkboard-teacher"></i>${escapeHtml(subject.teacher)}</div>
            <div class="subject-types"><span>${escapeHtml(typesStr)}</span></div>
            <div class="subject-schedule"><i class="far fa-clock"></i> ${escapeHtml(scheduleStr)}</div>
            <div class="subject-badge"><i class="fas fa-folder-open"></i> View Projects</div>
        `;
        card.addEventListener('click', () => openSubject(subject.code));
        subjectListEl.appendChild(card);
    });
    subjectCount.textContent = `${SUBJECTS.length} subjects`;
}

async function openSubject(code) {
    const subject = SUBJECTS.find(s => s.code === code);
    if (!subject) return;
    currentSubject = code;
    showView('projectDetailView');
    detailSubjectTitle.textContent = code;
    const typesStr = subject.types.join(' / ');
    const scheduleStr = subject.schedule.map(s => `${s.time} ${s.day}`).join(' | ');
    detailTeacherTime.innerHTML =
        `<i class="fas fa-chalkboard-teacher"></i> ${escapeHtml(subject.teacher)} &bull; ${escapeHtml(typesStr)} &bull; <i class="far fa-clock"></i> ${escapeHtml(scheduleStr)}`;
    await loadProjects(code);
}

async function loadProjects(courseCode) {
    setProjectLoading(true);
    try {
        const uid = currentUser.uid;
        const snapshot = await db.collection('projects')
            .where('course', '==', courseCode)
            .get();

        const projects = [];
        snapshot.forEach(doc => {
            const data = doc.data();
            const isOwner = data.owner === uid;
            const isParticipant = data.participants && data.participants.includes(uid);
            const isGeneral = data.visibility === 'general' || !data.visibility;

            if (isGeneral || isOwner || isParticipant) {
                projects.push({ id: doc.id, ...data });
            }
        });

        projects.sort((a, b) => (b.timestamp?.seconds || 0) - (a.timestamp?.seconds || 0));
        projectsCache[courseCode] = projects;
        renderProjects(projects);
    } catch (error) {
        console.error('Load projects error:', error);
        showToast('Failed to load projects: ' + error.message, 'error');
        projectListEl.innerHTML = `
            <div class="empty-state" style="padding:1.5rem;">
                <i class="fas fa-triangle-exclamation" style="color:#ff6b6b;font-size:2rem;"></i>
                <h3 style="color:#c8d6e5;margin:0.5rem 0;">Failed to load projects</h3>
                <p style="font-size:0.8rem;color:#6a8a7a;">${escapeHtml(error.message)}</p>
                <button class="btn btn-primary btn-sm" style="margin-top:0.8rem;" onclick="loadProjects('${courseCode}')">
                    <i class="fas fa-sync-alt"></i> Retry
                </button>
            </div>
        `;
    }
}

function renderProjects(projects) {
    if (projects.length === 0) {
        projectListEl.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-folder-open"></i>
                <div>No projects available for you in this subject.</div>
                <div style="margin-top:0.5rem;font-size:0.7rem;color:#4a6a5a;">
                    <i class="fas fa-info-circle"></i> Upload your first project or check General projects.
                </div>
            </div>
        `;
        return;
    }

    projectListEl.innerHTML = projects.map(p => {
        const files = p.files || [];
        const links = p.links || [];
        const comments = p.comments || [];
        const dateStr = p.timestamp ? new Date(p.timestamp.seconds * 1000).toLocaleDateString() : '';
        const visibility = p.visibility || 'personal';
        const visBadge = `<span class="visibility-badge ${visibility}">${visibility === 'personal' ? '🔒 Personal' : '🌐 General'}</span>`;

        let groupBadge = '';
        if (p.type && p.type.startsWith('group')) {
            const groupNum = p.type.replace('group', '');
            groupBadge = `<span class="group-number-badge"><i class="fas fa-users"></i> Group ${escapeHtml(groupNum)}</span>`;
        }

        const commentCount = comments.length;
        const isOwner = p.owner === currentUser.uid;

        const fileBadges = files.map(f => `
            <span class="file-tag" onclick="previewFile('${f.url}','${escapeHtml(f.name)}','${escapeHtml(f.mimeType || '')}')">
                <i class="fas fa-file"></i> ${escapeHtml(f.name)}
            </span>
        `).join('');

        const linkBadges = links.map(l => `
            <span class="file-tag link-tag">
                <i class="fas fa-link" style="color:#34d399;"></i> <a href="${escapeHtml(l.url)}" target="_blank" style="color:#34d399;text-decoration:none;">${escapeHtml(l.title)}</a>
            </span>
        `).join('');

        let memberNames = '';
        if (p.participants && p.participants.length > 1) {
            const memberUids = p.participants.filter(uid => uid !== p.owner);
            const memberStudents = memberUids.map(uid => allStudents.find(s => s.uid === uid)).filter(Boolean);
            if (memberStudents.length > 0) {
                memberNames = `<div style="font-size:0.6rem;color:#4a6a5a;margin-top:0.1rem;">
                    <i class="fas fa-user-friends"></i> Members: ${memberStudents.map(s => `${s.firstName} ${s.lastName}`).join(', ')}
                </div>`;
            }
        }

        return `
            <div class="project-item-full" data-id="${p.id}">
                <div class="project-top">
                    <div class="project-title">
                        <i class="fas fa-${p.type && p.type.startsWith('group') ? 'users' : 'user'}"></i>
                        ${escapeHtml(p.title)}
                        ${isOwner ? ' <span style="font-size:0.5rem;color:#34d399;">(Owner)</span>' : ''}
                    </div>
                    <div style="display:flex;gap:0.3rem;flex-wrap:wrap;">
                        ${p.type && p.type !== 'personal' ? `<span class="project-type-badge">${p.type === 'individual' ? 'Individual' : p.type}</span>` : ''}
                        ${groupBadge}
                        ${visBadge}
                    </div>
                </div>
                ${memberNames}
                ${p.description ? `<div style="font-size:0.75rem;color:#6a8a7a;margin:0.1rem 0 0.2rem;">${escapeHtml(p.description)}</div>` : ''}
                <div class="project-meta">
                    <span><i class="fas fa-file"></i> ${files.length}</span>
                    <span><i class="fas fa-link"></i> ${links.length}</span>
                    <span><i class="fas fa-comment"></i> ${commentCount}</span>
                    ${dateStr ? `<span><i class="far fa-calendar-alt"></i> ${dateStr}</span>` : ''}
                </div>
                ${fileBadges ? `<div style="margin:0.15rem 0;display:flex;flex-wrap:wrap;gap:0.1rem;">${fileBadges}</div>` : ''}
                ${linkBadges ? `<div style="margin:0.15rem 0;display:flex;flex-wrap:wrap;gap:0.1rem;">${linkBadges}</div>` : ''}
                <div class="project-actions-row">
                    <button class="btn btn-open" onclick="openProject('${p.id}')"><i class="fas fa-eye"></i> Open</button>
                    <button class="btn btn-comment" onclick="openCommentModal('${p.id}')">
                        <i class="fas fa-comment"></i> Comment ${commentCount > 0 ? `<span class="comment-count-badge">${commentCount}</span>` : ''}
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

let selectedMembers = [];

function resetSelectedMembers() {
    selectedMembers = [];
    updateMemberTags();
}

function updateMemberTags() {
    const container = document.getElementById('selectedMembersContainer');
    if (!container) return;
    container.innerHTML = '';
    selectedMembers.forEach(uid => {
        const student = allStudents.find(s => s.uid === uid);
        if (!student) return;
        const tag = document.createElement('span');
        tag.className = 'selected-member-tag';
        tag.innerHTML = `${escapeHtml(student.firstName || '')} ${escapeHtml(student.lastName || '')} <span class="remove-member" data-uid="${uid}">&times;</span>`;
        tag.querySelector('.remove-member').addEventListener('click', function(e) {
            e.stopPropagation();
            selectedMembers = selectedMembers.filter(u => u !== uid);
            updateMemberTags();
        });
        container.appendChild(tag);
    });
}

uploadBtn.addEventListener('click', () => {
    if (!currentSubject) {
        showToast('Please select a subject first.', 'error');
        return;
    }
    resetSelectedMembers();

    modalBody.innerHTML = `
        <div class="modal-title"><i class="fas fa-upload"></i> Upload Project for ${escapeHtml(currentSubject)}</div>

        <div class="form-group">
            <label><i class="fas fa-eye"></i> Visibility</label>
            <select id="uploadVisibility">
                <option value="personal">🔒 Personal (only you can see)</option>
                <option value="general">🌐 General (everyone can see)</option>
            </select>
        </div>

        <div id="uploadDynamicFields">
            <div class="form-group">
                <label>Project Title</label>
                <input type="text" id="uploadProjectTitle" placeholder="Enter project title..." />
            </div>

            <div id="generalFields" style="display:none;">
                <div class="form-group">
                    <label>Type of Activity</label>
                    <select id="uploadProjectType">
                        <option value="individual">Individual</option>
                        ${Array.from({length: 10}, (_, i) => i + 1).map(n => `<option value="group${n}">Group ${n}</option>`).join('')}
                    </select>
                </div>
                <div class="form-group" id="addMembersGroup">
                    <label>Members <span style="font-weight:normal;color:#6a8a7a;">(click button to add)</span></label>
                    <div style="display:flex; gap:0.5rem; align-items:center; flex-wrap:wrap;">
                        <button class="btn btn-primary btn-sm" id="addMembersBtn"><i class="fas fa-user-plus"></i> Add Members</button>
                        <div id="selectedMembersContainer" class="selected-members-container"></div>
                    </div>
                </div>
            </div>

            <div class="form-group">
                <label>Upload Files (multiple allowed)</label>
                <input type="file" id="uploadProjectFiles" multiple />
                <div class="file-name-preview" id="uploadFilePreview"></div>
            </div>
        </div>

        <div class="modal-actions">
            <button class="btn btn-success" id="submitUploadBtn"><i class="fas fa-upload"></i> Upload</button>
            <button class="btn btn-outline" onclick="closeModal()">Cancel</button>
        </div>
    `;
    modalOverlay.classList.add('active');

    const visibilitySelect = document.getElementById('uploadVisibility');
    const generalFields = document.getElementById('generalFields');
    const addMembersGroup = document.getElementById('addMembersGroup');
    const typeSelect = document.getElementById('uploadProjectType');

    function toggleGeneralFields() {
        if (visibilitySelect.value === 'general') {
            generalFields.style.display = 'block';
            addMembersGroup.style.display = typeSelect.value === 'individual' ? 'none' : 'block';
            if (typeSelect.value === 'individual') {
                resetSelectedMembers();
            }
        } else {
            generalFields.style.display = 'none';
            resetSelectedMembers();
        }
    }

    visibilitySelect.addEventListener('change', toggleGeneralFields);
    typeSelect.addEventListener('change', function() {
        addMembersGroup.style.display = this.value === 'individual' ? 'none' : 'block';
        if (this.value === 'individual') {
            resetSelectedMembers();
        }
    });

    toggleGeneralFields();

    const fileInput = document.getElementById('uploadProjectFiles');
    const preview = document.getElementById('uploadFilePreview');
    fileInput.addEventListener('change', function() {
        preview.innerHTML = '';
        for (let f of this.files) {
            const tag = document.createElement('span');
            tag.className = 'file-tag';
            tag.textContent = f.name;
            preview.appendChild(tag);
        }
    });

    document.getElementById('addMembersBtn').addEventListener('click', function() {
        addMembersModalBody.innerHTML = `
            <div class="modal-title"><i class="fas fa-user-plus"></i> Select Members</div>
            <div style="max-height:300px; overflow-y:auto;">
                ${allStudents.map(s => `
                    <div class="member-list-item">
                        <input type="checkbox" class="member-checkbox" value="${s.uid}" ${selectedMembers.includes(s.uid) ? 'checked' : ''} />
                        <span class="member-name">${escapeHtml(s.firstName || '')} ${escapeHtml(s.lastName || '')}</span>
                        <span class="member-id">${escapeHtml(s.studentId || '')}</span>
                    </div>
                `).join('')}
                ${allStudents.length === 0 ? '<p style="color:#4a6a5a;text-align:center;padding:1rem;">No other students found.</p>' : ''}
            </div>
            <div class="modal-actions">
                <button class="btn btn-primary" id="confirmMembersBtn"><i class="fas fa-check"></i> Confirm</button>
                <button class="btn btn-outline" onclick="closeAddMembersModal()">Cancel</button>
            </div>
        `;
        addMembersModalOverlay.classList.add('active');

        document.getElementById('confirmMembersBtn').addEventListener('click', function() {
            const checkboxes = document.querySelectorAll('.member-checkbox:checked');
            selectedMembers = Array.from(checkboxes).map(cb => cb.value);
            updateMemberTags();
            closeAddMembersModal();
            showToast(`${selectedMembers.length} member(s) selected.`, 'success');
        });
    });

    document.getElementById('submitUploadBtn').addEventListener('click', async function() {
        const visibility = document.getElementById('uploadVisibility').value;
        const title = document.getElementById('uploadProjectTitle').value.trim();
        const type = document.getElementById('uploadProjectType')?.value || 'individual';
        const files = document.getElementById('uploadProjectFiles').files;
        const uid = currentUser.uid;

        if (!title) { showToast('Please enter a title.', 'error'); return; }

        if (visibility === 'general' && type !== 'individual' && selectedMembers.length === 0) {
            showToast('Please add at least one member for a group activity.', 'error');
            return;
        }

        const btn = this;
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Uploading...';

        let participants = [uid];
        if (visibility === 'general') {
            participants = [uid, ...selectedMembers];
        }

        try {
            const projectData = {
                course: currentSubject,
                visibility: visibility,
                title: title,
                owner: uid,
                participants: participants,
                files: [],
                links: [],
                comments: [],
                timestamp: firebase.firestore.FieldValue.serverTimestamp()
            };

            if (visibility === 'general') {
                projectData.type = type;
            } else {
                projectData.type = 'personal';
            }
            projectData.description = '';

            const projectRef = await db.collection('projects').add(projectData);
            const projectId = projectRef.id;
            let uploadedFiles = [];

            for (const file of files) {
                if (currentTotalBytes + file.size > MAX_BYTES) {
                    showToast(`Storage limit exceeded! Skipping ${file.name}`, 'error');
                    continue;
                }
                const storageRef = storage.ref('projects/' + projectId + '/' + Date.now() + '_' + file.name);
                await storageRef.put(file);
                const downloadURL = await storageRef.getDownloadURL();
                uploadedFiles.push({
                    name: file.name,
                    url: downloadURL,
                    size: file.size,
                    mimeType: file.type
                });
                currentTotalBytes += file.size;
            }

            if (uploadedFiles.length > 0) {
                await db.collection('projects').doc(projectId).update({
                    files: firebase.firestore.FieldValue.arrayUnion(...uploadedFiles)
                });
                await db.collection('metadata').doc('storageUsage').set({ totalBytes: currentTotalBytes });
            }

            showToast(`✅ "${title}" uploaded for ${currentSubject}!`, 'success');
            closeModal();
            resetSelectedMembers();
            await loadProjects(currentSubject);
        } catch (error) {
            console.error('Upload error:', error);
            showToast('❌ Upload failed: ' + error.message, 'error');
        } finally {
            btn.disabled = false;
            btn.innerHTML = '<i class="fas fa-upload"></i> Upload';
        }
    });
});

window.openProject = function(projectId) {
    const project = projectsCache[currentSubject]?.find(p => p.id === projectId);
    if (!project) { showToast('Project not found.', 'error'); return; }

    const files = project.files || [];
    const visibility = project.visibility || 'personal';
    const visBadge = `<span class="visibility-badge ${visibility}">${visibility === 'personal' ? '🔒 Personal' : '🌐 General'}</span>`;

    let groupInfo = '';
    if (project.type && project.type.startsWith('group')) {
        groupInfo = `<span class="group-number-badge"><i class="fas fa-users"></i> ${project.type.replace('group', 'Group ')}</span>`;
    }

    let slideshowHtml = '';
    let hasFiles = files.length > 0;
    if (hasFiles) {
        let slides = files.map((f, idx) => {
            const isImage = f.mimeType && f.mimeType.startsWith('image/');
            const isVideo = f.mimeType && f.mimeType.startsWith('video/');
            let content = '';
            if (isImage) {
                content =
                    `<img src="${f.url}" alt="${escapeHtml(f.name)}" style="width:100%;max-height:55vh;object-fit:contain;" />`;
            } else if (isVideo) {
                content =
                    `<video controls style="width:100%;max-height:55vh;"><source src="${f.url}" type="${f.mimeType}">Your browser does not support the video tag.</video>`;
            } else {
                content =
                    `<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;padding:2rem;color:#6a8a7a;">
                        <i class="fas fa-file" style="font-size:3rem;margin-bottom:0.5rem;"></i>
                        <p>${escapeHtml(f.name)}</p>
                        <p style="font-size:0.7rem;">${formatFileSize(f.size || 0)}</p>
                    </div>`;
            }
            return `<div class="slide" data-index="${idx}" style="${idx === 0 ? 'display:block;' : 'display:none;'}">${content}</div>`;
        }).join('');

        const slideCount = files.length;
        slideshowHtml = `
            <div class="slideshow-container" id="slideshowContainer">
                ${slides}
                ${slideCount > 1 ? `
                    <div class="slideshow-nav">
                        <button onclick="changeSlide(-1)"><i class="fas fa-chevron-left"></i></button>
                        <button onclick="changeSlide(1)"><i class="fas fa-chevron-right"></i></button>
                    </div>
                ` : ''}
            </div>
            ${slideCount > 1 ? `<div class="slide-counter"><span id="slideCounter">1 / ${slideCount}</span></div>` : ''}
            <div class="file-info-bar">
                <span id="slideFileName">${escapeHtml(files[0].name)}</span>
                <span id="slideFileSize">${formatFileSize(files[0].size || 0)}</span>
            </div>
        `;
        window._slideshowFiles = files;
        window._currentSlide = 0;
    } else {
        slideshowHtml = `
            <div class="slideshow-container" style="min-height:100px;display:flex;align-items:center;justify-content:center;color:#4a6a5a;">
                <p><i class="fas fa-image" style="margin-right:0.3rem;"></i> No files attached to this project.</p>
            </div>
        `;
    }

    modalBody.innerHTML = `
        <div class="modal-title">${escapeHtml(project.title)}</div>
        <div style="display:flex;gap:0.5rem;flex-wrap:wrap;margin-bottom:0.3rem;">
            ${project.type && project.type !== 'personal' ? `<span class="project-type-badge">${project.type === 'individual' ? 'Individual' : project.type}</span>` : ''}
            ${groupInfo}
            ${visBadge}
        </div>
        ${project.description ? `<p style="color:#6a8a7a;font-size:0.85rem;margin-bottom:0.5rem;">${escapeHtml(project.description)}</p>` : ''}
        ${slideshowHtml}
        <div class="modal-action-buttons">
            <button class="btn btn-primary" id="presentationBtn"><i class="fas fa-expand"></i> Presentation</button>
            <button class="btn btn-success" id="downloadBtn"><i class="fas fa-download"></i> Download</button>
            <button class="btn btn-outline" id="closeModalBtn">Close</button>
        </div>
    `;
    modalOverlay.classList.add('active');

    window.changeSlide = function(direction) {
        if (!window._slideshowFiles || window._slideshowFiles.length === 0) return;
        const total = window._slideshowFiles.length;
        let newIndex = window._currentSlide + direction;
        if (newIndex < 0) newIndex = total - 1;
        if (newIndex >= total) newIndex = 0;
        window._currentSlide = newIndex;

        const slides = document.querySelectorAll('.slide');
        slides.forEach((s, i) => {
            s.style.display = i === newIndex ? 'block' : 'none';
        });
        const counter = document.getElementById('slideCounter');
        if (counter) counter.textContent = `${newIndex + 1} / ${total}`;
        const file = window._slideshowFiles[newIndex];
        const nameEl = document.getElementById('slideFileName');
        const sizeEl = document.getElementById('slideFileSize');
        if (nameEl) nameEl.textContent = file.name;
        if (sizeEl) sizeEl.textContent = formatFileSize(file.size || 0);
        const downloadBtn = document.getElementById('downloadBtn');
        if (downloadBtn) {
            downloadBtn.setAttribute('onclick', `window.open('${file.url}','_blank')`);
        }
        const presBtn = document.getElementById('presentationBtn');
        if (presBtn) {
            presBtn.setAttribute('data-url', file.url);
        }
    };

    const presentationBtn = document.getElementById('presentationBtn');
    if (presentationBtn) {
        presentationBtn.addEventListener('click', function() {
            const slideshow = document.getElementById('slideshowContainer');
            if (slideshow) {
                if (document.fullscreenElement) {
                    document.exitFullscreen();
                } else {
                    slideshow.requestFullscreen().catch(err => {
                        const file = window._slideshowFiles?.[window._currentSlide];
                        if (file) window.open(file.url, '_blank');
                    });
                }
            }
        });
    }

    const downloadBtn = document.getElementById('downloadBtn');
    if (downloadBtn) {
        downloadBtn.addEventListener('click', function() {
            const file = window._slideshowFiles?.[window._currentSlide];
            if (file) {
                window.open(file.url, '_blank');
            } else if (hasFiles) {
                window.open(files[0].url, '_blank');
            } else {
                showToast('No file to download.', 'error');
            }
        });
    }

    document.getElementById('closeModalBtn').addEventListener('click', function() {
        closeModal();
    });
};

window.previewFile = function(url, name, mimeType) {
    if (mimeType && (mimeType.startsWith('image/') || mimeType.startsWith('video/'))) {
        const isVideo = mimeType.startsWith('video/');
        const content = isVideo ?
            `<video controls style="max-width:100%;max-height:300px;"><source src="${url}" type="${mimeType}">Your browser does not support the video tag.</video>` :
            `<img src="${url}" alt="${escapeHtml(name)}" style="max-width:100%;max-height:300px;border-radius:8px;" />`;
        modalBody.innerHTML = `
            <div class="modal-title">${escapeHtml(name)}</div>
            <div class="file-preview-container">${content}</div>
            <div class="modal-actions">
                <button class="btn btn-primary" onclick="window.open('${url}','_blank')"><i class="fas fa-external-link-alt"></i> Open Full</button>
                <button class="btn btn-outline" onclick="closeModal()">Close</button>
            </div>
        `;
        modalOverlay.classList.add('active');
    } else {
        window.open(url, '_blank');
    }
};

window.openCommentModal = function(projectId) {
    const project = projectsCache[currentSubject]?.find(p => p.id === projectId);
    if (!project) { showToast('Project not found.', 'error'); return; }

    const comments = project.comments || [];
    const commentsHtml = comments.slice().reverse().map((c, index) => {
        const timeStr = c.timestamp ? c.timestamp.toDate().toLocaleString() : '';
        const initial = c.commenterName ? c.commenterName.charAt(0).toUpperCase() : '?';
        const canDelete = (currentUser.uid === c.commenterUid);
        const deleteBtn = canDelete ?
            `<span class="comment-delete-btn" onclick="deleteComment('${projectId}', ${index})"><i class="fas fa-trash-alt"></i></span>` : '';
        return `
            <div class="comment-card">
                <div class="comment-avatar">${initial}</div>
                <span class="comment-text"><strong>${escapeHtml(c.commenterName || 'Unknown')}</strong>: ${escapeHtml(c.text)}</span>
                <span class="comment-time">${timeStr}</span>
                ${deleteBtn}
            </div>
        `;
    }).join('');

    commentModalBody.innerHTML = `
        <div class="modal-title">💬 Comments on "${escapeHtml(project.title)}"</div>
        <div style="font-size:0.75rem;color:#6a8a7a;margin-bottom:0.3rem;">${comments.length} comment${comments.length !== 1 ? 's' : ''}</div>
        <div class="comment-list">
            ${commentsHtml || '<p style="color:#4a6a5a;font-size:0.8rem;text-align:center;padding:1rem;">No comments yet. Be the first to comment!</p>'}
        </div>
        <div class="comment-input-area">
            <input type="text" id="commentModalInput" placeholder="Write a comment..." />
            <button id="commentModalSubmit"><i class="fas fa-paper-plane"></i></button>
        </div>
        <div class="modal-actions">
            <button class="btn btn-outline" onclick="closeCommentModal()">Close</button>
        </div>
    `;
    commentModalOverlay.classList.add('active');

    const submitBtn = document.getElementById('commentModalSubmit');
    const input = document.getElementById('commentModalInput');
    if (submitBtn && input) {
        submitBtn.addEventListener('click', async function() {
            const text = input.value.trim();
            if (!text) { showToast('Please enter a comment.', 'error'); return; }
            try {
                const projectRef = db.collection('projects').doc(projectId);
                await projectRef.update({
                    comments: firebase.firestore.FieldValue.arrayUnion({
                        text: text,
                        timestamp: firebase.firestore.Timestamp.now(),
                        commenterUid: currentUser.uid,
                        commenterName: currentUserProfile.fullName || currentUserProfile.firstName || 'Student'
                    })
                });
                input.value = '';
                showToast('Comment added.', 'success');
                await openCommentModal(projectId);
                await loadProjects(currentSubject);
            } catch (error) {
                showToast('Failed to add comment: ' + error.message, 'error');
            }
        });
        input.addEventListener('keydown', function(e) {
            if (e.key === 'Enter') {
                submitBtn.click();
            }
        });
    }
};

window.deleteComment = async function(projectId, commentIndex) {
    if (!confirm('Delete this comment?')) return;
    try {
        const projectRef = db.collection('projects').doc(projectId);
        const doc = await projectRef.get();
        if (!doc.exists) return;
        const data = doc.data();
        const comments = data.comments || [];
        const originalIndex = comments.length - 1 - commentIndex;
        if (originalIndex < 0 || originalIndex >= comments.length) return;
        const commentToRemove = comments[originalIndex];
        if (currentUser.uid !== commentToRemove.commenterUid) {
            showToast('You can only delete your own comments.', 'error');
            return;
        }
        comments.splice(originalIndex, 1);
        await projectRef.update({ comments: comments });
        showToast('Comment deleted.', 'success');
        await openCommentModal(projectId);
        await loadProjects(currentSubject);
    } catch (error) {
        showToast('Failed to delete comment: ' + error.message, 'error');
    }
};

async function loadAllStudents() {
    try {
        const snapshot = await db.collection('users').get();
        allStudents = [];
        snapshot.forEach(doc => {
            const data = doc.data();
            const firstName = data.firstName || '';
            const lastName = data.lastName || '';
            const fullName = data.fullName || '';
            const nameValid = (firstName && firstName !== 'Unknown') ||
                              (lastName && lastName !== 'Unknown') ||
                              (fullName && fullName !== 'Unknown');
            if (nameValid && doc.id !== currentUser.uid) {
                allStudents.push({ uid: doc.id, ...data });
            }
        });
        allStudents.sort((a, b) => (a.firstName || '').localeCompare(b.firstName || ''));
    } catch (error) {
        console.error('Error loading students:', error);
    }
}

let currentChatId = null;
let currentChatParticipant = null;
let currentChatType = 'private';

function renderChatList() {
    if (!currentUser) return;

    const container = chatUserList;
    container.innerHTML = '';

    const generalItem = document.createElement('div');
    generalItem.className = `chat-user-item ${currentChatId === 'general' ? 'active' : ''}`;
    generalItem.innerHTML = `
        <div class="chat-avatar-placeholder" style="background:rgba(251,191,36,0.2);">
            <i class="fas fa-globe" style="color:#fbbf24;font-size:1.2rem;"></i>
        </div>
        <div class="chat-user-info">
            <div class="chat-user-name">General Chat</div>
            <div class="chat-user-id">Chat with everyone</div>
        </div>
    `;
    generalItem.addEventListener('click', () => openGeneralChat());
    container.appendChild(generalItem);

    const divider = document.createElement('div');
    divider.className = 'chat-divider';
    divider.textContent = 'Students';
    container.appendChild(divider);

    const userList = allStudents;

    if (userList.length === 0) {
        const empty = document.createElement('div');
        empty.className = 'empty-state';
        empty.style.padding = '1rem';
        empty.innerHTML = '<p style="font-size:0.8rem;color:#64748b;">No other students found.</p>';
        container.appendChild(empty);
        return;
    }

    userList.forEach(user => {
        const item = document.createElement('div');
        item.className = `chat-user-item ${currentChatParticipant === user.uid ? 'active' : ''}`;
        item.dataset.uid = user.uid;

        const initial = (user.firstName || 'U')[0].toUpperCase();
        const avatar = user.profilePicture ?
            `<img src="${user.profilePicture}" alt="${user.firstName}" class="chat-avatar-img" />` :
            `<div class="chat-avatar-placeholder" style="background:linear-gradient(135deg, rgba(139,92,246,0.2), rgba(244,114,182,0.2));">${initial}</div>`;

        const name = user.fullName || user.firstName + ' ' + user.lastName || 'Unknown';
        const id = user.studentId || '';

        item.innerHTML = `
            ${avatar}
            <div class="chat-user-info">
                <div class="chat-user-name">${escapeHtml(name)}</div>
                <div class="chat-user-id">${escapeHtml(id)}</div>
            </div>
        `;
        item.addEventListener('click', () => {
            startChat(user.uid);
        });
        container.appendChild(item);
    });

    const searchInput = document.getElementById('chatSearchInput');
    if (searchInput) {
        const newSearch = searchInput.cloneNode(true);
        searchInput.parentNode.replaceChild(newSearch, searchInput);
        newSearch.addEventListener('input', function() {
            filterChatUsers(this.value);
        });
        window._chatSearchInput = newSearch;
    }
}

function filterChatUsers(query) {
    const items = document.querySelectorAll('#chatUserList .chat-user-item');
    const q = query.toLowerCase().trim();
    let visibleCount = 0;

    items.forEach(item => {
        if (item.classList.contains('chat-divider')) return;

        const name = item.querySelector('.chat-user-name')?.textContent?.toLowerCase() || '';
        const id = item.querySelector('.chat-user-id')?.textContent?.toLowerCase() || '';
        const isGeneral = item.querySelector('.fa-globe') !== null;

        if (isGeneral) {
            item.style.display = 'flex';
            return;
        }

        if (name.includes(q) || id.includes(q)) {
            item.style.display = 'flex';
            visibleCount++;
        } else {
            item.style.display = 'none';
        }
    });

    const divider = document.querySelector('#chatUserList .chat-divider');
    if (divider) {
        divider.style.display = visibleCount > 0 ? 'block' : 'none';
    }

    let noResult = document.querySelector('#chatUserList .no-results');
    if (q && visibleCount === 0) {
        if (!noResult) {
            noResult = document.createElement('div');
            noResult.className = 'empty-state no-results';
            noResult.style.padding = '1rem';
            noResult.innerHTML = '<p style="font-size:0.8rem;color:#64748b;">No users match your search.</p>';
            const divider2 = document.querySelector('#chatUserList .chat-divider');
            if (divider2) {
                divider2.parentNode.insertBefore(noResult, divider2.nextSibling);
            } else {
                document.querySelector('#chatUserList').appendChild(noResult);
            }
        }
        noResult.style.display = 'block';
    } else if (noResult) {
        noResult.style.display = 'none';
    }
}

function openGeneralChat() {
    currentChatType = 'general';
    currentChatId = 'general';
    currentChatParticipant = null;

    document.querySelectorAll('#chatUserList .chat-user-item').forEach(el => el.classList.remove('active'));
    const items = document.querySelectorAll('#chatUserList .chat-user-item');
    items.forEach(el => {
        if (el.querySelector('.fa-globe')) {
            el.classList.add('active');
        }
    });

    chatHeader.innerHTML = `<strong><i class="fas fa-globe" style="color:#fbbf24;"></i> General Chat</strong> <span style="font-size:0.7rem;color:#64748b;">Everyone</span>`;
    chatInputArea.style.display = 'flex';

    if (isMobile()) {
        chatListContainer.style.display = 'none';
        chatMessagesContainer.style.display = 'flex';
        chatBackToListBtn.style.display = 'block';
        chatMessagesContainer.classList.add('active');
    } else {
        chatListContainer.style.display = 'flex';
        chatMessagesContainer.style.display = 'flex';
        chatBackToListBtn.style.display = 'none';
        chatMessagesContainer.classList.add('active');
    }

    if (window._unsubscribeMessages) {
        window._unsubscribeMessages();
    }

    messagesList.innerHTML = '<div class="loading-container" style="padding:0.5rem;"><div class="spinner" style="width:20px;height:20px;"></div></div>';

    window._unsubscribeMessages = db.collection('generalMessages')
        .orderBy('timestamp', 'asc')
        .onSnapshot((snapshot) => {
            if (snapshot.empty) {
                messagesList.innerHTML = `
                    <div class="empty-state" style="padding:0.5rem;">
                        <p style="font-size:0.7rem;">No messages in General Chat. Say hello!</p>
                    </div>
                `;
                return;
            }

            let html = '';
            snapshot.forEach(doc => {
                const msg = doc.data();
                const isSent = msg.senderId === currentUser.uid;
                const timeStr = msg.timestamp ? msg.timestamp.toDate().toLocaleTimeString() : '';
                const senderName = msg.senderName || 'Unknown';
                const deleteBtn = isSent ?
                    `<span class="comment-delete-btn" onclick="deleteGeneralMessage('${doc.id}')"><i class="fas fa-trash-alt"></i></span>` : '';
                html += `
                    <div class="message ${isSent ? 'sent' : 'received'}">
                        <div class="msg-sender">${escapeHtml(senderName)}</div>
                        ${escapeHtml(msg.text)}
                        <span class="msg-time">${timeStr}</span>
                        ${deleteBtn}
                    </div>
                `;
            });
            messagesList.innerHTML = html;
            messagesList.scrollTop = messagesList.scrollHeight;
        });
}

function openPrivateChat(chatId, otherUid) {
    currentChatType = 'private';
    currentChatId = chatId;
    currentChatParticipant = otherUid;

    document.querySelectorAll('#chatUserList .chat-user-item').forEach(el => el.classList.remove('active'));
    const items = document.querySelectorAll('#chatUserList .chat-user-item');
    items.forEach(el => {
        if (el.dataset.uid === otherUid) {
            el.classList.add('active');
        }
    });

    const otherStudent = allStudents.find(s => s.uid === otherUid);
    const name = otherStudent ? (otherStudent.fullName || otherStudent.firstName + ' ' + otherStudent.lastName || 'Unknown') : 'Unknown';
    const id = otherStudent?.studentId || '';
    chatHeader.innerHTML = `
        <div style="display:flex;align-items:center;gap:0.5rem;">
            <strong>${escapeHtml(name)}</strong>
            <span style="font-size:0.65rem;color:#64748b;">${escapeHtml(id)}</span>
        </div>
    `;
    chatInputArea.style.display = 'flex';

    if (isMobile()) {
        chatListContainer.style.display = 'none';
        chatMessagesContainer.style.display = 'flex';
        chatBackToListBtn.style.display = 'block';
        chatMessagesContainer.classList.add('active');
    } else {
        chatListContainer.style.display = 'flex';
        chatMessagesContainer.style.display = 'flex';
        chatBackToListBtn.style.display = 'none';
        chatMessagesContainer.classList.add('active');
    }

    if (window._unsubscribeMessages) {
        window._unsubscribeMessages();
    }

    messagesList.innerHTML = '<div class="loading-container" style="padding:0.5rem;"><div class="spinner" style="width:20px;height:20px;"></div></div>';

    window._unsubscribeMessages = db.collection('chats')
        .doc(chatId)
        .collection('messages')
        .orderBy('timestamp', 'asc')
        .onSnapshot((snapshot) => {
            if (snapshot.empty) {
                messagesList.innerHTML = `
                    <div class="empty-state" style="padding:0.5rem;">
                        <p style="font-size:0.7rem;">No messages yet. Say hello!</p>
                    </div>
                `;
                return;
            }

            let html = '';
            snapshot.forEach(doc => {
                const msg = doc.data();
                const isSent = msg.senderId === currentUser.uid;
                const timeStr = msg.timestamp ? msg.timestamp.toDate().toLocaleTimeString() : '';
                const deleteBtn = isSent ?
                    `<span class="comment-delete-btn" onclick="deletePrivateMessage('${chatId}','${doc.id}')"><i class="fas fa-trash-alt"></i></span>` : '';
                html += `
                    <div class="message ${isSent ? 'sent' : 'received'}">
                        ${escapeHtml(msg.text)}
                        <span class="msg-time">${timeStr}</span>
                        ${deleteBtn}
                    </div>
                `;
            });
            messagesList.innerHTML = html;
            messagesList.scrollTop = messagesList.scrollHeight;
        });
}

window.startChat = async function(otherUid) {
    if (otherUid === currentUser.uid) {
        showToast('You cannot chat with yourself.', 'error');
        return;
    }

    const uid = currentUser.uid;
    try {
        const snapshot = await db.collection('chats')
            .where('participants', 'array-contains', uid)
            .get();

        let existingChat = null;
        snapshot.forEach(doc => {
            const chat = doc.data();
            if (chat.participants.includes(otherUid)) {
                existingChat = doc.id;
            }
        });

        if (existingChat) {
            openPrivateChat(existingChat, otherUid);
            renderChatList();
            return;
        }

        const chatRef = await db.collection('chats').add({
            participants: [uid, otherUid],
            lastMessage: '',
            lastUpdated: firebase.firestore.Timestamp.now()
        });
        openPrivateChat(chatRef.id, otherUid);
        renderChatList();
    } catch (error) {
        console.error('Start chat error:', error);
        showToast('Failed to start chat: ' + error.message, 'error');
    }
};

window.deleteGeneralMessage = async function(messageId) {
    if (!confirm('Delete this message?')) return;
    try {
        const msgRef = db.collection('generalMessages').doc(messageId);
        const doc = await msgRef.get();
        if (!doc.exists) return;
        const data = doc.data();
        if (data.senderId !== currentUser.uid) {
            showToast('You can only delete your own messages.', 'error');
            return;
        }
        await msgRef.delete();
        showToast('Message deleted.', 'success');
    } catch (error) {
        showToast('Failed to delete message: ' + error.message, 'error');
    }
};

window.deletePrivateMessage = async function(chatId, messageId) {
    if (!confirm('Delete this message?')) return;
    try {
        const msgRef = db.collection('chats').doc(chatId).collection('messages').doc(messageId);
        const doc = await msgRef.get();
        if (!doc.exists) return;
        const data = doc.data();
        if (data.senderId !== currentUser.uid) {
            showToast('You can only delete your own messages.', 'error');
            return;
        }
        await msgRef.delete();
        showToast('Message deleted.', 'success');
    } catch (error) {
        showToast('Failed to delete message: ' + error.message, 'error');
    }
};

sendMessageBtn.addEventListener('click', async () => {
    const text = chatMessageInput.value.trim();
    if (!text) return;

    if (currentChatType === 'general') {
        try {
            await db.collection('generalMessages').add({
                senderId: currentUser.uid,
                senderName: currentUserProfile.fullName || currentUserProfile.firstName || 'Student',
                text: text,
                timestamp: firebase.firestore.Timestamp.now()
            });
            chatMessageInput.value = '';
        } catch (error) {
            showToast('Failed to send message: ' + error.message, 'error');
        }
    } else if (currentChatId) {
        try {
            await db.collection('chats').doc(currentChatId).collection('messages').add({
                senderId: currentUser.uid,
                text: text,
                timestamp: firebase.firestore.Timestamp.now()
            });
            await db.collection('chats').doc(currentChatId).update({
                lastMessage: text,
                lastUpdated: firebase.firestore.Timestamp.now()
            });
            chatMessageInput.value = '';
        } catch (error) {
            showToast('Failed to send message: ' + error.message, 'error');
        }
    } else {
        showToast('Select a chat first.', 'error');
    }
});

chatMessageInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') sendMessageBtn.click();
});

function loadProfile() {
    if (!currentUserProfile) return;
    profileStudentId.value = currentUserProfile.studentId || '';
    profileFirstName.value = currentUserProfile.firstName || '';
    profileLastName.value = currentUserProfile.lastName || '';
    profileBio.value = currentUserProfile.bio || '';

    if (currentUserProfile.profilePicture) {
        profilePictureImg.src = currentUserProfile.profilePicture;
        profilePictureImg.style.display = 'block';
        profilePicturePlaceholder.style.display = 'none';
    } else {
        profilePictureImg.style.display = 'none';
        profilePicturePlaceholder.style.display = 'flex';
    }

    updateManagementButton();
}

profilePictureInput.addEventListener('change', async function() {
    const file = this.files[0];
    if (!file) return;
    try {
        const storageRef = storage.ref('profilePictures/' + currentUser.uid + '/' + Date.now() + '_' + file.name);
        await storageRef.put(file);
        const url = await storageRef.getDownloadURL();

        await db.collection('users').doc(currentUser.uid).update({
            profilePicture: url
        });
        currentUserProfile.profilePicture = url;
        profilePictureImg.src = url;
        profilePictureImg.style.display = 'block';
        profilePicturePlaceholder.style.display = 'none';
        headerProfilePic.src = url;
        headerProfilePic.style.display = 'block';
        headerProfilePlaceholder.style.display = 'none';
        showToast('Profile picture updated!', 'success');
    } catch (error) {
        showToast('Failed to upload picture: ' + error.message, 'error');
    }
});

saveProfileBtn.addEventListener('click', async function() {
    const firstName = profileFirstName.value.trim();
    const lastName = profileLastName.value.trim();
    const bio = profileBio.value.trim();

    if (!firstName) { showToast('First name is required.', 'error'); return; }

    try {
        await db.collection('users').doc(currentUser.uid).update({
            firstName: firstName,
            lastName: lastName,
            fullName: firstName + ' ' + lastName,
            bio: bio
        });
        currentUserProfile.firstName = firstName;
        currentUserProfile.lastName = lastName;
        currentUserProfile.fullName = firstName + ' ' + lastName;
        currentUserProfile.bio = bio;
        userDisplayName.textContent = firstName;
        showToast('Profile saved!', 'success');
    } catch (error) {
        showToast('Failed to save profile: ' + error.message, 'error');
    }
});

function updateClock() {
    const now = new Date();
    const clockEl = document.getElementById('headerClock');
    if (clockEl) {
        clockEl.innerHTML = `<i class="far fa-clock"></i> ${now.toLocaleString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        })}`;
    }
}
updateClock();
setInterval(updateClock, 1000);

if (firebaseConfig.apiKey === 'YOUR_API_KEY') {
    document.querySelector('.container').innerHTML = `
        <div class="empty-state" style="padding:2rem;text-align:center;">
            <i class="fas fa-triangle-exclamation" style="color:#ff6b6b;font-size:2.5rem;"></i>
            <h3 style="color:#c8d6e5;">Firebase Not Configured</h3>
            <p style="color:#6a8a7a;">Replace the firebaseConfig object in script.js with your own credentials.</p>
        </div>
    `;
}