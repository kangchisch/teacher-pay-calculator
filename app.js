const educationGrades = { bachelor: 190, credit40: 245, master: 245, doctor: 330 };
const educationLimits = { bachelor: 625, credit40: 625, master: 650, doctor: 680 };
const educationLabels = { bachelor: '大學', credit40: '40 學分班', master: '碩士', doctor: '博士' };
const bachelorResearchCapGrade = 450;
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
  const currentVersion = versions.find((version) => version.status === 'current');
  if (currentVersion) versionSelect.value = currentVersion.id;
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

function researchAllowanceFor(version, row, hasCertificate, education) {
  const isBachelorWithCertificate = hasCertificate && education === 'bachelor' && row.grade > bachelorResearchCapGrade;
  const researchRow = isBachelorWithCertificate
    ? version.grades.find((item) => item.grade === bachelorResearchCapGrade)
    : row;

  return {
    amount: researchRow.researchAllowance * (hasCertificate ? 1 : 0.8),
    sourceGrade: researchRow.grade,
    capped: isBachelorWithCertificate
  };
}

function calculate() {
  updateFormState();
  const version = currentVersion();
  const hasCertificate = $('certificate').value === 'yes';
  const education = $('education').value;
  const grade = Number(gradeSelect.value);
  const row = version.grades.find((item) => item.grade === grade);
  const days = monthDays[$('month').value];
  const research = researchAllowanceFor(version, row, hasCertificate, education);
  const researchPay = research.amount;
  const total = row.basePay + researchPay + row.homeroomAllowance;
  const rawDailyPay = total / days;
  const roundedPay = Math.round(rawDailyPay);
  let researchDisplay;
  if (research.capped) {
    researchDisplay = `${number(researchPay)} 元`;
  } else if (hasCertificate) {
    researchDisplay = `${number(researchPay)} 元`;
  } else {
    researchDisplay = `${number(row.researchAllowance)} × 80% = ${number(researchPay)} 元`;
  }

  $('daily-pay').textContent = `${number(roundedPay)} 元`;
  $('version-note').textContent = `目前套用版本：${version.label}`;
  const warning = $('version-warning');
  warning.hidden = !version.isPreview;
  warning.textContent = version.isPreview ? '提醒：此為尚未收到正式公文的預估版本，僅供參考。' : '';
  const researchDetail = research.capped ? '<span class="research-restriction">受大學學歷限制</span>' : '';
  $('research-source-grade').textContent = `（採計薪級：${research.sourceGrade}）`;
  $('calculation-table-body').innerHTML = `<tr><td>${number(row.basePay)} 元</td><td>${researchDisplay}${researchDetail}</td><td>${number(row.homeroomAllowance)} 元</td><td>${number(total)} 元</td><td>${days} 天</td><td>${number(roundedPay)} 元</td></tr>`;
  const researchNote = research.capped
    ? `學歷為大學，學術研究費依規定最高採計 450 級（${number(researchPay)} 元）。`
    : '';
  $('calculation-grade').textContent = `（薪級 ${grade}）`;
  $('calculation-text').innerHTML = `薪額、學術研究費與導師費合計 ${number(total)} 元，除以 ${days} 天；四捨五入後，當日代課費為 ${number(roundedPay)} 元。${researchNote ? `<br><span class="research-note">${researchNote}</span>` : ''}`;
}

function renderNotes() {
  const notes = window.siteNotes || [];
  const list = $('notes-list');
  list.innerHTML = notes.length
    ? notes.map(({ title, content, sources = [] }, index) => {
      const sourceLinks = sources.length
        ? `<p class="note-sources">來源：${sources.map(({ label, url }) => url ? `<a href="${url}" target="_blank" rel="noopener noreferrer">${label}</a>` : `<span>${label}</span>`).join('、')}</p>`
        : '';
      return `<article class="note"><h3><span class="note-index">${index + 1}.</span>${title}</h3><p>${content.replace(/\n/g, '<br>')}</p>${sourceLinks}</article>`;
    }).join('')
    : '<p class="empty-note">尚無說明資料。</p>';
}

function renderChangelog() {
  const changes = window.siteChangelog || [];
  const list = $('changelog-list');
  list.innerHTML = changes.length
    ? changes.map(({ version, date, content }) => `<article class="note changelog-entry"><h3>${version}<span>${date}</span></h3><p>${content.replace(/\n/g, '<br>')}</p></article>`).join('')
    : '<p class="empty-note">尚無更新紀錄。</p>';
}

function renderSiteVersion() {
  const latestChange = (window.siteChangelog || [])[0] || {};
  const latestVersion = latestChange.version || '';
  $('site-version').textContent = latestVersion.replace('網站版本 ', 'v');
  $('last-updated').textContent = latestChange.date ? `最後更新：${latestChange.date}` : '';
}

function start() {
  try {
    versions = window.salaryData.versions;
    if (!versions.length) throw new Error('沒有薪資資料');
    populateVersions();
    populateGrades(false);
    calculate();
    renderNotes();
    renderChangelog();
    renderSiteVersion();
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
