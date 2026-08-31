// 2026년 보험료율 (고용보험은 2025년 요율)
const RATES = {
    pension: 0.095,             // 국민연금 9.5% (근로자·사업주 각 4.75%)
    health: 0.0719,             // 건강보험 7.19% (근로자·사업주 각 3.595%)
    longterm: 0.1314,           // 장기요양보험 — 건강보험료의 13.14%
    employmentWorker: 0.009,    // 고용보험 실업급여분 (근로자·사업주 동일 0.9%, 65세 이상은 제외)
    // 고용안정·직업능력개발사업분: 사업주만 내고, 나이와 무관하게 계속 부과됨 (150인 미만 기업 기준 0.25%)
    // 기업 규모별로 요율이 다르므로(150인 이상은 더 높음), 여기선 가장 흔한 소규모 사업장 기준 값을 씀
    employmentStability: 0.0025,
};

// 두루누리 사회보험료 지원 상한액 (2026년 기준)
const DURUNURI_CAPS = {
    pension: 87400,
    employmentWorker: 16560,
};

// 2024년 산재보험료율표 (업종별, 천분율 → rate는 /1000 값)
// 실제로는 근로복지공단이 사업 내용을 보고 업종을 판단하므로, 이 선택은 참고용 추정치임
const INDUSTRY_RATES = [
    { name: '기타의 각종사업(음식업, 마트 등)', permille: 8 },
    { name: '건설업', permille: 35 },
    { name: '전문·보건·교육·여가관련 서비스업', permille: 6 },
    { name: '도소매·음식·숙박업', permille: 8 },
    { name: '부동산업 및 임대업', permille: 7 },
    { name: '국가 및 지방자치단체의 행정', permille: 9 },
    { name: '금융 및 보험업', permille: 5 },
    { name: '시설관리 및 사업지원 서비스업', permille: 8 },
    { name: '식료품제조업', permille: 16 },
    { name: '섬유 또는 섬유제품 제조업', permille: 11 },
    { name: '목재 및 종이제품 제조업', permille: 20 },
    { name: '출판, 인쇄, 제본 또는 인쇄물가공업', permille: 9 },
    { name: '화학 및 고무제품 제조업', permille: 13 },
    { name: '의약품·화장품·연탄·석유제품 제조업', permille: 7 },
    { name: '기계기구·금속·비금속광물제품제조업', permille: 13 },
    { name: '금속제련업', permille: 10 },
    { name: '전기기계기구·정밀기구·전자제품 제조업', permille: 6 },
    { name: '선박건조 및 수리업', permille: 24 },
    { name: '수제품 및 기타제품 제조업', permille: 12 },
    { name: '철도·항공·창고·운수관련서비스업', permille: 8 },
    { name: '육상 및 수상운수업', permille: 18 },
    { name: '통신업', permille: 9 },
    { name: '전기, 가스, 증기 및 수도사업', permille: 7 },
    { name: '석탄광업 및 채석업', permille: 185 },
    { name: '석회석, 금속, 비금속광업 및 기타광업', permille: 57 },
    { name: '임업', permille: 58 },
    { name: '어업', permille: 27 },
    { name: '농업', permille: 20 },
];

// 전역 상태
let salary = 0;
let calculationType = '';
let birthDate = null;
let calc = {};           // 마지막으로 계산된 결과 (두루누리 토글 시 재사용)
let employerCalc = {};   // 사업주 경로 계산 결과
let durunuriApplied = false;
let durunuriEmployerApplied = false;

function showStep(id) {
    document.querySelectorAll('.step').forEach(step => step.classList.remove('active'));
    document.getElementById(id).classList.add('active');
}

// 1단계로 이동
function goToStep1() {
    showStep('step1');
}

// 생년월 입력 단계로 이동 (급여 입력 검증)
function goToBirthStep() {
    const value = parseInt(document.getElementById('salary').value);
    if (!value || value <= 0) {
        alert('월급여를 입력해주세요.');
        return;
    }
    salary = value;
    // "저장되지 않는다"는 안내와 실제 동작이 다르게 보이지 않도록 매번 입력창을 비운다
    document.getElementById('birthdate').value = '';
    showStep('stepBirth');
}

// 생년월 확인 후 2단계로 이동 (근로자·사업주 계산 둘 다 이 나이 정보를 그대로 씀)
function confirmBirth() {
    const raw = document.getElementById('birthdate').value.trim();
    const parsed = parseBirthdate(raw);
    if (!parsed) {
        alert('태어난 년월 6자리를 정확히 입력해주세요. (예: 199001)');
        return;
    }
    birthDate = parsed;
    resetStep2Accordion();
    showStep('step2');
}

// 2단계에서 "이전"을 누르면 생년월 단계로 (입력했던 값은 그대로 유지)
function goToBirthStepBack() {
    showStep('stepBirth');
}

// 2단계 아코디언 상태 초기화 (둘 다 접힌 상태로)
function resetStep2Accordion() {
    document.getElementById('workerExpand').classList.remove('open');
    document.getElementById('employerExpand').classList.remove('open');
    document.getElementById('workerOptionBtn').classList.remove('active');
    document.getElementById('employerOptionBtn').classList.remove('active');
}

// 선택 버튼을 누르면 그 자리에서 펼치기/접기 (선택 안 한 쪽은 그대로 남아있고,
// 펼쳐지는 쪽 아래로 공간이 생기면서 상세 내용이 나타남)
function toggleOption(type) {
    const workerExpand = document.getElementById('workerExpand');
    const employerExpand = document.getElementById('employerExpand');
    const workerBtn = document.getElementById('workerOptionBtn');
    const employerBtn = document.getElementById('employerOptionBtn');

    calculationType = type;

    if (type === 'worker') {
        if (workerExpand.classList.contains('open')) {
            // 다시 누르면 접기
            workerExpand.classList.remove('open');
            workerBtn.classList.remove('active');
            return;
        }
        workerExpand.classList.add('open');
        workerBtn.classList.add('active');
        employerExpand.classList.remove('open');
        employerBtn.classList.remove('active');

        calculateWorkerResult();
        setTimeout(() => workerBtn.scrollIntoView({ behavior: 'smooth', block: 'start' }), 200);
    } else {
        if (employerExpand.classList.contains('open')) {
            employerExpand.classList.remove('open');
            employerBtn.classList.remove('active');
            return;
        }
        employerExpand.classList.add('open');
        employerBtn.classList.add('active');
        workerExpand.classList.remove('open');
        workerBtn.classList.remove('active');

        calculateEmployerResult();
        setTimeout(() => employerBtn.scrollIntoView({ behavior: 'smooth', block: 'start' }), 200);
    }
}

// "199001" 6자리 문자열을 {year, month}로 변환 (형식이 이상하면 null)
function parseBirthdate(raw) {
    if (!/^\d{6}$/.test(raw)) return null;
    const year = parseInt(raw.slice(0, 4), 10);
    const month = parseInt(raw.slice(4, 6), 10);
    const thisYear = new Date().getFullYear();
    if (year < 1900 || year > thisYear) return null;
    if (month < 1 || month > 12) return null;
    return { year, month };
}

// {year, month}에서 개월 수를 더한(뺀) {year, month} 계산 (년 경계 자동 처리)
function addMonths(year, month, delta) {
    const totalMonths = year * 12 + (month - 1) + delta;
    return { year: Math.floor(totalMonths / 12), month: (totalMonths % 12) + 1 };
}

// {year, month} 두 값 비교: a가 b보다 이르면 -1, 같으면 0, 늦으면 1
function compareYearMonth(a, b) {
    if (a.year !== b.year) return a.year < b.year ? -1 : 1;
    if (a.month !== b.month) return a.month < b.month ? -1 : 1;
    return 0;
}

// 만 60세(국민연금)·65세(고용보험 실업급여) 도달로 인한 제외 여부 계산
// (생일이 속한 달의 다음 달부터 제외 시작 — 생일이 속한 달까지는 그대로 부과됨)
// 근로자·사업주 계산 양쪽에서 같은 생년월을 기준으로 공통으로 사용
function calculateExemptions() {
    const now = new Date();
    const currentYM = { year: now.getFullYear(), month: now.getMonth() + 1 };
    const nextYM = addMonths(currentYM.year, currentYM.month, 1);

    const pensionExemptStart = addMonths(birthDate.year + 60, birthDate.month, 1);
    const employmentExemptStart = addMonths(birthDate.year + 65, birthDate.month, 1);

    const pensionExempt = compareYearMonth(currentYM, pensionExemptStart) >= 0;
    const employmentExempt = compareYearMonth(currentYM, employmentExemptStart) >= 0;

    // 아직은 부과되지만 다음 달부터 제외되는 경우 미리 안내
    const pensionExemptNextMonth = !pensionExempt && compareYearMonth(nextYM, pensionExemptStart) >= 0;
    const employmentExemptNextMonth = !employmentExempt && compareYearMonth(nextYM, employmentExemptStart) >= 0;

    return { pensionExempt, employmentExempt, pensionExemptNextMonth, employmentExemptNextMonth };
}

// 근로자 부담금 계산 (60세 되는 달의 다음 달부터 국민연금 제외,
// 65세 되는 달의 다음 달부터 고용보험 실업급여 제외 — 생일이 속한 달까지는 그대로 부과됨)
function calculateWorkerResult() {
    const { pensionExempt, employmentExempt, pensionExemptNextMonth, employmentExemptNextMonth } = calculateExemptions();

    // 국민연금: 보수월액을 천원 단위로 절사 후 계산, 최종 금액도 일의 단위(10원 미만) 절사
    const pensionBase = Math.floor(salary / 1000) * 1000;
    const pension = pensionExempt ? 0 : Math.floor((pensionBase * RATES.pension / 2) / 10) * 10;

    // 건강보험 · 장기요양보험: 둘 다 일의 단위(10원 미만) 절사
    const health = Math.floor((salary * RATES.health / 2) / 10) * 10;
    const longterm = Math.floor((health * RATES.longterm) / 10) * 10;
    const employment = employmentExempt ? 0 : Math.floor((salary * RATES.employmentWorker) / 10) * 10;
    const total = pension + health + longterm + employment;
    const netPay = salary - total;

    calc = {
        pension, health, longterm, employment, total, netPay,
        pensionExempt, employmentExempt, pensionExemptNextMonth, employmentExemptNextMonth
    };
    durunuriApplied = false;
    renderResult();
}

// 계산 결과를 화면에 반영
function renderResult() {
    document.getElementById('resultTitle').textContent = '내 월급에서 얼마 떼나요?';
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

    // 항목 옆 요율 표시 (면제된 항목은 요율 대신 "면제"로 표시)
    document.getElementById('resultPensionRate').textContent = calc.pensionExempt ? '(면제)' : formatRate(RATES.pension / 2 * 100);
    document.getElementById('resultHealthRate').textContent = formatRate(RATES.health / 2 * 100);
    document.getElementById('resultLongtermRate').textContent = `(건강보험료 × ${roundRate(RATES.longterm * 100)}%)`;
    document.getElementById('resultEmploymentRate').textContent = calc.employmentExempt ? '(면제)' : formatRate(RATES.employmentWorker * 100);

    // 나이 관련 예외는 실제로 해당될 때만 안내
    const notices = [];
    if (calc.pensionExempt) notices.push('만 60세가 되어 국민연금은 계산에서 제외했어요.');
    if (calc.employmentExempt) notices.push('만 65세가 되어 고용보험(실업급여)도 제외했어요.');
    if (calc.pensionExemptNextMonth) notices.push('다음 달부터는 만 60세가 되어 국민연금이 제외돼요.');
    if (calc.employmentExemptNextMonth) notices.push('다음 달부터는 만 65세가 되어 고용보험(실업급여)도 제외돼요.');
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

// 산재보험료율 드롭다운에 업종 목록 채우기 (최초 1회)
function populateIndustryOptions() {
    const select = document.getElementById('industryType');
    if (!select || select.options.length > 0) return;

    const placeholder = document.createElement('option');
    placeholder.value = '';
    placeholder.textContent = '업종을 선택해주세요';
    select.appendChild(placeholder);

    INDUSTRY_RATES.forEach((industry, idx) => {
        const option = document.createElement('option');
        option.value = idx;
        option.textContent = `${industry.name} (${industry.permille}/1000)`;
        select.appendChild(option);
    });
}

// 사업주 부담금 계산 — 이 직원 때문에 발생하는 보험료 중 "사업주가 부담하는 몫"만 계산
// (근로자 몫은 화면에 안 보여줌. 산재보험은 선택한 업종 요율로 추정 계산 — 실제 공단 분류와 다를 수 있음)
function calculateEmployerResult() {
    const { pensionExempt, employmentExempt, pensionExemptNextMonth, employmentExemptNextMonth } = calculateExemptions();

    const pensionBase = Math.floor(salary / 1000) * 1000;
    const pensionEmployer = pensionExempt ? 0 : Math.floor((pensionBase * RATES.pension / 2) / 10) * 10;

    const healthWorkerHalf = Math.floor((salary * RATES.health / 2) / 10) * 10;
    const healthEmployer = healthWorkerHalf; // 건강보험은 나이 제한 없이 계속 부과됨 (근로자·사업주 절반씩 동일)

    const longtermEmployer = Math.floor((healthWorkerHalf * RATES.longterm) / 10) * 10;

    // 고용보험 사업주 몫: 실업급여분(0.9%, 65세 이상 제외)은 근로자와 동일하게 나이 영향을 받고,
    // 고용안정·직업능력개발사업분(0.25%)은 사업주 전용이라 나이와 무관하게 계속 부과됨
    const employmentEmployerRate = employmentExempt
        ? RATES.employmentStability
        : RATES.employmentWorker + RATES.employmentStability;
    const employmentEmployer = Math.floor((salary * employmentEmployerRate) / 10) * 10;

    // 산재보험 — 업종을 선택했을 때만 계산 (선택 전에는 총액에서 제외)
    const industrySelect = document.getElementById('industryType');
    const industryIdx = industrySelect.value;
    let accidentEmployer = null;
    let accidentPermille = null;
    if (industryIdx !== '') {
        const industry = INDUSTRY_RATES[parseInt(industryIdx, 10)];
        accidentEmployer = Math.floor((salary * industry.permille / 1000) / 10) * 10;
        accidentPermille = industry.permille;
    }

    const total = pensionEmployer + healthEmployer + longtermEmployer + employmentEmployer + (accidentEmployer || 0);

    employerCalc = {
        pensionEmployer, healthEmployer, longtermEmployer, employmentEmployer, accidentEmployer, total,
        pensionExempt, employmentExempt, pensionExemptNextMonth, employmentExemptNextMonth,
        employmentEmployerRate, accidentPermille
    };
    durunuriEmployerApplied = false;
    renderEmployerResult();
}

// 사업주 계산 결과를 화면에 반영
function renderEmployerResult() {
    document.getElementById('employerDisplaySalary').textContent = formatNumber(salary) + '원';
    document.getElementById('employerPension').textContent = formatNumber(employerCalc.pensionEmployer) + '원';
    document.getElementById('employerHealth').textContent = formatNumber(employerCalc.healthEmployer) + '원';
    document.getElementById('employerLongterm').textContent = formatNumber(employerCalc.longtermEmployer) + '원';
    document.getElementById('employerEmployment').textContent = formatNumber(employerCalc.employmentEmployer) + '원';
    document.getElementById('employerAccident').textContent =
        employerCalc.accidentEmployer === null ? '업종을 선택해주세요' : formatNumber(employerCalc.accidentEmployer) + '원';
    document.getElementById('employerTotal').textContent = formatNumber(employerCalc.total) + '원';

    // 항목 옆 요율 표시 (면제된 항목은 요율 대신 "면제"로 표시)
    document.getElementById('employerPensionRate').textContent = employerCalc.pensionExempt ? '(면제)' : formatRate(RATES.pension / 2 * 100);
    document.getElementById('employerHealthRate').textContent = formatRate(RATES.health / 2 * 100);
    document.getElementById('employerLongtermRate').textContent = `(건강보험료 × ${roundRate(RATES.longterm * 100)}%)`;
    document.getElementById('employerEmploymentRate').textContent = formatRate(employerCalc.employmentEmployerRate * 100);
    document.getElementById('employerAccidentRate').textContent =
        employerCalc.accidentPermille === null ? '' : formatRate(employerCalc.accidentPermille / 10);

    // 나이 관련 예외는 실제로 해당될 때만 안내
    const notices = [];
    if (employerCalc.pensionExempt) notices.push('이 직원이 만 60세가 되어 국민연금은 계산에서 제외했어요.');
    if (employerCalc.employmentExempt) notices.push('이 직원이 만 65세가 되어 고용보험 실업급여분도 제외했어요.');
    if (employerCalc.pensionExemptNextMonth) notices.push('다음 달부터는 이 직원이 만 60세가 되어 국민연금이 제외돼요.');
    if (employerCalc.employmentExemptNextMonth) notices.push('다음 달부터는 이 직원이 만 65세가 되어 고용보험 실업급여분도 제외돼요.');
    const employerAgeNotice = document.getElementById('employerAgeNotice');
    if (notices.length > 0) {
        employerAgeNotice.textContent = 'ℹ️ ' + notices.join(' ');
        employerAgeNotice.style.display = 'block';
    } else {
        employerAgeNotice.style.display = 'none';
    }

    // 두루누리 배너: 월급여 270만원 이하일 때만 표시
    const durunuriEmployerBtn = document.getElementById('durunuriEmployerToggleBtn');
    durunuriEmployerBtn.textContent = '지원받으면 얼마?';
    durunuriEmployerBtn.classList.remove('applied');
    document.getElementById('durunuriEmployerBanner').style.display = salary <= 2700000 ? 'block' : 'none';
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

// 두루누리 지원 토글 (사업주 몫 — 국민연금·고용보험 사업주 부담분도 지원 대상)
function toggleDurunuriEmployer() {
    durunuriEmployerApplied = !durunuriEmployerApplied;
    const btn = document.getElementById('durunuriEmployerToggleBtn');

    let pension = employerCalc.pensionEmployer;
    let employment = employerCalc.employmentEmployer;

    if (durunuriEmployerApplied) {
        if (!employerCalc.pensionExempt) {
            pension = durunuriSupportedAmount(employerCalc.pensionEmployer, DURUNURI_CAPS.pension);
        }
        employment = durunuriSupportedAmount(employerCalc.employmentEmployer, DURUNURI_CAPS.employmentWorker);
        btn.textContent = '원래 금액 보기';
        btn.classList.add('applied');
    } else {
        pension = employerCalc.pensionEmployer;
        employment = employerCalc.employmentEmployer;
        btn.textContent = '지원받으면 얼마?';
        btn.classList.remove('applied');
    }

    const total = pension + employerCalc.healthEmployer + employerCalc.longtermEmployer + employment + (employerCalc.accidentEmployer || 0);
    document.getElementById('employerPension').textContent = formatNumber(pension) + '원';
    document.getElementById('employerEmployment').textContent = formatNumber(employment) + '원';
    document.getElementById('employerTotal').textContent = formatNumber(total) + '원';

    // 두루누리 적용으로 바뀐 금액은 색을 다르게 해서 눈에 띄게 한다
    const changedIds = ['employerPension', 'employerEmployment', 'employerTotal'];
    changedIds.forEach(id => {
        document.getElementById(id).classList.toggle('value-changed', durunuriEmployerApplied);
    });
}

// 처음부터 다시
function restart() {
    document.getElementById('salary').value = '';
    document.getElementById('birthdate').value = '';
    document.getElementById('industryType').value = '';
    resetStep2Accordion();
    goToStep1();
}

// 숫자 천 단위 콤마
function formatNumber(num) {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

// 퍼센트 숫자를 소수점 3자리까지 깔끔하게 반올림 (0.1314*100 같은 계산에서
// 생기는 13.139999999999999 같은 부동소수점 오차를 없애기 위함)
function roundRate(percentValue) {
    return Math.round(percentValue * 1000) / 1000;
}

// 요율을 "(4.75%)" 형식 문자열로 변환
function formatRate(percentValue) {
    return `(${roundRate(percentValue)}%)`;
}

// 전문가용 진입 (추후 개발)
function goToExpert() {
    alert('전문가용 화면은 준비 중입니다.');
}

function goToMultiWorker() {
    showStep('stepMultiWorker');
}

// 산재보험 업종 드롭다운은 페이지 로드 시 한 번만 채워두면 됨
// (스크립트 태그가 body 맨 끝에 있어 이 시점엔 이미 DOM이 준비되어 있음)
populateIndustryOptions();

// 페이지 로드 시 서비스 워커 등록 (PWA)
window.addEventListener('load', () => {
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('sw.js').catch(() => {
            // 로컬 환경에서는 등록 실패해도 무시
        });
    }
});
