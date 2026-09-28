// AUDIO CONTROL
const audio = document.getElementById('bgAudio');
const btn = document.getElementById('musicToggleBtn');

function toggleAudio() {
    if (audio.paused) {
        audio.play().then(() => {
            btn.innerHTML = '⏸';
            btn.classList.add('playing');
        }).catch(err => console.log("Audio playback error:", err));
    } else {
        audio.pause();
        btn.innerHTML = '🎵';
        btn.classList.remove('playing');
    }
}

// TOAST NOTIFICATIONS
const notifications = [
    { icon: "🇮🇩", title: "Babadan Merdeka!", desc: "Folder 17 Agustus Babadan Indramayu sudah diunggah.", time: "Baru saja" },
    { icon: "📸", title: "Kualitas HD Full", desc: "Klik tombol putih untuk ambil foto Drive.", time: "1 menit yang lalu" },
    { icon: "⚡", title: "Update Tercepat", desc: "Foto perlombaan siap di-download.", time: "3 menit yang lalu" },
    { icon: "💬", title: "Salam Kemerdekaan", desc: "Jangan lupa isi ucapan di kolom komentar!", time: "5 menit yang lalu" }
];

let notifIndex = 0;
const toastEl = document.getElementById('toastPopup');
const toastIcon = document.getElementById('toastIcon');
const toastTitle = document.getElementById('toastTitle');
const toastDesc = document.getElementById('toastDesc');
const toastTime = document.getElementById('toastTime');

function showNextNotification() {
    const data = notifications[notifIndex];
    toastIcon.innerText = data.icon;
    toastTitle.innerText = data.title;
    toastDesc.innerText = data.desc;
    toastTime.innerText = data.time;

    toastEl.classList.add('show');
    setTimeout(() => { toastEl.classList.remove('show'); }, 4000);
    notifIndex = (notifIndex + 1) % notifications.length;
}

setTimeout(() => {
    showNextNotification();
    setInterval(showNextNotification, 7000);
}, 2000);

// LOCAL COMMENTS LOGIC
const commentForm = document.getElementById('commentForm');
const commentsDisplay = document.getElementById('commentsDisplay');

function loadLocalComments() {
    const savedComments = JSON.parse(localStorage.getItem('my_suka_moto_comments') || '[]');
    commentsDisplay.innerHTML = '';

    if (savedComments.length === 0) {
        commentsDisplay.innerHTML = '<p style="font-size: 8.5pt; color: #fca5a5; font-style: italic; margin: 0;">Belum ada komentar. Tulis ucapan Kemerdekaan pertama kamu!</p>';
        return;
    }

    savedComments.forEach(item => {
        const commentEl = document.createElement('div');
        commentEl.className = 'comment-item';
        commentEl.innerHTML = `
            <div class="comment-header">
                <span class="comment-author">${escapeHtml(item.name)}</span>
                <span class="comment-date">${item.date}</span>
            </div>
            <p class="comment-text">${escapeHtml(item.text)}</p>
        `;
        commentsDisplay.appendChild(commentEl);
    });
}

commentForm.addEventListener('submit', function(e) {
    e.preventDefault();
    const name = document.getElementById('authorName').value.trim();
    const text = document.getElementById('authorText').value.trim();

    if (name && text) {
        const now = new Date();
        const dateStr = now.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
        const newComment = { name, text, date: dateStr };

        const savedComments = JSON.parse(localStorage.getItem('my_suka_moto_comments') || '[]');
        savedComments.unshift(newComment);
        localStorage.setItem('my_suka_moto_comments', JSON.stringify(savedComments));

        document.getElementById('authorName').value = '';
        document.getElementById('authorText').value = '';
        loadLocalComments();
    }
});

function escapeHtml(str) {
    return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

loadLocalComments();

btn.addEventListener("click", toggleAudio);
