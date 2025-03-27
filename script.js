const speedElement = document.getElementById('speed');
const statusElement = document.getElementById('status');
const maxSpeedElement = document.getElementById('maxSpeed');
const startButton = document.getElementById('startButton');
const resetButton = document.getElementById('resetButton');
const statusPanel = document.querySelector('.status-panel');
const darkModeToggle = document.getElementById('darkModeToggle');
const themeStylesheet = document.getElementById('theme-stylesheet');
const fullscreenToggle = document.getElementById('fullscreenToggle');
const kalmanFilterToggle = document.getElementById('kalmanFilterToggle');
const kalmanFilterLabel = document.getElementById('kalmanFilterLabel');

let watchId = null;
let maxSpeed = 0;
let isKalmanFilterEnabled = false;

// بررسی و اعمال حالت ذخیره شده در localStorage
if (localStorage.getItem('darkMode') === 'enabled') {
    enableDarkMode();
    darkModeToggle.checked = true;
}

// بررسی و اعمال حالت ذخیره شده فیلتر کالمن در localStorage
if (localStorage.getItem('kalmanFilter') === 'enabled') {
    isKalmanFilterEnabled = true;
    kalmanFilterToggle.checked = true;
} else {
    isKalmanFilterEnabled = false;
    kalmanFilterToggle.checked = false;
}
updateKalmanFilterLabel();

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

// تغییر وضعیت فیلتر کالمن
kalmanFilterToggle.addEventListener('change', function () {
    isKalmanFilterEnabled = this.checked;
    if (isKalmanFilterEnabled) {
        localStorage.setItem('kalmanFilter', 'enabled');
        console.log('Kalman Filter Enabled');
    } else {
        localStorage.setItem('kalmanFilter', 'disabled');
        console.log('Kalman Filter Disabled');
        speedFilter.reset();
    }
    updateKalmanFilterLabel();
});

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
        timeout: 10000,
        maximumAge: 0
    });
}

function updateSpeed(position) {
    if (position.coords.speed !== null && position.coords.speed !== undefined) {
        let rawSpeed = position.coords.speed * 3.6;
        let displaySpeed;

        if (isKalmanFilterEnabled) {
            displaySpeed = speedFilter.update(rawSpeed);
            displaySpeed = Math.max(0, displaySpeed);
        } else {
            displaySpeed = rawSpeed;
        }

        speedElement.textContent = displaySpeed.toFixed(1);

        const currentMaxSpeed = parseFloat(maxSpeedElement.textContent);
        if (parseFloat(displaySpeed.toFixed(1)) > currentMaxSpeed) {
            maxSpeed = displaySpeed;
            maxSpeedElement.textContent = displaySpeed.toFixed(1);
        }
        statusElement.textContent = 'در حال اندازه‌گیری...';
        if (position.coords.accuracy) {
            statusElement.textContent += ` (دقت: ${position.coords.accuracy.toFixed(0)} متر)`;
        }

    } else {
        speedElement.textContent = '0.0';
        statusElement.textContent = 'سرعت نامشخص';
    }
}

function handleError(error) {
    let message = 'خطای GPS: ';
    switch(error.code) {
        case error.PERMISSION_DENIED:
            message += "دسترسی به موقعیت مکانی رد شد.";
            break;
        case error.POSITION_UNAVAILABLE:
            message += "اطلاعات موقعیت مکانی در دسترس نیست.";
            break;
        case error.TIMEOUT:
            message += "زمان درخواست موقعیت مکانی به پایان رسید.";
            break;
        case error.UNKNOWN_ERROR:
            message += "خطای ناشناخته رخ داد.";
            break;
    }
    console.error("Geolocation Error:", error);
    statusElement.textContent = message;
    startButton.disabled = false;
}

function resetMeasurements() {
    if (watchId !== null) {
        navigator.geolocation.clearWatch(watchId);
        watchId = null;
    }
    speedElement.textContent = '0.0';
    maxSpeedElement.textContent = '0.0';
    maxSpeed = 0;
    statusElement.textContent = 'در انتظار شروع...';
    startButton.disabled = false;

    speedFilter.reset();
    console.log('Measurements and Kalman Filter Reset');
}

// --- کلاس‌های فیلتر کالمن ---
class KalmanFilter {
    constructor(r = 0.5, q = 0.01) {
        this.R = r;
        this.Q = q;
        this.x = 0;
        this.p = 1;
        this.k = 0;
    }

    update(measurement) {
        this.p = this.p + this.Q;
        this.k = this.p / (this.p + this.R);
        this.x = this.x + this.k * (measurement - this.x);
        this.p = (1 - this.k) * this.p;
        return this.x;
    }

    reset() {
        this.x = 0;
        this.p = 1;
        this.k = 0;
    }
}

class SpeedFilterManager {
    constructor(options = {}) {
        const defaultOptions = {
            measurementNoiseR: 0.3,
            processNoiseQ: 0.05
        };
        this.options = { ...defaultOptions, ...options };

        this.kalmanFilter = new KalmanFilter(
            this.options.measurementNoiseR,
            this.options.processNoiseQ
        );
    }

    update(speed) {
        return this.kalmanFilter.update(speed);
    }

    reset() {
        this.kalmanFilter.reset();
    }
}

const speedFilter = new SpeedFilterManager({
});
// --- پایان کلاس‌های فیلتر کالمن ---
