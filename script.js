// 2026년 보험료율
const RATES = {
    pension: 0.095,        // 국민연금 9.5%
    health: 0.0719,        // 건강보험 7.19%
    longterm: 0.1314,      // 장기요양 13.14% (건강보험료의)
    employment_worker: 0.009,   // 고용보험 근로자 0.9%
    employment_employer: 0.0115 // 고용보험 사업주 1.15%
};

// 두루누리 지원 상한액 (월급 230만원 기준, 2026년 요율)
const DURUNURI_CAPS = {
    pension: 87400,        // 국민연금 상한 (2026년 기준)
    employment_worker: 16560,   // 고용보험 근로자 상한
    employment_employer: 21160  // 고용보험 사업주 상한
};

// 전역 변수
let salary = 0;
let industryRate = 0;
let calculationType = '';
let isDurunuriApplied = false;
let isExemptionApplied = false;
let originalPension = 0;
let originalEmployment = 0;
let originalHealth = 0;
let originalLongterm = 0;

// 1단계로 이동
function goToStep1() {
    document.querySelectorAll('.step').forEach(step => step.classList.remove('active'));
    document.getElementById('step1').classList.add('active');
}

// 2단계로 이동
function goToStep2() {
    salary = parseInt(document.getElementById('salary').value);

    if (!salary || salary <= 0) {
        alert('월급여를 입력해주세요.');
        return;
    }

    // 선택된 라디오 버튼 값 확인
    const selectedType = document.querySelector('input[name="userType"]:checked').value;
    calculationType = selectedType;

    // 근로자 선택 시 바로 계산 및 결과 표시
    if (selectedType === 'worker') {
        industryRate = 0; // 근로자는 산재 없음
        calculateAndDisplay();
    } else {
        // 사업주 선택 시 2단계(사업장 종류 선택)로 이동
        document.querySelectorAll('.step').forEach(step => step.classList.remove('active'));
        document.getElementById('step2').classList.add('active');
    }
}

// 계산 및 결과 표시 (사업주가 사업장 종류 선택 후)
function calculate() {
    industryRate = parseFloat(document.getElementById('industry').value);
    calculateAndDisplay();
}

// 실제 계산 로직
function calculateAndDisplay() {
    // 상태 초기화
    isDurunuriApplied = false;
    isExemptionApplied = false;

    // 국민연금 (근로자/사업주 각 4.75%)
    // 급여를 천원 단위로 절사 후 계산, 결과는 1원 단위 버림
    const pensionSalary = Math.floor(salary / 1000) * 1000;
    const pension = Math.floor(pensionSalary * RATES.pension / 2);
    originalPension = pension;

    // 건강보험 (근로자/사업주 각 3.595%)
    const health = Math.round(salary * RATES.health / 2);
    originalHealth = health;

    // 장기요양 (건강보험료의 13.14%)
    const longterm = Math.round(health * RATES.longterm);
    originalLongterm = longterm;

    // 고용보험
    let employment;
    if (calculationType === 'worker') {
        employment = Math.round(salary * RATES.employment_worker);
    } else {
        employment = Math.round(salary * RATES.employment_employer);
    }
    originalEmployment = employment;

    // 산재보험 (사업주만)
    let industrial = 0;
    if (calculationType === 'employer') {
        industrial = Math.round(salary * (industryRate / 100));
    }

    // 합계
    const total = pension + health + longterm + employment + industrial;

    // 월 60시간 미만 경고 배너 (807,127원 미만)
    const shortHoursBanner = document.getElementById('shortHoursBanner');
    if (salary < 807127) {
        shortHoursBanner.style.display = 'block';
        // 버튼 초기화
        const exemptionBtn = document.getElementById('applyExemptionBtn');
        exemptionBtn.classList.remove('applied');
        document.getElementById('exemptionButtonText').textContent = '제외 적용 보기';
    } else {
        shortHoursBanner.style.display = 'none';
    }

    // 두루누리 배너 표시 여부 (270만원 이하)
    const durunuriBanner = document.getElementById('durunuriBanner');
    if (salary <= 2700000) {
        durunuriBanner.style.display = 'flex';
        // 버튼 초기화
        const btn = document.getElementById('applyDurunuriBtn');
        btn.classList.remove('applied');
        document.getElementById('durunuriButtonText').textContent = '반영 금액 보기';
    } else {
        durunuriBanner.style.display = 'none';
    }

    // 결과 표시
    displayResults(calculationType, pension, health, longterm, employment, industrial, total);

    // 3단계로 이동
    document.querySelectorAll('.step').forEach(step => step.classList.remove('active'));
    document.getElementById('step3').classList.add('active');
}

// 결과 표시 함수
function displayResults(type, pension, health, longterm, employment, industrial, total) {
    // 제목 설정
    const title = type === 'worker' ? '근로자 부담금' : '사업주 부담금';
    document.getElementById('resultTitle').textContent = title;

    // 월급여 표시
    document.getElementById('displaySalary').textContent = formatNumber(salary) + '원';

    // 각 항목 표시
    document.getElementById('pension').textContent = formatNumber(pension) + '원';
    document.getElementById('health').textContent = formatNumber(health) + '원';
    document.getElementById('longterm').textContent = formatNumber(longterm) + '원';
    document.getElementById('employment').textContent = formatNumber(employment) + '원';

    // 산재보험 (사업주만)
    const industrialRow = document.getElementById('industrialRow');
    if (type === 'employer') {
        document.getElementById('industrial').textContent = formatNumber(industrial) + '원';
        industrialRow.style.display = 'flex';
    } else {
        industrialRow.style.display = 'none';
    }

    // 합계
    document.getElementById('total').textContent = formatNumber(total) + '원';
}

// 숫자 포맷팅 (천 단위 콤마)
function formatNumber(num) {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

// 두루누리 지원 사이트 열기
function openDurunuriSite() {
    const durunuriUrl = 'http://insurancesupport.or.kr/durunuri/intro.php';
    window.open(durunuriUrl, '_blank');
}

// 두루누리 지원 토글
function toggleDurunuri() {
    const btn = document.getElementById('applyDurunuriBtn');
    const btnText = document.getElementById('durunuriButtonText');

    if (isDurunuriApplied) {
        // 지원 해제: 원래 금액으로 복원
        isDurunuriApplied = false;
        btn.classList.remove('applied');
        btnText.textContent = '반영 금액 보기';

        // 60시간 미만 제외가 적용된 상태인지 확인
        if (isExemptionApplied) {
            // 제외 적용 중이면 건강/연금은 0원 유지, 고용만 원래대로
            updateResultsWithDurunuri(0, originalEmployment);
            // 건강보험과 장기요양도 0원으로 업데이트
            document.getElementById('health').textContent = '0원';
            document.getElementById('longterm').textContent = '0원';
        } else {
            // 일반 상태면 모두 원래대로
            updateResultsWithDurunuri(originalPension, originalEmployment);
        }
    } else {
        // 지원 적용: 80% 지원 (단, 상한액 초과 시 상한액만 지원)
        isDurunuriApplied = true;
        btn.classList.add('applied');
        btnText.textContent = '원래 금액 보기';

        // 60시간 미만 제외가 적용된 상태라면 연금은 0원 유지
        let supportedPension;
        if (isExemptionApplied) {
            supportedPension = 0;
        } else {
            // 국민연금: 80% 지원액과 상한액 비교
            const pension80 = Math.round(originalPension * 0.8);
            if (pension80 > DURUNURI_CAPS.pension) {
                // 지원액이 상한액보다 크면 상한액만 지원
                supportedPension = originalPension - DURUNURI_CAPS.pension;
            } else {
                // 지원액이 상한액 이하면 80% 전액 지원 (20%만 부담)
                supportedPension = Math.round(originalPension * 0.2);
            }
        }

        // 고용보험: 80% 지원액과 상한액 비교
        const employmentCap = calculationType === 'worker' ? DURUNURI_CAPS.employment_worker : DURUNURI_CAPS.employment_employer;
        const employment80 = Math.round(originalEmployment * 0.8);
        let supportedEmployment;
        if (employment80 > employmentCap) {
            // 지원액이 상한액보다 크면 상한액만 지원
            supportedEmployment = originalEmployment - employmentCap;
        } else {
            // 지원액이 상한액 이하면 80% 전액 지원 (20%만 부담)
            supportedEmployment = Math.round(originalEmployment * 0.2);
        }

        updateResultsWithDurunuri(supportedPension, supportedEmployment);

        // 60시간 미만 제외 적용 중이면 건강/장기요양도 0원 유지
        if (isExemptionApplied) {
            document.getElementById('health').textContent = '0원';
            document.getElementById('longterm').textContent = '0원';
        }
    }
}

// 두루누리 적용/해제 시 결과 업데이트
function updateResultsWithDurunuri(pension, employment) {
    // 건강보험과 장기요양, 산재는 그대로
    const health = Math.round(salary * RATES.health / 2);
    const longterm = Math.round(health * RATES.longterm);

    let industrial = 0;
    if (calculationType === 'employer') {
        industrial = Math.round(salary * (industryRate / 100));
    }

    // 합계 재계산
    const total = pension + health + longterm + employment + industrial;

    // 화면 업데이트
    document.getElementById('pension').textContent = formatNumber(pension) + '원';
    document.getElementById('employment').textContent = formatNumber(employment) + '원';
    document.getElementById('total').textContent = formatNumber(total) + '원';
}

// 월 60시간 미만 가입 제외 토글
function toggleExemption() {
    const btn = document.getElementById('applyExemptionBtn');
    const btnText = document.getElementById('exemptionButtonText');

    if (isExemptionApplied) {
        // 제외 해제: 원래 금액으로 복원
        isExemptionApplied = false;
        btn.classList.remove('applied');
        btnText.textContent = '제외 적용 보기';

        // 두루누리가 적용된 상태인지 확인
        if (isDurunuriApplied) {
            // 두루누리 적용 중이면 지원 받은 금액으로 복원
            const pension80 = Math.round(originalPension * 0.8);
            let supportedPension;
            if (pension80 > DURUNURI_CAPS.pension) {
                supportedPension = originalPension - DURUNURI_CAPS.pension;
            } else {
                supportedPension = Math.round(originalPension * 0.2);
            }

            const employmentCap = calculationType === 'worker' ? DURUNURI_CAPS.employment_worker : DURUNURI_CAPS.employment_employer;
            const employment80 = Math.round(originalEmployment * 0.8);
            let supportedEmployment;
            if (employment80 > employmentCap) {
                supportedEmployment = originalEmployment - employmentCap;
            } else {
                supportedEmployment = Math.round(originalEmployment * 0.2);
            }

            updateResultsWithExemption(supportedPension, originalHealth, originalLongterm, supportedEmployment);
        } else {
            // 두루누리 미적용이면 원래 금액으로
            updateResultsWithExemption(originalPension, originalHealth, originalLongterm, originalEmployment);
        }
    } else {
        // 제외 적용: 건강보험/국민연금 0원 처리
        isExemptionApplied = true;
        btn.classList.add('applied');
        btnText.textContent = '원래 금액 보기';

        // 두루누리가 적용된 상태인지 확인
        let employment;
        if (isDurunuriApplied) {
            // 두루누리 적용 중이면 지원 받은 고용보험 금액 사용
            const employmentCap = calculationType === 'worker' ? DURUNURI_CAPS.employment_worker : DURUNURI_CAPS.employment_employer;
            const employment80 = Math.round(originalEmployment * 0.8);
            if (employment80 > employmentCap) {
                employment = originalEmployment - employmentCap;
            } else {
                employment = Math.round(originalEmployment * 0.2);
            }
        } else {
            // 두루누리 미적용이면 원래 고용보험 금액
            employment = originalEmployment;
        }

        // 건강보험과 국민연금, 장기요양을 0원으로
        updateResultsWithExemption(0, 0, 0, employment);
    }
}

// 가입 제외 적용/해제 시 결과 업데이트
function updateResultsWithExemption(pension, health, longterm, employment) {
    let industrial = 0;
    if (calculationType === 'employer') {
        industrial = Math.round(salary * (industryRate / 100));
    }

    // 합계 재계산
    const total = pension + health + longterm + employment + industrial;

    // 화면 업데이트
    document.getElementById('pension').textContent = formatNumber(pension) + '원';
    document.getElementById('health').textContent = formatNumber(health) + '원';
    document.getElementById('longterm').textContent = formatNumber(longterm) + '원';
    document.getElementById('employment').textContent = formatNumber(employment) + '원';
    document.getElementById('total').textContent = formatNumber(total) + '원';
}

// 다시 계산
function restart() {
    document.getElementById('salary').value = '';
    document.getElementById('industry').selectedIndex = 0;
    isDurunuriApplied = false;
    isExemptionApplied = false;
    goToStep1();
}

// PDF 다운로드
function downloadPDF() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    // 한글 폰트 설정 (기본 폰트 사용)
    doc.setFont('helvetica');

    // 제목
    doc.setFontSize(20);
    const title = calculationType === 'worker' ? 'Worker Contribution' : 'Employer Contribution';
    doc.text('4 Major Insurance Calculator', 105, 20, { align: 'center' });

    doc.setFontSize(16);
    doc.text(title, 105, 30, { align: 'center' });

    // 회사 정보
    doc.setFontSize(12);
    doc.text('Gukmin Labor Firm', 105, 40, { align: 'center' });

    // 월급여
    doc.setFontSize(14);
    doc.text(`Monthly Salary: ${formatNumber(salary)} KRW`, 20, 60);

    // 구분선
    doc.line(20, 65, 190, 65);

    // 항목들
    doc.setFontSize(12);
    let y = 80;

    const pension = document.getElementById('pension').textContent;
    const health = document.getElementById('health').textContent;
    const longterm = document.getElementById('longterm').textContent;
    const employment = document.getElementById('employment').textContent;
    const total = document.getElementById('total').textContent;

    doc.text(`National Pension: ${pension}`, 20, y);
    y += 10;
    doc.text(`Health Insurance: ${health}`, 20, y);
    y += 10;
    doc.text(`Long-term Care: ${longterm}`, 20, y);
    y += 10;
    doc.text(`Employment Insurance: ${employment}`, 20, y);
    y += 10;

    if (calculationType === 'employer') {
        const industrial = document.getElementById('industrial').textContent;
        doc.text(`Industrial Accident: ${industrial}`, 20, y);
        y += 10;
    }

    // 합계
    doc.line(20, y, 190, y);
    y += 10;
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(`Total: ${total}`, 20, y);

    // 푸터
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text('* Based on 2026 rates (Employment Insurance 2025)', 20, 280);
    doc.text('Provided by Gukmin Labor Firm', 105, 290, { align: 'center' });

    // 파일 저장
    const filename = `4insurance_${calculationType}_${new Date().getTime()}.pdf`;
    doc.save(filename);
}

// 페이지 로드 시
window.addEventListener('load', () => {
    // 서비스 워커 등록 (PWA)
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('sw.js').catch(() => {
            // 서비스 워커 등록 실패는 무시 (로컬에서는 작동 안 함)
        });
    }
});
