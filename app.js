const educationGrades = { bachelor: 190, credit40: 245, master: 245, doctor: 330 };
const educationLimits = { bachelor: 450, credit40: 500, master: 525, doctor: 550 };
const educationLabels = { bachelor: '大學', credit40: '40 學分班', master: '碩士', doctor: '博士' };
const monthDays = { '1': 31, '2-28': 28, '2-29': 29, '3': 31, '4': 30, '5': 31, '6': 30, '7': 31, '8': 31, '9': 30, '10': 31, '11': 30, '12': 31 };

const $ = (id) => document.getElementById(id);
const versionSelect = $('version');
const gradeSelect = $('grade');
let versions = [];

function number(value) {
  return new Intl.NumberFormat('zh-TW').format(value);
}

function currentVersion() {
  return versions.find((version) => version.id === versionSelect.value);
}

function populateVersions() {
  versionSelect.innerHTML = versions.map((version) => `<option value="${version.id}">${version.label}</option>`).join('');
}

function populateGrades(keepValue = true) {
  const oldValue = gradeSelect.value;
  const version = currentVersion();
  const maxGrade = educationLimits[$('education').value];
  const availableGrades = version.grades.filter(({ grade }) => grade <= maxGrade);
  gradeSelect.innerHTML = availableGrades.map(({ grade }) => {
    const annotation = grade === 190 ? '（大學）' : grade === 245 ? '（碩士）' : grade === 330 ? '（博士）' : '';
    return `<option value="${grade}">${grade}${annotation}</option>`;
  }).join('');
  if (keepValue && availableGrades.some(({ grade }) => String(grade) === oldValue)) gradeSelect.value = oldValue;
}

function updateFormState() {
  const hasCertificate = $('certificate').value === 'yes';
  const education = $('education').value;
  const fixedGrade = educationGrades[education];
  gradeSelect.disabled = !hasCertificate;
  $('grade-hint').textContent = hasCertificate
    ? `有教師證時可自行選擇薪級；${educationLabels[education]}最高可選 ${educationLimits[education]}。`
    : fixedGrade
      ? `無教師證時，薪級依學歷固定為 ${fixedGrade}（${educationLabels[education]}）。`
      : '40 學分班的無教師證固定薪級尚待設定，暫時無法試算。';
  if (!hasCertificate && fixedGrade) gradeSelect.value = fixedGrade;
}

function calculate() {
  updateFormState();
  const version = currentVersion();
  const hasCertificate = $('certificate').value === 'yes';
  const grade = Number(gradeSelect.value);
  const row = version.grades.find((item) => item.grade === grade);
  const days = monthDays[$('month').value];
  const researchPay = row.researchAllowance * (hasCertificate ? 1 : 0.8);
  const total = row.basePay + researchPay + row.homeroomAllowance;
  const rawDailyPay = total / days;
  const roundedPay = Math.round(rawDailyPay);
  const researchDisplay = hasCertificate
    ? `${number(row.researchAllowance)} 元`
    : `${number(row.researchAllowance)} × 80% = ${number(researchPay)} 元`;

  $('daily-pay').textContent = `${number(roundedPay)} 元`;
  $('version-note').textContent = `適用版本：${version.label}（${version.effectiveDate}）`;
  $('calculation-table-body').innerHTML = `<tr><td>${number(row.basePay)} 元</td><td>${researchDisplay}</td><td>${number(row.homeroomAllowance)} 元</td><td>${number(total)} 元</td><td>${days} 天</td><td>${number(roundedPay)} 元</td></tr>`;
  $('calculation-text').textContent = `薪級 ${grade}：本俸、學術研究費與導師費合計 ${number(total)} 元，除以 ${days} 天；四捨五入後，當日代課費為 ${number(roundedPay)} 元。`;
}

function renderNotes() {
  const notes = window.siteNotes || [];
  const list = $('notes-list');
  list.innerHTML = notes.length
    ? notes.map(({ title, content }) => `<article class="note"><h3>${title}</h3><p>${content.replace(/\n/g, '<br>')}</p></article>`).join('')
    : '<p class="empty-note">尚無說明資料。</p>';
}

function start() {
  try {
    versions = window.salaryData.versions;
    if (!versions.length) throw new Error('沒有薪資資料');
    populateVersions();
    populateGrades(false);
    calculate();
    renderNotes();
    $('calculator-form').addEventListener('change', (event) => {
      if (event.target === versionSelect || event.target === $('education')) populateGrades();
      $('month').classList.toggle('february-selected', $('month').value.startsWith('2-'));
      calculate();
    });
  } catch (error) {
    $('calculation-text').textContent = '薪資資料載入失敗，請確認 salary-data.js 是否存在且格式正確。';
  }
}

start();
