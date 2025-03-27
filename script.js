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

let watchId = null;
let maxSpeed = 0;
let isKalmanFilterEnabled = true;

// بررسی و اعمال حالت ذخیره شده در localStorage
if (localStorage.getItem('darkMode') === 'enabled') {
    enableDarkMode();
    darkModeToggle.checked = true;
}

// بررسی و اعمال حالت ذخیره شده فیلتر کالمن در localStorage
if (localStorage.getItem('kalmanFilter') === 'disabled') {
    disableKalmanFilter();
    kalmanFilterToggle.checked = false;
} else {
    // اگر مقداری ذخیره نشده یا فعال است، فعال در نظر می‌گیریم
    enableKalmanFilter();
    kalmanFilterToggle.checked = true;
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

// تغییر وضعیت فیلتر کالمن
kalmanFilterToggle.addEventListener('change', function () {
    if (this.checked) {
        enableKalmanFilter();
    } else {
        disableKalmanFilter();
    }
});

function enableKalmanFilter() {
    isKalmanFilterEnabled = true;
    localStorage.setItem('kalmanFilter', 'enabled');
    // می‌توانید در اینجا بازخوردی به کاربر بدهید، مثلاً تغییر رنگ آیکون یا متن وضعیت
    console.log("فیلتر کالمن فعال شد.");
}

function disableKalmanFilter() {
    isKalmanFilterEnabled = false;
    localStorage.setItem('kalmanFilter', 'disabled');
    // می‌توانید در اینجا بازخوردی به کاربر بدهید
    console.log("فیلتر کالمن غیرفعال شد.");
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
    if (position.coords.speed !== null) {
        let rawSpeed = position.coords.speed * 3.6; // تبدیل به km/h
        let displaySpeed;

        if (isKalmanFilterEnabled) {
            displaySpeed = speedFilter.update(rawSpeed);
        } else {
            displaySpeed = rawSpeed;
        }

        // گرد کردن نهایی برای نمایش
        displaySpeed = parseFloat(displaySpeed.toFixed(1));

        speedElement.textContent = displaySpeed;

        if (displaySpeed > maxSpeed) {
            maxSpeed = displaySpeed;
            maxSpeedElement.textContent = maxSpeed.toFixed(1);
        }
        statusElement.textContent = 'در حال اندازه‌گیری...';
    } else {
         // اگر سرعت null بود، مقدار قبلی یا صفر را نشان دهد
         // speedElement.textContent = 'N/A'; // یا هر مقدار مناسب دیگر
         statusElement.textContent = 'سیگنال سرعت نامعتبر';
    }
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

// --- کلاس‌های فیلتر کالمن ---
// (کلاس‌های EnhancedSpeedFilter و KalmanFilter که ارائه دادید اینجا کپی شوند)
class KalmanFilter {
    constructor(r = 0.5, q = 0.01) {
        this.r = r; // نویز اندازه‌گیری
        this.q = q; // نویز فرایند
        this.x = 0; // مقدار تخمین زده شده
        this.p = 1; // کواریانس خطا
        this.k = 0; // بهره کالمن
    }

    update(measurement) {
        // پیش‌بینی مقدار بعدی
        this.p = this.p + this.q;

        // محاسبه بهره کالمن
        this.k = this.p / (this.p + this.r);

        // به‌روزرسانی مقدار تخمینی
        this.x = this.x + this.k * (measurement - this.x);

        // به‌روزرسانی کواریانس خطا
        this.p = (1 - this.k) * this.p;

        return this.x;
    }
}

class EnhancedSpeedFilter {
    constructor(options = {}) {
        // پارامترهای پیش‌فرض
        this.options = {
            measurementNoiseR: 0.5,   // نویز اندازه‌گیری
            processNoiseQ: 0.01,       // نویز فرایند
            historyLimit: 5,           // تعداد نمونه‌های قبلی
            baseSpeed: 120,            // سرعت پایه برای رند کردن هوشمندانه
            maxSpeedVariation: 2       // حداکثر تغییر مجاز سرعت
        };

        // ادغام پارامترهای دلخواه کاربر
        Object.assign(this.options, options);

        // فیلتر کالمن
        this.kalmanFilter = new KalmanFilter(
            this.options.measurementNoiseR,
            this.options.processNoiseQ
        );

        // تاریخچه سرعت
        this.speedHistory = [];
    }

    update(speed) {
        // اعمال فیلتر کالمن
        let filteredSpeed = this.kalmanFilter.update(speed);

        // ذخیره سرعت در تاریخچه
        this.speedHistory.push(filteredSpeed);
        if (this.speedHistory.length > this.options.historyLimit) {
            this.speedHistory.shift();
        }

        // محاسبه میانگین
        // نکته: تابع calculateSmartAverage در کد شما نیاز به حداقل ۳ مقدار در تاریخچه دارد
        // برای جلوگیری از خطا در ابتدا، بررسی می‌کنیم
        let avgSpeed = filteredSpeed; // مقدار پیش‌فرض
        if (this.speedHistory.length >= 3) {
             avgSpeed = this.calculateSmartAverage(this.speedHistory);
        }


        // رند کردن هوشمندانه
        return this.smartRound(avgSpeed);
    }

    calculateSmartAverage(history) {
        // حذف مقادیر پرت
        const sortedHistory = [...history].sort((a, b) => a - b);
        // اطمینان از وجود حداقل ۳ عنصر برای حذف کمترین و بیشترین
        if (sortedHistory.length < 3) return history.reduce((a, b) => a + b, 0) / history.length;

        const trimmedHistory = sortedHistory.slice(1, -1); // حذف کمترین و بیشترین

        // محاسبه میانگین
        return trimmedHistory.reduce((a, b) => a + b, 0) / trimmedHistory.length;
    }

    smartRound(speed) {
        const { baseSpeed, maxSpeedVariation } = this.options;

        // اگر سرعت نزدیک به سرعت پایه است
        if (Math.abs(speed - baseSpeed) < maxSpeedVariation) {
            return baseSpeed;
        }

        // گرد کردن دقیق به یک رقم اعشار
        return Math.round(speed * 10) / 10;
    }
}
// --- پایان کلاس‌های فیلتر کالمن ---

// نمونه‌سازی فیلتر
const speedFilter = new EnhancedSpeedFilter({
    baseSpeed: 120,
    maxSpeedVariation: 1
});
