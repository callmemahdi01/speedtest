const speedElement = document.getElementById('speed');
const statusElement = document.getElementById('status');
const maxSpeedElement = document.getElementById('maxSpeed');
const startButton = document.getElementById('startButton');
const resetButton = document.getElementById('resetButton');
const statusPanel = document.querySelector('.status-panel');
const darkModeToggle = document.getElementById('darkModeToggle');
const themeStylesheet = document.getElementById('theme-stylesheet');
const fullscreenToggle = document.getElementById('fullscreenToggle');

let watchId = null;
let maxSpeed = 0;

// بررسی و اعمال حالت ذخیره شده در localStorage
if (localStorage.getItem('darkMode') === 'enabled') {
    enableDarkMode();
    darkModeToggle.checked = true;
}

// تغییر تم بین حالت دارک و لایت
darkModeToggle.addEventListener('change', function () {
    if (this.checked) {
        enableDarkMode();
    } else {
        disableDarkMode();
    }
});

function enableDarkMode() {
    themeStylesheet.setAttribute('href', 'dark.css');
    localStorage.setItem('darkMode', 'enabled');
}

function disableDarkMode() {
    themeStylesheet.setAttribute('href', 'light.css');
    localStorage.setItem('darkMode', 'disabled');
}

// دکمه‌ی تمام صفحه
fullscreenToggle.addEventListener('click', () => {
    if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(err => {
            console.log(`خطا در فعال‌سازی تمام صفحه: ${err.message}`);
        });
        fullscreenToggle.innerHTML = '<i class="fas fa-compress"></i>';
    } else {
        document.exitFullscreen();
        fullscreenToggle.innerHTML = '<i class="fas fa-expand"></i>';
    }
});

// دکمه‌های کنترل سرعت
startButton.addEventListener('click', startMeasuring);
resetButton.addEventListener('click', resetMeasurements);

function startMeasuring() {
    if (!navigator.geolocation) {
        statusElement.textContent = 'مرورگر شما از GPS پشتیبانی نمی‌کند';
        return;
    }
    
    statusElement.textContent = 'در حال اتصال به GPS...';
    startButton.disabled = true;

    watchId = navigator.geolocation.watchPosition(updateSpeed, handleError, {
        enableHighAccuracy: true,
        timeout: 5000,
        maximumAge: 0
    });
}

function updateSpeed(position) {
    const speedKmh = (position.coords.speed * 3.6).toFixed(1);
    speedElement.textContent = speedKmh;
    if (parseFloat(speedKmh) > maxSpeed) {
        maxSpeed = parseFloat(speedKmh);
        maxSpeedElement.textContent = maxSpeed.toFixed(1);
    }
    statusElement.textContent = 'در حال اندازه‌گیری...';
}

function handleError(error) {
    statusElement.textContent = 'خطای GPS';
    startButton.disabled = false;
}

function resetMeasurements() {
    if (watchId !== null) {
        navigator.geolocation.clearWatch(watchId);
    }
    speedElement.textContent = '0';
    maxSpeedElement.textContent = '0';
    statusElement.textContent = 'در انتظار شروع...';
    startButton.disabled = false;
}
