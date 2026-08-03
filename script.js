// 2026년 보험료율 (고용보험은 2025년 요율)
const RATES = {
    pension: 0.095,          // 국민연금 9.5% (근로자·사업주 각 4.75%)
    health: 0.0719,          // 건강보험 7.19% (근로자·사업주 각 3.595%)
    longterm: 0.1314,        // 장기요양보험 — 건강보험료의 13.14%
    employmentWorker: 0.009, // 고용보험(실업급여) 근로자 부담 0.9%
};

// 두루누리 사회보험료 지원 상한액 (2026년 기준)
const DURUNURI_CAPS = {
    pension: 87400,
    employmentWorker: 16560,
};

// 전역 상태
let salary = 0;
let calculationType = '';
let birthDate = null;
let age = 0;
let calc = {};           // 마지막으로 계산된 결과 (두루누리 토글 시 재사용)
let durunuriApplied = false;

function showStep(id) {
    document.querySelectorAll('.step').forEach(step => step.classList.remove('active'));
    document.getElementById(id).classList.add('active');
}

// 1단계로 이동
function goToStep1() {
    showStep('step1');
}

// 2단계로 이동 (급여 입력 검증)
function goToStep2() {
    const value = parseInt(document.getElementById('salary').value);
    if (!value || value <= 0) {
        alert('월급여를 입력해주세요.');
        return;
    }
    salary = value;
    showStep('step2');
}

// 딱 하나 선택 (근로자 / 사업주)
function selectPath(type) {
    calculationType = type;
    if (type === 'worker') {
        // 근로자 경로는 국민연금(60세)·고용보험 실업급여(65세) 대상 여부를
        // 판단하기 위해 생년월일을 먼저 물어본다.
        // "저장되지 않는다"는 안내와 실제 동작이 다르게 보이지 않도록,
        // 이 화면에 들어올 때마다 입력창을 매번 비운다.
        document.getElementById('birthdate').value = '';
        showStep('stepBirth');
    } else {
        // 사업주 경로는 아직 나이 입력을 받지 않음 (추후 직원별로 확장 예정)
        showStep('step3');
    }
}

// 만 나이 계산 (생일이 올해 지났는지까지 정확히 반영)
function calculateKoreanAge(birth) {
    const today = new Date();
    let calculated = today.getFullYear() - birth.getFullYear();
    const hadBirthdayThisYear =
        today.getMonth() > birth.getMonth() ||
        (today.getMonth() === birth.getMonth() && today.getDate() >= birth.getDate());
    if (!hadBirthdayThisYear) {
        calculated -= 1;
    }
    return calculated;
}

// "19900101" 8자리 문자열을 Date로 변환 (형식이 이상하면 null)
function parseBirthdate(raw) {
    if (!/^\d{8}$/.test(raw)) return null;
    const year = parseInt(raw.slice(0, 4), 10);
    const month = parseInt(raw.slice(4, 6), 10);
    const day = parseInt(raw.slice(6, 8), 10);
    const thisYear = new Date().getFullYear();
    if (year < 1900 || year > thisYear) return null;
    if (month < 1 || month > 12) return null;
    if (day < 1 || day > 31) return null;

    const parsed = new Date(year, month - 1, day);
    // 2월 30일처럼 실제로 없는 날짜면 Date가 다음 달로 넘어가버리므로 그 경우도 걸러낸다
    if (parsed.getFullYear() !== year || parsed.getMonth() !== month - 1 || parsed.getDate() !== day) {
        return null;
    }
    return parsed;
}

// 생년월일 입력 후 결과 화면으로 이동
function goToResultFromBirth() {
    const raw = document.getElementById('birthdate').value.trim();
    const parsed = parseBirthdate(raw);
    if (!parsed) {
        alert('생년월일 8자리를 정확히 입력해주세요. (예: 19900101)');
        return;
    }
    birthDate = parsed;
    age = calculateKoreanAge(birthDate);
    calculateWorkerResult();
    showStep('step3');
}

// 근로자 부담금 계산 (60세 이상 국민연금 제외, 65세 이상 고용보험 실업급여 제외)
function calculateWorkerResult() {
    const pensionExempt = age >= 60;
    const employmentExempt = age >= 65;

    // 국민연금: 보수월액을 천원 단위로 절사 후 계산, 최종 금액도 일의 단위(10원 미만) 절사
    const pensionBase = Math.floor(salary / 1000) * 1000;
    const pension = pensionExempt ? 0 : Math.floor((pensionBase * RATES.pension / 2) / 10) * 10;

    // 건강보험 · 장기요양보험: 둘 다 일의 단위(10원 미만) 절사
    const health = Math.floor((salary * RATES.health / 2) / 10) * 10;
    const longterm = Math.floor((health * RATES.longterm) / 10) * 10;
    const employment = employmentExempt ? 0 : Math.floor((salary * RATES.employmentWorker) / 10) * 10;
    const total = pension + health + longterm + employment;
    const netPay = salary - total;

    calc = { pension, health, longterm, employment, total, netPay, pensionExempt, employmentExempt };
    durunuriApplied = false;
    renderResult();
}

// 계산 결과를 화면에 반영
function renderResult() {
    document.getElementById('resultTitle').textContent = '근로자 부담금';
    document.getElementById('displaySalary').textContent = formatNumber(salary) + '원';
    document.getElementById('resultPension').textContent = formatNumber(calc.pension) + '원';
    document.getElementById('resultHealth').textContent = formatNumber(calc.health) + '원';
    document.getElementById('resultLongterm').textContent = formatNumber(calc.longterm) + '원';
    document.getElementById('resultEmployment').textContent = formatNumber(calc.employment) + '원';
    document.getElementById('resultTotal').textContent = formatNumber(calc.total) + '원';
    document.getElementById('resultNetPay').textContent = formatNumber(calc.netPay) + '원';
    ['resultPension', 'resultEmployment', 'resultTotal', 'resultNetPay'].forEach(id => {
        document.getElementById(id).classList.remove('value-changed');
    });

    // 나이 관련 예외는 실제로 해당될 때만 안내
    const notices = [];
    if (calc.pensionExempt) notices.push('만 60세 이상이라 국민연금은 계산에서 제외했어요.');
    if (calc.employmentExempt) notices.push('만 65세 이상이라 고용보험(실업급여)도 제외했어요.');
    const ageNotice = document.getElementById('ageNotice');
    if (notices.length > 0) {
        ageNotice.textContent = 'ℹ️ ' + notices.join(' ');
        ageNotice.style.display = 'block';
    } else {
        ageNotice.style.display = 'none';
    }

    // 두루누리 배너: 월급여 270만원 이하일 때만 표시
    const durunuriBtn = document.getElementById('durunuriToggleBtn');
    durunuriBtn.textContent = '지원받으면 얼마?';
    durunuriBtn.classList.remove('applied');
    document.getElementById('durunuriBanner').style.display = salary <= 2700000 ? 'block' : 'none';
}

// 두루누리 지원 적용 시 본인 부담액 (80% 지원, 상한액 있으면 상한액만큼만 지원)
function durunuriSupportedAmount(original, cap) {
    const support80 = Math.floor((original * 0.8) / 10) * 10;
    if (support80 > cap) {
        return original - cap;
    }
    return Math.floor((original * 0.2) / 10) * 10;
}

// 두루누리 지원 토글
function toggleDurunuri() {
    durunuriApplied = !durunuriApplied;
    const btn = document.getElementById('durunuriToggleBtn');

    let pension = calc.pension;
    let employment = calc.employment;

    if (durunuriApplied) {
        if (!calc.pensionExempt) {
            pension = durunuriSupportedAmount(calc.pension, DURUNURI_CAPS.pension);
        }
        if (!calc.employmentExempt) {
            employment = durunuriSupportedAmount(calc.employment, DURUNURI_CAPS.employmentWorker);
        }
        btn.textContent = '원래 금액 보기';
        btn.classList.add('applied');
    } else {
        pension = calc.pension;
        employment = calc.employment;
        btn.textContent = '지원받으면 얼마?';
        btn.classList.remove('applied');
    }

    const total = pension + calc.health + calc.longterm + employment;
    const netPay = salary - total;
    document.getElementById('resultPension').textContent = formatNumber(pension) + '원';
    document.getElementById('resultEmployment').textContent = formatNumber(employment) + '원';
    document.getElementById('resultTotal').textContent = formatNumber(total) + '원';
    document.getElementById('resultNetPay').textContent = formatNumber(netPay) + '원';

    // 두루누리 적용으로 바뀐 금액은 색을 다르게 해서 눈에 띄게 한다
    const changedIds = ['resultPension', 'resultEmployment', 'resultTotal', 'resultNetPay'];
    changedIds.forEach(id => {
        document.getElementById(id).classList.toggle('value-changed', durunuriApplied);
    });
}

// 처음부터 다시
function restart() {
    document.getElementById('salary').value = '';
    document.getElementById('birthdate').value = '';
    goToStep1();
}

// 숫자 천 단위 콤마
function formatNumber(num) {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

// 전문가용 진입 (추후 개발)
function goToExpert() {
    alert('전문가용 화면은 준비 중입니다.');
}

// 페이지 로드 시 서비스 워커 등록 (PWA)
window.addEventListener('load', () => {
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('sw.js').catch(() => {
            // 로컬 환경에서는 등록 실패해도 무시
        });
    }
});
