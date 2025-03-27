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
        isKalmanFilterEnabled = true;
        localStorage.setItem('kalmanFilter', 'enabled');
        console.log('Kalman Filter Enabled');
    } else {
        isKalmanFilterEnabled = false;
        localStorage.setItem('kalmanFilter', 'disabled');
        console.log('Kalman Filter Disabled');
        // ریست کردن فیلتر هنگام خاموش کردن (اختیاری)
        // speedFilter.kalmanFilter.x = 0;
        // speedFilter.kalmanFilter.p = 1;
    }
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
            // اطمینان از عدم نمایش سرعت منفی (خروجی فیلتر ممکن است کمی منفی شود)
            displaySpeed = Math.max(0, displaySpeed);
        } else {
            displaySpeed = rawSpeed;
        }

        speedElement.textContent = displaySpeed.toFixed(1);

        // به‌روزرسانی سرعت حداکثر بر اساس سرعت نمایش داده شده
        if (displaySpeed > maxSpeed) {
            maxSpeed = displaySpeed;
            maxSpeedElement.textContent = maxSpeed.toFixed(1);
        }
        statusElement.textContent = 'در حال اندازه‌گیری...';
    } else {
        // اگر سرعت null بود، مقدار صفر را نمایش بده
        speedElement.textContent = '0';
        statusElement.textContent = 'سرعت نامشخص';
    }
}

function handleError(error) {
    statusElement.textContent = 'خطای GPS';
    startButton.disabled = false;
}

function resetMeasurements() {
    if (watchId !== null) {
        navigator.geolocation.clearWatch(watchId);
        watchId = null; // اطمینان از null شدن watchId
    }
    speedElement.textContent = '0';
    maxSpeedElement.textContent = '0';
    maxSpeed = 0; // ریست کردن متغیر maxSpeed
    statusElement.textContent = 'در انتظار شروع...';
    startButton.disabled = false;

    // ریست کردن فیلتر کالمن (اختیاری)
    // speedFilter.kalmanFilter.x = 0;
    // speedFilter.kalmanFilter.p = 1;
    // speedFilter.speedHistory = [];
}

// --- کلاس‌های فیلتر کالمن ---
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
            processNoiseQ: 0.01,       // نویز فرایند - حالت عادی
            processNoiseQAccel: 0.5,   // نویز فرایند - حالت شتاب
            accelThreshold: 0.8,       // آستانه تشخیص شتاب (km/h در ثانیه)
            historyLimit: 5,           // تعداد نمونه‌های قبلی
            commonSpeeds: [80, 90, 100, 110, 120, 130], // سرعت‌های معمول کروز
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
        this.lastSpeed = null;
        this.lastUpdateTime = null;
    }

    update(speed) {
        const now = Date.now();
        
        // تشخیص شتاب (اگر داده قبلی موجود است)
        let acceleration = 0;
        let isAccelerating = false;
        
        if (this.lastSpeed !== null && this.lastUpdateTime !== null) {
            const dt = (now - this.lastUpdateTime) / 1000; // به ثانیه
            acceleration = Math.abs(speed - this.lastSpeed) / dt; // km/h در ثانیه
            isAccelerating = acceleration > this.options.accelThreshold;
            
            // تنظیم دینامیک نویز فرایند بر اساس شتاب
            if (isAccelerating) {
                this.kalmanFilter.q = this.options.processNoiseQAccel;
            } else {
                this.kalmanFilter.q = this.options.processNoiseQ;
            }
        }
        
        // اعمال فیلتر کالمن
        let filteredSpeed = this.kalmanFilter.update(speed);
        
        // ذخیره سرعت در تاریخچه
        this.speedHistory.push(filteredSpeed);
        if (this.speedHistory.length > this.options.historyLimit) {
            this.speedHistory.shift();
        }
        
        // به‌روزرسانی مقادیر قبلی
        this.lastSpeed = speed;
        this.lastUpdateTime = now;
        
        // محاسبه میانگین هوشمند و رند کردن
        let avgSpeed = this.calculateSmartAverage(this.speedHistory);
        return this.smartRound(avgSpeed);
    }
    
    calculateSmartAverage(history) {
        if (history.length < 3) {
            return history.length > 0 ? history[history.length - 1] : 0;
        }
        
        // حذف مقادیر پرت
        const sortedHistory = [...history].sort((a, b) => a - b);
        let trimmedHistory;
        
        if (sortedHistory.length >= 5) {
            // حذف بالاترین و پایین‌ترین مقدار
            trimmedHistory = sortedHistory.slice(1, -1);
        } else {
            trimmedHistory = sortedHistory;
        }

        // محاسبه میانگین
        return trimmedHistory.reduce((a, b) => a + b, 0) / trimmedHistory.length;
    }
    
    smartRound(speed) {
        // جستجوی سرعت معمول کروز در محدوده
        for (const commonSpeed of this.options.commonSpeeds) {
            if (Math.abs(speed - commonSpeed) < this.options.maxSpeedVariation) {
                // وزن‌دهی بر اساس نزدیکی به سرعت معمول
                const weight = 1 - Math.abs(speed - commonSpeed) / this.options.maxSpeedVariation;
                
                // اگر خیلی نزدیک است (بیش از 50% وزن)، به سرعت معمول گرد شود
                if (weight > 0.5) {
                    return commonSpeed;
                }
            }
        }
        
        // در غیر این صورت، گرد کردن به یک رقم اعشار
        return Math.round(speed * 10) / 10;
    }
}

// نمونه‌سازی فیلتر
const speedFilter = new EnhancedSpeedFilter({
    baseSpeed: 120,
    maxSpeedVariation: 1
});
// --- پایان کلاس‌های فیلتر کالمن ---
