// 전역 상태
let salary = 0;
let calculationType = '';

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

// 딱 하나 선택 (근로자 / 사업주) → 결과 화면
function selectPath(type) {
    calculationType = type;
    showStep('step3');
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
